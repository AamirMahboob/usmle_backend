// const multer = require("multer");
// const path = require("path");

// const storage = multer.diskStorage({
//   destination: (req, file, cb) => {
//     cb(null, "uploads/"); // all files go here
//   },
//   filename: (req, file, cb) => {
//     cb(null, Date.now() + "-" + file.originalname);
//   },
// });

// const fileFilter = (req, file, cb) => {
//   const allowed = /jpeg|jpg|png|gif/;
//   const ext = allowed.test(path.extname(file.originalname).toLowerCase());
//   if (ext) {
//     cb(null, true);
//   } else {
//     cb(new Error("Only images allowed"), false);
//   }
// };

// const upload = multer({ storage, fileFilter });

// module.exports = upload;


const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("cloudinary").v2;

// Configure cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Set storage to Cloudinary
const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "usmle_questions", // ✅ put all uploads inside this folder
    allowed_formats: ["jpg", "jpeg", "png", "gif"],
  },
});

// Multer middleware
const upload = multer({ storage });

module.exports = { upload, cloudinary };
