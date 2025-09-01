const express = require("express");
const router = express.Router();
const SubSystem = require("../models/subSystem");
const Subject = require("../models/subject"); // adjust path
const System = require("../models/system"); // adjust path

// ✅ Create SubSystem
router.post("/", async (req, res) => {
  try {
    const { name, description, system } = req.body;

    if (!name || !description || !system) {
      return res.status(400).json({
        success: false,
        message: "name, description, and system are required",
      });
    }

    // ✅ Ensure system exists
    const systemExists = await System.findById(system);
    if (!systemExists) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid system ID" });
    }

    // ✅ Automatically take subjectId from system
    const subjectId = systemExists.subject;

    if (!subjectId) {
      return res.status(400).json({
        success: false,
        message: "System does not have a subject linked",
      });
    }

    // ✅ Save new SubSystem with system + subject
    const newSubSystem = new SubSystem({
      name,
      description,
      subject: subjectId,
      system,
    });

    const saved = await newSubSystem.save();

    res.status(200).json({ success: true, data: saved });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// ✅ Get all SubSystems
router.get("/", async (req, res) => {
  try {
    const subSystems = await SubSystem.find()
      .populate("subject", "subject")
      .populate("system", "system_name");

    res
      .status(200)
      .json({ success: true, count: subSystems.length, data: subSystems });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ✅ Get SubSystem by ID
router.get("/:id", async (req, res) => {
  try {
    const subSystem = await SubSystem.findById(req.params.id)
      .populate("subject", "name")
      .populate("system", "name");

    if (!subSystem)
      return res.status(404).json({ success: false, message: "Not found" });

    res.status(200).json({ success: true, data: subSystem });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ✅ Update SubSystem by ID
router.put("/:id", async (req, res) => {
  try {
    const { name, description, systemId } = req.body;

    console.log(req.body, "req.body");
    console.log(req.params.id, "req.params.id");

    if (!name || !description || !systemId) {
      return res.status(400).json({
        success: false,
        message: "name, description, and systemId are required",
      });
    }

    // Ensure system exists
    const systemExists = await System.findById(systemId);
    if (!systemExists) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid system ID" });
    }

    const updated = await SubSystem.findByIdAndUpdate(
      req.params.id,
      { name, description, system: systemId }, // save system as reference
      { new: true, runValidators: true }
    );

    if (!updated) {
      return res
        .status(404)
        .json({ success: false, message: "Subsystem not found" });
    }

    res.status(200).json({ success: true, data: updated });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// ✅ Delete SubSystem by ID
router.delete("/:id", async (req, res) => {
  try {
    const deleted = await SubSystem.findByIdAndDelete(req.params.id);
    if (!deleted)
      return res.status(404).json({ success: false, message: "Not found" });

    res.status(200).json({ success: true, message: "Deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ✅ Get all SubSystems by System ID
router.get("/by-system/:systemId", async (req, res) => {
  try {
    const subSystems = await SubSystem.find({ system: req.params.systemId })
      .populate("system", "system_name")
      .populate("subject", "subject");

    if (!subSystems || subSystems.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No subsystems found for this system",
      });
    }

    res.status(200).json({ success: true, data: subSystems });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
