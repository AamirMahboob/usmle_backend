// const express = require("express");
// const router = express.Router();
// const Question = require("../models/questions");
// const { auth, authorize } = require("../middleware/auth");
// const upload = require("../middleware/upload");
// const fs = require("fs");
// const path = require("path");

// // CREATE QUESTION WITH IMAGES

// router.post(
//   "/",
//   auth,
//   authorize("admin"),
//   upload.fields([
//     { name: "questionImages", maxCount: 5 },
//     { name: "answerImages", maxCount: 10 },
//     { name: "correctReasonImage", maxCount: 1 },
//   ]),
//   async (req, res) => {
//     try {
//       const {
//         questionId,
//         subject,
//         system,
//         subsystem, // frontend sends subsystem
//         question,
//         questionType,
//         answers,
//         correctReasonDetails,
//       } = req.body;

//       if (
//         !questionId ||
//         !subject ||
//         !system ||
//         !question ||
//         !questionType ||
//         !answers
//       ) {
//         return res
//           .status(400)
//           .json({ success: false, message: "Missing required fields" });
//       }

//       // ✅ Check if questionId already exists
//       const existing = await Question.findOne({ questionId });
//       if (existing) {
//         return res.status(400).json({
//           success: false,
//           message: `Question ID "${questionId}" already exists`,
//         });
//       }

//       // ✅ Parse answers
//       let parsedAnswers;
//       try {
//         parsedAnswers =
//           typeof answers === "string" ? JSON.parse(answers) : answers;
//         if (!Array.isArray(parsedAnswers)) {
//           return res
//             .status(400)
//             .json({ success: false, message: "Answers must be an array" });
//         }
//       } catch (err) {
//         return res.status(400).json({
//           success: false,
//           message: "Invalid answers format, must be JSON array",
//         });
//       }

//       // ✅ Attach images to answers
//       if (req.files["answerImages"]) {
//         req.files["answerImages"].forEach((file, index) => {
//           if (parsedAnswers[index]) {
//             parsedAnswers[index].image = `/uploads/${file.filename}`;
//           }
//         });
//       }

//       // ✅ Create Question
//       const newQuestion = new Question({
//         questionId,
//         subject,
//         system,
//         subSystem: subsystem && subsystem !== "null" ? subsystem : null, // fix here // <-- null instead of undefined
//         hasSubSystem: subsystem && subsystem !== "null" ? true : false,
//         question,
//         questionType,
//         answers: parsedAnswers,
//         correctReasonDetails,
//         correctReasonImage: req.files["correctReasonImage"]
//           ? `/uploads/${req.files["correctReasonImage"][0].filename}`
//           : null,
//         questionImages: req.files["questionImages"]
//           ? req.files["questionImages"].map((f) => `/uploads/${f.filename}`)
//           : [],
//       });

//       await newQuestion.save();
//       return res.status(201).json({ success: true, data: newQuestion });
//     } catch (err) {
//       console.error("Add Question Error:", err);

//       // ✅ Handle duplicate error at DB-level
//       if (err.code === 11000 && err.keyPattern?.questionId) {
//         return res.status(400).json({
//           success: false,
//           message: `Question ID "${req.body.questionId}" already exists.`,
//         });
//       }

//       return res.status(500).json({ success: false, message: err.message });
//     }
//   }
// );

// // GET ALL QUESTIONS
// router.get("/", auth, async (req, res) => {
//   try {
//     const questions = await Question.find()
//       .populate("subject")
//       .populate("system")
//       .populate("subSystem");

//     res.status(200).json({ success: true, data: questions });
//   } catch (err) {
//     res.status(500).json({ success: false, message: err.message });
//   }
// });

// // GET SINGLE QUESTION
// router.get("/:id", auth, async (req, res) => {
//   try {
//     const question = await Question.findById(req.params.id)
//       .populate("subject")
//       .populate("system")
//       .populate("subSystem");

//     if (!question) {
//       return res
//         .status(404)
//         .json({ success: false, message: "Question not found" });
//     }

//     res.status(200).json({ success: true, data: question });
//   } catch (err) {
//     res.status(500).json({ success: false, message: err.message });
//   }
// });

// // UPDATE QUESTION

