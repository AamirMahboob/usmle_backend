const mongoose = require("mongoose");

const subSystemSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    subject: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subject",
      required: true,
    },
    system: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "System",
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("SubSystem", subSystemSchema);
