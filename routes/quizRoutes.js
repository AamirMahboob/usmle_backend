const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const Quiz = require("../models/quiz");
const Question = require("../models/questions");
const { auth, authorize } = require("../middleware/auth");

// POST /api/quiz — create new quiz
router.post("/", auth, async (req, res) => {
  try {
    const {
      subjectIds,
      questionsPerSubject = 2,
      durationMinutes = 10,
    } = req.body;

    const userId = req.user.id; // Authenticated user ID

    if (!Array.isArray(subjectIds) || subjectIds.length === 0) {
      return res.status(400).json({ error: "Missing or invalid subjectIds" });
    }

    if (typeof questionsPerSubject !== "number" || questionsPerSubject <= 0) {
      return res.status(400).json({
        error: "questionsPerSubject must be a positive number",
      });
    }

    let allQuestions = [];

    for (const subjectId of subjectIds) {
      const subjectObjectId = new mongoose.Types.ObjectId(subjectId);

      const subjectQuestions = await Question.aggregate([
        { $match: { subject: subjectObjectId } },
        { $sample: { size: questionsPerSubject } },
      ]);

      if (subjectQuestions.length === 0) {
        return res.status(400).json({
          error: `No questions found for subject ID: ${subjectId}`,
        });
      }

      subjectQuestions.forEach((q) => {
        allQuestions.push({
          question: q._id,
          selectedAnswer: null,
          isCorrect: null,
        });
      });
    }

    const quiz = new Quiz({
      user: userId,
      subjects: subjectIds,
      questions: allQuestions,
      numberOfQuestions: allQuestions.length,
      durationMinutes,
    });

    await quiz.save();

    res.status(201).json({
      success: true,
      quiz: quiz,
    });
  } catch (error) {
    console.error("Error creating quiz:", error);
    res.status(500).json({ error: "Failed to create quiz" });
  }
});

// GET /api/quiz/:id — fetch quiz with all image fields
router.get("/:id", async (req, res) => {
  try {
    console.log("Fetching quiz with id:", req.params.id);
    const quiz = await Quiz.findById(req.params.id).populate({
      path: "questions.question",
      select:
        "question subject answers questionType system questionImages correctReasonImage correctReasonDetails questionId",
      populate: [
        {
          path: "subject",
          model: "Subject",
          select: "subject",
        },
        {
          path: "system",
          model: "System",
          select: "system_name",
        },
      ],
    });

    if (!quiz) {
      return res.status(404).json({ success: false, error: "Quiz not found" });
    }

    const formattedQuestions = quiz.questions
      .filter((q) => q.question !== null)
      .map((q) => {
        const question = q.question;

        const formatted = {
          _id: question._id,
          questionId: question.questionId,
          question: question.question, // Changed from questionText to question
          subject: question.subject
            ? {
                _id: question.subject._id,
                subject: question.subject.subject,
              }
            : null,
          system: question.system
            ? {
                _id: question.system._id,
                name: question.system.system_name || null,
              }
            : null,
          questionType: question.questionType,
          selectedAnswer: q.selectedAnswer,
          isCorrect: q.isCorrect,
          questionImages: question.questionImages || [],
          correctReasonImage: question.correctReasonImage || null,
          correctReasonDetails: question.correctReasonDetails || null,
          answers: Array.isArray(question.answers)
            ? question.answers.map((ans) => ({
                _id: ans._id,
                text: ans.text,
                image: ans.image || null,
                isCorrect: ans.isCorrect,
              }))
            : [],
        };

        return formatted;
      });
    console.log("Formatted questions:", formattedQuestions);

    res.json({
      message: "Quiz fetched successfully.",
      success: true,
      quiz: {
        quizId: quiz._id,
        user: quiz.user,
        durationMinutes: quiz.durationMinutes,
        numberOfQuestions: quiz.numberOfQuestions,
        startedAt: quiz.startedAt,
        endedAt: quiz.endedAt,
        isSubmitted: quiz.isSubmitted,
        score: quiz.score,
        questions: formattedQuestions,
      },
    });
  } catch (error) {
    console.error("Error fetching quiz:", error);
    res.status(500).json({ success: false, error: "Failed to retrieve quiz" });
  }
});