// router.put(
//   "/:id",
//   auth,
//   authorize("admin"),
//   upload.fields([
//     { name: "questionImages", maxCount: 5 },
//     { name: "answerImages", maxCount: 10 },
//     { name: "correctReasonImage", maxCount: 4 },
//   ]),
//   async (req, res) => {
//     try {
//       const {
//         questionId,
//         subject,
//         system,
//         subsystem,
//         question,
//         questionType,
//         answers,
//         correctReasonDetails,
//         existingQuestionImages, // Added this field
//         existingAnswerImages, // Added this field
//         keepCorrectReasonImage, // Added this field
//       } = req.body;

//       // ✅ Fetch existing question
//       const existingQuestion = await Question.findById(req.params.id);
//       if (!existingQuestion) {
//         return res
//           .status(404)
//           .json({ success: false, message: "Question not found" });
//       }

//       // ✅ Parse answers
//       let parsedAnswers;
//       try {
//         parsedAnswers =
//           typeof answers === "string" ? JSON.parse(answers) : answers;
//         if (!Array.isArray(parsedAnswers)) {
//           return res
//             .status(400)
//             .json({ success: false, message: "Answers must be an array" });
//         }
//       } catch (err) {
//         return res.status(400).json({
//           success: false,
//           message: "Invalid answers format, must be JSON array",
//         });
//       }

//       // ✅ Handle Answer Images (remove missing, add new)
//       let existingAnswerImagesArray = [];
//       if (existingAnswerImages) {
//         try {
//           existingAnswerImagesArray =
//             typeof existingAnswerImages === "string"
//               ? JSON.parse(existingAnswerImages)
//               : existingAnswerImages;
//         } catch (err) {
//           console.error("Error parsing existingAnswerImages:", err);
//         }
//       }

//       // Remove answer images that are no longer present
//       existingQuestion.answers.forEach((oldAns, idx) => {
//         if (oldAns.image) {
//           const imagePath = path.basename(oldAns.image);
//           const isImageStillExists = existingAnswerImagesArray.some(
//             (img) => path.basename(img) === imagePath
//           );

//           if (!isImageStillExists) {
//             // Image was removed → delete file
//             const oldPath = path.join(__dirname, "../uploads", imagePath);
//             if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
//           }
//         }
//       });

//       // Attach new uploaded answer images
//       if (req.files["answerImages"]) {
//         req.files["answerImages"].forEach((file, index) => {
//           if (parsedAnswers[index]) {
//             parsedAnswers[index].image = `/uploads/${file.filename}`;
//           }
//         });
//       }

//       // ✅ Handle Question Images
//       let questionImages = [];
//       if (existingQuestionImages) {
//         try {
//           questionImages =
//             typeof existingQuestionImages === "string"
//               ? JSON.parse(existingQuestionImages)
//               : existingQuestionImages;
//         } catch (err) {
//           console.error("Error parsing existingQuestionImages:", err);
//         }
//       }

//       // Remove question images that are no longer in the kept list
//       existingQuestion.questionImages.forEach((img) => {
//         if (!questionImages.includes(img)) {
//           const oldPath = path.join(
//             __dirname,
//             "../uploads",
//             path.basename(img)
//           );
//           if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
//         }
//       });

//       // Add new uploaded question images
//       if (req.files["questionImages"]) {
//         const newImgs = req.files["questionImages"].map(
//           (f) => `/uploads/${f.filename}`
//         );
//         questionImages = [...questionImages, ...newImgs];
//       }

//       // ✅ Handle Correct Reason Image
//       let correctReasonImage = existingQuestion.correctReasonImage;

//       if (keepCorrectReasonImage === "false" && correctReasonImage) {
//         // Frontend tells to remove it
//         const oldPath = path.join(
//           __dirname,
//           "../uploads",
//           path.basename(correctReasonImage)
//         );
//         if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
//         correctReasonImage = null;
//       }

//       if (req.files["correctReasonImage"]) {
//         // New one uploaded → replace old
//         if (correctReasonImage) {
//           const oldPath = path.join(
//             __dirname,
//             "../uploads",
//             path.basename(correctReasonImage)
//           );
//           if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
//         }
//         correctReasonImage = `/uploads/${req.files["correctReasonImage"][0].filename}`;
//       }

