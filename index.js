require("dotenv").config();
const express = require("express");
const connectDB = require("./config/db");
const userRoutes = require("./routes/userRoutes");
const authRoutes = require("./routes/auth");
const subjectRoutes = require("./routes/subjectRoutes");
const questionRoutes = require("./routes/questionRoutes");
const quizRoutes = require("./routes/quizRoutes");
const systemRoutes = require("./routes/systemRoutes");
const countQuestionsRoutes = require("./routes/countQuestionsRoutes");
const subSystemRoutes = require("./routes/subSystemRoutes");

const cors = require("cors");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(express.json());
app.use(
  cors({
    origin: "*", // Allow all origins (you can restrict it to a domain like 'http://localhost:3000')
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Routes
// after middlewares
// app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.use("/api/users", userRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/subjects", subjectRoutes);
app.use("/api/questions", questionRoutes);
app.use("/api/quiz", quizRoutes);
app.use("/api/system", systemRoutes);
app.use("/api/countQuestions", countQuestionsRoutes);
app.use("/api/subSystem", subSystemRoutes);

// Connect DB and start server
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
  });
});
