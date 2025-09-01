const mongoose = require("mongoose");

const questionSchema = new mongoose.Schema(
  {
    questionId: {
      type: String,
      required: true,
      unique: true, // ensures no duplicates
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
      required: false,
      default: null,
    },
    subSystem: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SubSystem", // optional reference
      required: false,
      default: null,
    },
    question: {
      type: String,
      required: true,
    },
    questionImages: [
      {
        type: String, // file path (uploads/..)
      },
    ],
    questionType: {
      type: String,
      enum: ["MCQ", "TrueFalse", "ShortAnswer"],
      required: true,
    },
    answers: [
      {
        text: { type: String, required: true },
        isCorrect: { type: Boolean, default: false },
        image: { type: String }, // optional image for answer
      },
    ],
    correctReasonDetails: {
      type: String,
      required: true,
    },
    correctReasonImage: {
      type: String, // optional image for explanation
    },

    //
    hasSubSystem: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Question", questionSchema);
