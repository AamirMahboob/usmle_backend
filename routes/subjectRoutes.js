const express = require("express");
const router = express.Router();
const Subject = require("../models/subject");
const { auth, authorize } = require("../middleware/auth");

router.post("/", auth, authorize("admin"), async (req, res) => {
  try {
    const { subject } = req.body;

    if (!subject) {
      return res
        .status(400)
        .json({ success: false, message: "Subject name is required" });
    }

    // Check if subject already exists (case-insensitive)
    const existing = await Subject.findOne({
      subject: { $regex: new RegExp(`^${subject}$`, "i") },
    });
    if (existing) {
      return res
        .status(201)
        .json({ success: false, message: "Subject already exists" });
    }

    const newSubject = new Subject({ subject });
    await newSubject.save();

    res.status(201).json({ success: true, data: newSubject });
  } catch (error) {
    console.error("Error creating subject:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// ✅ Get all subjects (admin or any logged-in user)
router.get("/", auth, async (req, res) => {
  try {
    const subjects = await Subject.find();
    res.status(200).json({ success: true, data: subjects });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ✅ Get subject by ID (admin or any logged-in user)
router.get("/:id", auth, async (req, res) => {
  try {
    const subject = await Subject.findById(req.params.id);
    if (!subject) {
      return res
        .status(404)
        .json({ success: false, message: "Subject not found" });
    }
    res.status(200).json({ success: true, data: subject });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ✅ Update subject (only admin)
router.put("/:id", auth, authorize("admin"), async (req, res) => {
  try {
    const { subject } = req.body;
    const updated = await Subject.findByIdAndUpdate(
      req.params.id,
      { subject },
      { new: true, runValidators: true }
    );
    if (!updated) {
      return res
        .status(404)
        .json({ success: false, message: "Subject not found" });
    }
    res.status(200).json({ success: true, data: updated });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// ✅ Delete subject (only admin)
router.delete("/:id", auth, authorize("admin"), async (req, res) => {
  try {
    const deleted = await Subject.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res
        .status(404)
        .json({ success: false, message: "Subject not found" });
    }
    res
      .status(200)
      .json({ success: true, message: "Subject deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
