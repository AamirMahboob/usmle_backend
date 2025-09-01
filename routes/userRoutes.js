const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");

const { auth, authorize } = require("../middleware/auth");

require("dotenv").config();

const User = require("../models/user");

router.post("/", auth, authorize("admin"), async (req, res) => {
  try {
    const { email, password } = req.body;

    const existingUser = await User.findOne({ email });

    if (existingUser)
      return res
        .status(400)
        .json({ success: false, message: "Email already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ ...req.body, password: hashedPassword });
    await newUser.save();
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

router.get("/", auth, authorize("admin"), async (req, res) => {
  try {
    const loggedInUserId = req.user.id; // assuming auth middleware sets req.user

    const users = await User.find({ _id: { $ne: loggedInUserId } }); // exclude current user

    res.status(200).json({ success: true, data: users });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// ✅ Get a single user – admin or user themselves
router.get("/:id", auth, async (req, res) => {
  console.log(req.user);
  if (req.user.role !== "admin" && req.user.id !== req.params.id) {
    return res.status(403).json({ success: false, message: "Forbidden" });
  }

  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    res.status(200).json({ success: true, data: user });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error" });
  }
});
// ✅ Update a user – admin or user themselves
router.put("/:id", auth, async (req, res) => {
  if (req.user.role !== "admin" && req.user.id !== req.params.id) {
    return res.status(403).json({ success: false, message: "Forbidden" });
  }

  try {
    const updatedUser = await User.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!updatedUser) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    res.status(200).json({ success: true, data: updatedUser });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// ✅ Delete a user – admin only
router.delete("/:id", auth, authorize("admin"), async (req, res) => {
  try {
    const deletedUser = await User.findByIdAndDelete(req.params.id);
    if (!deletedUser) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    res
      .status(200)
      .json({ success: true, message: "User deleted successfully" });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error" });
  }
});

module.exports = router;
