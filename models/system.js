const mongoose = require("mongoose");

const systemSchema = new mongoose.Schema(
  {
    subject: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subject",
      required: true,
    },
    system_name: {
      type: String,
      required: true,
    },
    system_description: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("System", systemSchema);
