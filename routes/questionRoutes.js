const express = require("express");
const router = express.Router();
const Question = require("../models/questions");
const Subject = require("../models/subject");
const { auth, authorize } = require("../middleware/auth");

// ✅ Create a question (Admin only)
router.post("/", auth, authorize("admin"), async (req, res) => {
  try {
    const { subject, question, questionType, answers } = req.body;

    if (!subject || !question || !questionType || !answers) {
      return res
        .status(400)
        .json({ success: false, message: "All fields are required." });
    }

    // Validate subject exists
    const existingSubject = await Subject.findById(subject);
    if (!existingSubject) {
      return res
        .status(404)
        .json({ success: false, message: "Subject not found." });
    }

    const newQuestion = new Question({
      subject,
      question,
      questionType,
      answers,
    });

    await newQuestion.save();

    res.status(201).json({ success: true, data: newQuestion });
  } catch (err) {
    console.error("Error creating question:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ✅ Get all questions (Any authenticated user)
router.get("/", auth, async (req, res) => {
  try {
    const rawQuestions = await Question.find().populate("subject");
    console.log(rawQuestions);

    res.status(200).json({ success: true, data: rawQuestions });
  } catch (err) {
    console.error("Error fetching questions:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// ✅ Get single question by ID (Any authenticated user)
router.get("/:id", auth, async (req, res) => {
  try {
    const question = await Question.findById(req.params.id).populate("subject");

    if (!question) {
      return res.status(404).json({ success: false, message: "Not found" });
    }

    const formattedQuestion = {
      question: question.question,
      questionType: question.questionType,
      subject: question.subject?.subject || "Unknown", // Optional
      answers: question.answers.map((a) => ({ text: a.text })),
    };

    res.status(200).json({ success: true, data: formattedQuestion });
  } catch (err) {
    console.error("Error fetching question by ID:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// ✅ Update a question (Admin only)
router.put("/:id", auth, authorize("admin"), async (req, res) => {
  try {
    const updatedQuestion = await Question.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate("subject");

    if (!updatedQuestion) {
      return res.status(404).json({ success: false, message: "Not found" });
    }

    const formattedQuestion = {
      question: updatedQuestion.question,
      questionType: updatedQuestion.questionType,
      subject: updatedQuestion.subject?.subject || "Unknown",
      answers: updatedQuestion.answers.map((a) => ({ text: a.text })),
    };

    res.status(200).json({ success: true, data: formattedQuestion });
  } catch (err) {
    console.error("Error updating question:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// ✅ Delete a question (Admin only)
router.delete("/:id", auth, authorize("admin"), async (req, res) => {
  try {
    const deleted = await Question.findByIdAndDelete(req.params.id);
    if (!deleted)
      return res.status(404).json({ success: false, message: "Not found" });
    res.status(200).json({ success: true, message: "Deleted successfully" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post("/by-subjects", auth, async (req, res) => {
  try {
    const { subjectIds } = req.body;

    if (!Array.isArray(subjectIds) || subjectIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "subjectIds must be a non-empty array",
      });
    }

    // Optional: Validate if all subject IDs exist
    const validSubjects = await Subject.find({ _id: { $in: subjectIds } });
    if (validSubjects.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "No subjects found" });
    }

    // Get questions and manually format the result
    const rawQuestions = await Question.find({
      subject: { $in: subjectIds },
    }).populate("subject");

    // Only include question, questionType, and answer texts
    const questions = rawQuestions.map((q) => ({
      _id: q._id,
      question: q.question,
      questionType: q.questionType,
      // answers: q.answers,
    }));

    res.status(200).json({ success: true, data: questions });
  } catch (err) {
    console.error("Error fetching questions by subject IDs:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

module.exports = router;