// POST /api/quiz/submit/:quizId - submit quiz
router.post("/submit/:quizId", async (req, res) => {
  try {
    const { quizId } = req.params;
    const { answers } = req.body;

    if (!Array.isArray(answers)) {
      return res.status(400).json({ error: "Invalid answers format" });
    }

    // Populate full question details with images
    const quiz = await Quiz.findById(quizId).populate({
      path: "questions.question",
      select:
        "question answers correctReasonDetails correctReasonImage questionImages",
    });

    if (!quiz) {
      return res.status(404).json({ error: "Quiz not found" });
    }

    let score = 0;

    const updatedQuestions = quiz.questions.map((q) => {
      const submitted = answers.find(
        (a) => a.questionId === q.question._id.toString()
      );

      const selectedText = submitted?.selectedAnswer?.trim();
      let isCorrect = false;

      if (
        q.question.questionType === "MCQ" ||
        q.question.questionType === "TrueFalse"
      ) {
        const correct = q.question.answers.find((a) => a.isCorrect);
        isCorrect = selectedText === correct?.text?.trim();
      } else if (q.question.questionType === "ShortAnswer") {
        const correct = q.question.answers[0]?.text?.trim()?.toLowerCase();
        isCorrect = selectedText?.toLowerCase() === correct;
      }

      if (isCorrect) score += 1;

      return {
        question: q.question,
        selectedAnswer: selectedText || null,
        isCorrect,
      };
    });

    quiz.questions = updatedQuestions.map((q) => ({
      question: q.question._id,
      selectedAnswer: q.selectedAnswer,
      isCorrect: q.isCorrect,
    }));

    quiz.endedAt = new Date();
    quiz.score = score;
    quiz.isSubmitted = true;

    await quiz.save();

    res.status(200).json({
      success: true,
      message: "Quiz submitted successfully",
      score,
      total: quiz.numberOfQuestions,
      result: updatedQuestions,
    });
  } catch (error) {
    console.error("Error submitting quiz:", error);
    res.status(500).json({ error: "Failed to submit quiz" });
  }
});

// GET /api/quiz - get all quizzes
router.get("/", auth, async (req, res) => {
  try {
    const quizzes = await Quiz.find();

    res.status(200).json({ success: true, data: quizzes });
  } catch (error) {
    console.error("Error fetching quizzes:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to retrieve quizzes" });
  }
});

// POST /api/quiz/create - create quiz with systems
router.post("/create", auth, async (req, res) => {
  try {
    const {
      systems = [],
      questionsPerSystem = 10,
      durationMinutes = 10,
    } = req.body;
    const userId = req.user.id;

    if (!Array.isArray(systems) || systems.length === 0) {
      return res
        .status(400)
        .json({ error: "Please provide at least one system ID." });
    }

    const selectedQuestions = [];
    const selectedSubjects = new Set();
    const questionDetails = [];

    for (const systemId of systems) {
      const systemObjectId = new mongoose.Types.ObjectId(systemId);

      const questions = await Question.aggregate([
        { $match: { system: systemObjectId } },
        { $sample: { size: questionsPerSystem } },
      ]);

      if (questions.length > 0) {
        questions.forEach((q) => {
          selectedQuestions.push({
            question: q._id,
            selectedAnswer: null,
            isCorrect: null,
          });
          selectedSubjects.add(q.subject.toString());

          // Include all necessary fields including images
          questionDetails.push({
            _id: q._id,
            question: q.question,
            questionImages: q.questionImages || [],
            correctReasonImage: q.correctReasonImage || null,
            correctReasonDetails: q.correctReasonDetails || null,
            answers: q.answers.map((ans) => ({
              _id: ans._id,
              text: ans.text,
              image: ans.image || null,
            })),
            system: q.system,
            subject: q.subject,
          });
        });
      }
    }

    if (selectedQuestions.length === 0) {
      return res
        .status(404)
        .json({ error: "No questions found for the selected systems." });
    }

    const quiz = await Quiz.create({
      user: userId,
      subjects: Array.from(selectedSubjects),
      questions: selectedQuestions,
      numberOfQuestions: selectedQuestions.length,
      durationMinutes,
      startedAt: new Date(),
    });

    res.status(201).json({
      message: "Quiz created successfully.",
      success: true,
      quiz: {
        quizId: quiz._id,
        numberOfQuestions: quiz.numberOfQuestions,
        durationMinutes: quiz.durationMinutes,
        questions: questionDetails,
      },
    });
  } catch (error) {
    console.error("Quiz creation error:", error);
    res.status(500).json({ error: "Server error." });
  }
});

