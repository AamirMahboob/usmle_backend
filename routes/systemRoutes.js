const express = require("express");
const router = express.Router();
const System = require("../models/system");
const Subject = require("../models/subject");
const { auth, authorize } = require("../middleware/auth");

// ✅ Create new system (admin only)
router.post("/", auth, async (req, res) => {
  try {
    const { subject, system_name, system_description } = req.body;

    if (!subject || !system_name || !system_description) {
      return res.status(400).json({
        success: false,
        message:
          "All fields (subject, system_name, system_description) are required",
      });
    }

    const subjectExists = await Subject.findById(subject);
    if (!subjectExists) {
      return res.status(404).json({
        success: false,
        message: "Subject not found",
      });
    }

    const newSystem = new System({
      subject,
      system_name,
      system_description,
    });

    await newSystem.save();

    res.status(201).json({ success: true, data: newSystem });
  } catch (error) {
    console.error("Error creating system:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// ✅ Get all systems (auth required)
router.get("/", auth, async (req, res) => {
  try {
    const systems = await System.find().populate("subject");
    res.status(200).json({ success: true, data: systems });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ✅ Get system by ID (auth required)
router.get("/:id", auth, async (req, res) => {
  try {
    const system = await System.findById(req.params.id).populate("subject");
    if (!system) {
      return res.status(404).json({
        success: false,
        message: "System not found",
      });
    }
    res.status(200).json({ success: true, data: system });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ✅ Update system by ID (admin only)
router.put("/:id", auth, authorize("admin"), async (req, res) => {
  try {
    const { subject, system_name, system_description } = req.body;

    const updated = await System.findByIdAndUpdate(
      req.params.id,
      { subject, system_name, system_description },
      { new: true, runValidators: true }
    );

    if (!updated) {
      return res.status(404).json({
        success: false,
        message: "System not found",
      });
    }

    res.status(200).json({ success: true, data: updated });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// ✅ Delete system by ID (admin only)
router.delete("/:id", auth, authorize("admin"), async (req, res) => {
  try {
    const deleted = await System.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: "System not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "System deleted successfully",
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get("/by-subject/:subjectId", auth, async (req, res) => {
  try {
    const { subjectId } = req.params;

    const subject = await Subject.findById(subjectId);
    if (!subject) {
      return res
        .status(404)
        .json({ success: false, message: "Subject not found" });
    }

    const systems = await System.find({ subject: subjectId });

    res.status(200).json({
      success: true,
      data: {
        subject,
        systems,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});
module.exports = router;