//       // ✅ Update fields
//       existingQuestion.questionId = questionId || existingQuestion.questionId;
//       existingQuestion.subject = subject || existingQuestion.subject;
//       existingQuestion.system = system || existingQuestion.system;
//       existingQuestion.subSystem =
//         subsystem && subsystem !== "null" ? subsystem : null;
//       existingQuestion.question = question || existingQuestion.question;
//       existingQuestion.questionType =
//         questionType || existingQuestion.questionType;
//       existingQuestion.answers = parsedAnswers;
//       existingQuestion.correctReasonDetails =
//         correctReasonDetails || existingQuestion.correctReasonDetails;
//       existingQuestion.correctReasonImage = correctReasonImage;
//       existingQuestion.questionImages = questionImages;

//       await existingQuestion.save();

//       res.status(200).json({ success: true, data: existingQuestion });
//     } catch (err) {
//       console.error("Update Question Error:", err);
//       res.status(500).json({ success: false, message: err.message });
//     }
//   }
// );

// // DELETE QUESTION

// router.delete("/:id", auth, authorize("admin"), async (req, res) => {
//   try {
//     const question = await Question.findById(req.params.id);

//     if (!question) {
//       return res
//         .status(404)
//         .json({ success: false, message: "Question not found" });
//     }

//     // Collect all file paths
//     const allFiles = [
//       ...(question.questionImages || []),
//       ...(question.answerImages || []),
//       question.correctReasonImage || null,
//     ].filter(Boolean);

//     // Delete each file
//     allFiles.forEach((filePath) => {
//       // remove leading "/uploads/"
//       const cleanedPath = filePath.replace(/^\/?uploads[\\/]/, "");
//       const fullPath = path.join(__dirname, "..", "uploads", cleanedPath);

//       fs.unlink(fullPath, (err) => {
//         if (err) {
//           console.error(`Failed to delete file: ${fullPath}`, err.message);
//         }
//       });
//     });

//     // Delete question from DB
//     await Question.findByIdAndDelete(req.params.id);

//     res.status(200).json({
//       success: true,
//       message: "Question and images deleted successfully",
//     });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ success: false, message: err.message });
//   }
// });

// module.exports = router;

const express = require("express");
const router = express.Router();
const Question = require("../models/questions");
const { auth, authorize } = require("../middleware/auth");
const { upload, cloudinary } = require("../middleware/upload");


