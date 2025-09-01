const express = require("express");
const router = express.Router();
const { auth } = require("../middleware/auth");

const Subject = require("../models/subject");
const Question = require("../models/questions");
const System = require("../models/system");
const SubSystem = require("../models/subSystem");

router.get("/fromSubject", auth, async (req, res) => {
  try {
    const subjects = await Subject.find();
    console.log(subjects);

    const counts = await Question.aggregate([
      {
        $group: {
          _id: "$subject",
          questionCount: { $sum: 1 },
        },
      },
    ]);

    const countMap = {};
    counts.forEach((item) => {
      countMap[item._id.toString()] = item.questionCount;
    });

    const result = subjects.map((subject) => ({
      _id: subject._id,
      subject: subject.subject,
      questionCount: countMap[subject._id.toString()] || 0,
    }));

    res.status(200).json({ success: true, data: result });
  } catch (err) {
    console.error("Error fetching subject question count:", err.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

router.get("/fromSystem", auth, async (req, res) => {
  try {
    const systems = await System.find().populate("subject", "subject");

    const counts = await Question.aggregate([
      {
        $group: {
          _id: "$system",
          questionCount: { $sum: 1 },
        },
      },
    ]);

    const countMap = {};
    counts.forEach((item) => {
      countMap[item._id.toString()] = item.questionCount;
    });

    const result = systems.map((system) => ({
      _id: system._id,
      system_name: system.system_name,
      subject: system.subject?.subject || null,
      questionCount: countMap[system._id.toString()] || 0,
    }));

    res.status(200).json({ success: true, data: result });
  } catch (err) {
    console.error("Error fetching system question count:", err.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
});
router.post("/by-subjects-system", auth, async (req, res) => {
  try {
    const { subjectIds } = req.body;

    if (!Array.isArray(subjectIds) || subjectIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "subjectIds must be a non-empty array",
      });
    }

    // Step 1: Get systems under provided subjects
    const systems = await System.find({
      subject: { $in: subjectIds },
    }).populate("subject", "subject");

    // Find questions that belong to these systems and have hasSubSystem = false
    const questions = await Question.find({
      system: { $in: systems.map((s) => s._id) },
      hasSubSystem: false,
    })
      .populate("system")
      .populate("subject");

    // Group questions by system and count
    const questionsBySystem = {};
    questions.forEach((question) => {
      const systemId = question.system._id.toString();
      if (!questionsBySystem[systemId]) {
        questionsBySystem[systemId] = {
          count: 0,
          questions: [],
        };
      }
      questionsBySystem[systemId].count++;
      questionsBySystem[systemId].questions.push({
        _id: question._id,
        questionId: question.questionId,
        question: question.question,
        subject: question.subject?.subject || null,
      });
    });

    // Prepare response with counts and questions
    const result = systems.map((system) => ({
      _id: system._id,
      system_name: system.system_name,
      subject: system.subject?.subject || null,
      questionCount: questionsBySystem[system._id.toString()]?.count || 0,
      questions: questionsBySystem[system._id.toString()]?.questions || [],
    }));

    console.log(result, ":result");

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (err) {
    console.error("Error fetching systems with question count:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

router.post("/by-systems-subsystem", auth, async (req, res) => {
  try {
    const { systemIds } = req.body;

    if (!Array.isArray(systemIds) || systemIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "systemIds must be a non-empty array",
      });
    }

    // Step 1: Get subsystems under provided systems
    const subsystems = await SubSystem.find({
      system: { $in: systemIds },
    })
      .populate("system", "system_name") // so you know which system parent it belongs to
      .populate("subject", "subject");

    if (!subsystems || subsystems.length === 0) {
      return res.status(200).json({ success: true, data: [] });
    }

    // Step 2: Find questions that belong to these subsystems (hasSubSystem = true)
    const questions = await Question.find({
      subSystem: { $in: subsystems.map((s) => s._id) },
      hasSubSystem: true,
    })
      .populate("system", "system_name")
      .populate("subSystem", "system_name")
      .populate("subject", "subject");

    // Step 3: Group questions by subSystem
    const questionsBySubSystem = {};
    questions.forEach((question) => {
      const subSystemId = question.subSystem._id.toString();
      if (!questionsBySubSystem[subSystemId]) {
        questionsBySubSystem[subSystemId] = {
          count: 0,
          questions: [],
        };
      }
      questionsBySubSystem[subSystemId].count++;
      questionsBySubSystem[subSystemId].questions.push({
        _id: question._id,
        questionId: question.questionId,
        question: question.question,
        subject: question.subject?.subject || null,
      });
    });

    // Step 4: Prepare response
    const result = subsystems.map((subSystem) => ({
      _id: subSystem._id,
      subSystem_name: subSystem.name,
      parentSystem: subSystem.system?.system_name || null,
      subject: subSystem.subject?.subject || null,
      questionCount: questionsBySubSystem[subSystem._id.toString()]?.count || 0,
      questions:
        questionsBySubSystem[subSystem._id.toString()]?.questions || [],
    }));

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (err) {
    console.error("Error fetching subsystems with question count:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

module.exports = router;
