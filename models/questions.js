const mongoose = require("mongoose");

const questionSchema = new mongoose.Schema(
  {
    subject: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subject",
      required: true,
    },
    question: {
      type: String,
      required: true,
    },
    questionType: {
      type: String,
      enum: ["MCQ", "TrueFalse", "ShortAnswer"],
      required: true,
    },
    answers: [
      {
        text: { type: String, required: true },
        isCorrect: { type: Boolean, default: false },
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Question", questionSchema);
