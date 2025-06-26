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

// GET /api/quiz/:id — fetch quiz

router.get("/:id", async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id)
      .populate("subjects", "subject")
      .populate({
        path: "questions.question",
        select: "question subject answers questionType",
        populate: {
          path: "subject",
          model: "Subject",
          select: "subject",
        },
      });

    if (!quiz) {
      return res.status(404).json({ success: false, error: "Quiz not found" });
    }

    // ✅ Safely format questions (skip nulls)
    const formattedQuestions = quiz.questions
      .filter((q) => q.question !== null)
      .map((q) => {
        const question = q.question;

        const formatted = {
          _id: question._id,
          question: question.question,
          subject: question.subject,
          questionType: question.questionType,
          selectedAnswer: q.selectedAnswer,
          isCorrect: q.isCorrect,
        };

        if (
          question.questionType === "MCQ" &&
          Array.isArray(question.answers)
        ) {
          // ✅ Only return _id and text of each answer
          formatted.answers = question.answers.map((ans) => ({
            _id: ans._id,
            text: ans.text,
          }));
        }

        return formatted;
      });

    res.json({
      success: true,
      _id: quiz._id,
      user: quiz.user,
      subjects: quiz.subjects,
      durationMinutes: quiz.durationMinutes,
      numberOfQuestions: quiz.numberOfQuestions,
      startedAt: quiz.startedAt,
      endedAt: quiz.endedAt,
      isSubmitted: quiz.isSubmitted,
      score: quiz.score,
      questions: formattedQuestions,
    });
  } catch (error) {
    console.error("Error fetching quiz:", error);
    res.status(500).json({ success: false, error: "Failed to retrieve quiz" });
  }
});

router.post("/submit/:quizId", async (req, res) => {
  try {
    const { quizId } = req.params;
    const { answers } = req.body; // [{ questionId, selectedAnswer }]

    if (!Array.isArray(answers)) {
      return res.status(400).json({ error: "Invalid answers format" });
    }

    // Populate full question details
    const quiz = await Quiz.findById(quizId).populate("questions.question");

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
        question: q.question, // full question object
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
      result: updatedQuestions, // sending full question info here
    });
  } catch (error) {
    console.error("Error submitting quiz:", error);
    res.status(500).json({ error: "Failed to submit quiz" });
  }
});

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

module.exports = router;
