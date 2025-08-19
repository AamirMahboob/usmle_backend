const express = require("express");
const router = express.Router();
const { auth } = require("../middleware/auth");

const Subject = require("../models/subject");
const Question = require("../models/questions");
const System = require("../models/system");

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

router.post(
  "/by-subjects-system",
  auth,
  async (req, res) => {
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

      // Step 2: Count questions grouped by system ID
      const questionCounts = await Question.aggregate([
        {
          $match: {
            system: { $in: systems.map((s) => s._id) },
          },
        },
        {
          $group: {
            _id: "$system",
            questionCount: { $sum: 1 },
          },
        },
      ]);

      // Step 3: Convert to lookup map
      const countMap = {};
      questionCounts.forEach((q) => {
        countMap[q._id.toString()] = q.questionCount;
      });

      // Step 4: Prepare final response
      const result = systems.map((system) => ({
        _id: system._id,
        system_name: system.system_name,
        subject: system.subject?.subject || null,
        questionCount: countMap[system._id.toString()] || 0,
      }));

      res.status(200).json({ success: true, data: result });
    } catch (err) {
      console.error("Error fetching systems with question count:", err);
      res.status(500).json({ success: false, message: "Server error" });
    }
  }
);

module.exports = router;