// POST /api/quiz/:quizId/answer - submit single answer
router.post("/:quizId/answer", async (req, res) => {
  try {
    const { questionId, selectedAnswerId } = req.body;
    const quizId = req.params.quizId;

    const quiz = await Quiz.findById(quizId);
    if (!quiz) {
      return res.status(404).json({ success: false, error: "Quiz not found" });
    }

    const questionEntry = quiz.questions.find(
      (q) => q.question.toString() === questionId
    );
    if (!questionEntry) {
      return res
        .status(404)
        .json({ success: false, error: "Question not part of this quiz" });
    }

    const question = await Question.findById(questionId);
    if (!question) {
      return res
        .status(404)
        .json({ success: false, error: "Question not found" });
    }

    const correctAnswer = question.answers.find((ans) => ans.isCorrect);
    const isCorrect =
      correctAnswer && correctAnswer._id.toString() === selectedAnswerId;

    // Update all needed fields
    questionEntry.selectedAnswer = selectedAnswerId;
    questionEntry.isCorrect = isCorrect;
    questionEntry.isSubmitted = true;
    await quiz.save();

    const answers = question.answers.map((ans) => ({
      _id: ans._id,
      text: ans.text,
      isCorrect: ans.isCorrect,
      image: ans.image || null,
    }));

    res.json({
      success: true,
      message: "Answer submitted.",
      result: isCorrect ? "Correct" : "Incorrect",
      isSubmitted: true,
      correctReasonDetails: question.correctReasonDetails || null,
      correctReasonImage: question.correctReasonImage || null,
      questionImages: question.questionImages || [],
      correctAnswerId: correctAnswer ? correctAnswer._id : null,
      question: {
        questionId: question._id,
        question: question.question,
        answers: answers,
      },
    });
  } catch (error) {
    console.error("Error submitting answer:", error);
    res.status(500).json({ success: false, error: "Failed to submit answer" });
  }
});

// POST /api/quiz/:quizId/finish - finish quiz
router.post("/:quizId/finish", async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.quizId).populate({
      path: "questions.question",
      select:
        "question answers correctReasonDetails correctReasonImage questionImages",
    });

    if (!quiz) {
      return res.status(404).json({ success: false, error: "Quiz not found" });
    }

    if (quiz.isSubmitted) {
      return res.status(400).json({
        success: false,
        error: "Quiz already submitted",
      });
    }

    const totalQuestions = quiz.questions.length;
    const correctCount = quiz.questions.filter((q) => q.isCorrect).length;
    const score = correctCount;

    quiz.isSubmitted = true;
    quiz.endedAt = new Date();
    quiz.score = score;
    await quiz.save();

    const detailedResults = quiz.questions.map((q) => {
      const question = q.question;
      const correctAnswer = question.answers.find((a) => a.isCorrect);

      return {
        questionId: question._id,
        question: question.question,
        questionImages: question.questionImages || [],
        correctReasonImage: question.correctReasonImage || null,
        answers: question.answers.map((ans) => ({
          _id: ans._id,
          text: ans.text,
          isCorrect: ans.isCorrect,
          image: ans.image || null,
        })),
        selectedAnswerId: q.selectedAnswer,
        isCorrect: q.isCorrect,
        correctAnswerId: correctAnswer ? correctAnswer._id : null,
        correctReasonDetails: question.correctReasonDetails || null,
      };
    });

    res.json({
      success: true,
      message: "Quiz finished.",
      totalQuestions,
      correctAnswers: correctCount,
      wrongAnswers: totalQuestions - correctCount,
      score,
      detailedResults,
    });
  } catch (error) {
    console.error("Error finishing quiz:", error);
    res.status(500).json({ success: false, error: "Failed to finish quiz" });
  }
});

// DELETE /api/quiz/ - delete all quizzes (admin only)
router.delete("/", auth, authorize("admin"), async (req, res) => {
  try {
    const result = await Quiz.deleteMany({});

    res.status(200).json({
      success: true,
      message: `Successfully deleted ${result.deletedCount} quizzes`,
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    console.error("Error deleting all quizzes:", error);
    res.status(500).json({
      success: false,
      error: "Failed to delete all quizzes",
    });
  }
});

// DELETE /api/quiz/:id - delete quiz by ID
router.delete("/:id", auth, async (req, res) => {
  try {
    const quizId = req.params.id;
    const userId = req.user.id;

    // Find the quiz first to check ownership
    const quiz = await Quiz.findById(quizId);

    if (!quiz) {
      return res.status(404).json({
        success: false,
        error: "Quiz not found",
      });
    }

    // Check if user owns the quiz or is admin
    if (quiz.user.toString() !== userId && req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        error: "Not authorized to delete this quiz",
      });
    }

    const deletedQuiz = await Quiz.findByIdAndDelete(quizId);

    if (!deletedQuiz) {
      return res.status(404).json({
        success: false,
        error: "Quiz not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Quiz deleted successfully",
      quiz: {
        id: deletedQuiz._id,
        user: deletedQuiz.user,
        numberOfQuestions: deletedQuiz.numberOfQuestions,
      },
    });
  } catch (error) {
    console.error("Error deleting quiz:", error);

    if (error.name === "CastError") {
      return res.status(400).json({
        success: false,
        error: "Invalid quiz ID format",
      });
    }

    res.status(500).json({
      success: false,
      error: "Failed to delete quiz",
    });
  }
});

module.exports = router;