// ===============================
// CREATE QUESTION WITH IMAGES
// ===============================
router.post(
  "/",
  auth,
  authorize("admin"),
  upload.fields([
    { name: "questionImages", maxCount: 5 },
    { name: "answerImages", maxCount: 10 },
    { name: "correctReasonImage", maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      const {
        questionId,
        subject,
        system,
        subsystem,
        question,
        questionType,
        answers,
        correctReasonDetails,
      } = req.body;

      if (
        !questionId ||
        !subject ||
        !system ||
        !question ||
        !questionType ||
        !answers
      ) {
        return res
          .status(400)
          .json({ success: false, message: "Missing required fields" });
      }

      // Check duplicate ID
      const existing = await Question.findOne({ questionId });
      if (existing) {
        return res.status(400).json({
          success: false,
          message: `Question ID "${questionId}" already exists`,
        });
      }

      // Parse answers
      let parsedAnswers =
        typeof answers === "string" ? JSON.parse(answers) : answers;

      // Attach uploaded images to answers
      if (req.files["answerImages"]) {
        req.files["answerImages"].forEach((file, index) => {
          if (parsedAnswers[index]) {
            parsedAnswers[index].image = {
              url: file.path,
              public_id: file.filename,
            };
          }
        });
      }

      // Create question
      const newQuestion = new Question({
        questionId,
        subject,
        system,
        subSystem: subsystem && subsystem !== "null" ? subsystem : null,
        hasSubSystem: subsystem && subsystem !== "null",
        question,
        questionType,
        answers: parsedAnswers,
        correctReasonDetails,
        correctReasonImage: req.files["correctReasonImage"]
          ? {
              url: req.files["correctReasonImage"][0].path,
              public_id: req.files["correctReasonImage"][0].filename,
            }
          : null,
        questionImages: req.files["questionImages"]
          ? req.files["questionImages"].map((f) => ({
              url: f.path,
              public_id: f.filename,
            }))
          : [],
      });

      await newQuestion.save();
      return res.status(201).json({ success: true, data: newQuestion });
    } catch (err) {
      console.error("Add Question Error:", err);
      res.status(500).json({ success: false, message: err.message });
    }
  }
);


// ===============================
// GET ALL QUESTIONS
// ===============================
router.get("/", auth, async (req, res) => {
  try {
    const questions = await Question.find()
      .populate("subject")
      .populate("system")
      .populate("subSystem");

    res.status(200).json({ success: true, data: questions });
  } catch (err) {
    console.error("Get All Questions Error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});


// ===============================
// GET SINGLE QUESTION BY ID
// ===============================
router.get("/:id", auth, async (req, res) => {
  try {
    const question = await Question.findById(req.params.id)
      .populate("subject")
      .populate("system")
      .populate("subSystem");

    if (!question) {
      return res
        .status(404)
        .json({ success: false, message: "Question not found" });
    }

    res.status(200).json({ success: true, data: question });
  } catch (err) {
    console.error("Get Question By ID Error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});


// ===============================
// UPDATE QUESTION
// ===============================
router.put(
  "/:id",
  auth,
  authorize("admin"),
  upload.fields([
    { name: "questionImages", maxCount: 5 },
    { name: "answerImages", maxCount: 10 },
    { name: "correctReasonImage", maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      const existingQuestion = await Question.findById(req.params.id);
      if (!existingQuestion) {
        return res
          .status(404)
          .json({ success: false, message: "Question not found" });
      }

      const {
        questionId,
        subject,
        system,
        subsystem,
        question,
        questionType,
        answers,
        correctReasonDetails,
        existingQuestionImages,
        keepCorrectReasonImage,
      } = req.body;

      // Parse answers
      let parsedAnswers =
        typeof answers === "string" ? JSON.parse(answers) : answers;

      // Attach new uploaded answer images
      if (req.files["answerImages"]) {
        req.files["answerImages"].forEach((file, index) => {
          if (parsedAnswers[index]) {
            parsedAnswers[index].image = {
              url: file.path,
              public_id: file.filename,
            };
          }
        });
      }

      // Handle Question Images
      let questionImages = [];
      if (existingQuestionImages) {
        questionImages =
          typeof existingQuestionImages === "string"
            ? JSON.parse(existingQuestionImages)
            : existingQuestionImages;
      }
      if (req.files["questionImages"]) {
        questionImages = [
          ...questionImages,
          ...req.files["questionImages"].map((f) => ({
            url: f.path,
            public_id: f.filename,
          })),
        ];
      }

      // Handle Correct Reason Image
      let correctReasonImage = existingQuestion.correctReasonImage;
      if (keepCorrectReasonImage === "false") {
        correctReasonImage = null;
      }
      if (req.files["correctReasonImage"]) {
        correctReasonImage = {
          url: req.files["correctReasonImage"][0].path,
          public_id: req.files["correctReasonImage"][0].filename,
        };
      }

      // Update fields
      existingQuestion.questionId = questionId || existingQuestion.questionId;
      existingQuestion.subject = subject || existingQuestion.subject;
      existingQuestion.system = system || existingQuestion.system;
      existingQuestion.subSystem =
        subsystem && subsystem !== "null" ? subsystem : null;
      existingQuestion.question = question || existingQuestion.question;
      existingQuestion.questionType =
        questionType || existingQuestion.questionType;
      existingQuestion.answers = parsedAnswers;
      existingQuestion.correctReasonDetails =
        correctReasonDetails || existingQuestion.correctReasonDetails;
      existingQuestion.correctReasonImage = correctReasonImage;
      existingQuestion.questionImages = questionImages;

      await existingQuestion.save();
      res.status(200).json({ success: true, data: existingQuestion });
    } catch (err) {
      console.error("Update Question Error:", err);
      res.status(500).json({ success: false, message: err.message });
    }
  }
);


// ===============================
// DELETE QUESTION
// ===============================
router.delete("/:id", auth, authorize("admin"), async (req, res) => {
  try {
    const question = await Question.findById(req.params.id);
    if (!question) {
      return res
        .status(404)
        .json({ success: false, message: "Question not found" });
    }

    // ✅ Destroy files from Cloudinary using stored public_id
    for (const img of question.questionImages) {
      if (img?.public_id) await cloudinary.uploader.destroy(img.public_id);
    }

    for (const ans of question.answers) {
      if (ans?.image?.public_id)
        await cloudinary.uploader.destroy(ans.image.public_id);
    }

    if (question.correctReasonImage?.public_id) {
      await cloudinary.uploader.destroy(question.correctReasonImage.public_id);
    }

    await Question.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: "Question and images deleted successfully",
    });
  } catch (err) {
    console.error("Delete Question Error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});


module.exports = router;
