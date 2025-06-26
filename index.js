// require("dotenv").config();
// const express = require("express");
// const connectDB = require("./config/db");
// const userRoutes = require("./routes/userRoutes");
// const authRoutes = require("./routes/auth");
// const subjectRoutes = require("./routes/subjectRoutes");
// const questionRoutes = require("./routes/questionRoutes");
// const quizRoutes = require("./routes/quizRoutes");
// const swaggerUI = require("swagger-ui-express");
// const swaggerSpec = require("./docs/swagger");
// const cors = require("cors");

// const app = express();
// const PORT = process.env.PORT || 5000;

// app.use(express.json());
// app.use(
//   cors({
//     origin: "*", // Allow all origins (you can restrict it to a domain like 'http://localhost:3000')
//     methods: ["GET", "POST", "PUT", "DELETE"],
//     allowedHeaders: ["Content-Type", "Authorization"],
//   })
// );

// // Swagger route
// app.use("/api-docs", swaggerUI.serve, swaggerUI.setup(swaggerSpec));

// // Routes
// app.use("/api/users", userRoutes);
// app.use("/api/auth", authRoutes);
// app.use("/api/subjects", subjectRoutes);
// app.use("/api/questions", questionRoutes);
// app.use("/api/quiz", quizRoutes);

// // Connect DB and start server
// connectDB().then(() => {
//   app.listen(PORT, () => {
//     console.log(`🚀 Server running on port ${PORT}`);
//     // console.log(`📄 Swagger Docs: http://localhost:${PORT}/api-docs`);
//   });
// });


// api/index.js
import express from 'express';
import serverless from 'serverless-http';
import dotenv from 'dotenv';
import connectDB from '../config/db.js';
import userRoutes from '../routes/userRoutes.js';
import authRoutes from '../routes/auth.js';
import subjectRoutes from '../routes/subjectRoutes.js';
import questionRoutes from '../routes/questionRoutes.js';
import quizRoutes from '../routes/quizRoutes.js';
import swaggerUI from 'swagger-ui-express';
import swaggerSpec from '../docs/swagger.js';
import cors from 'cors';

dotenv.config();

const app = express();

app.use(express.json());
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Connect DB
await connectDB();

// Routes
app.use('/api/users', userRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/subjects', subjectRoutes);
app.use('/api/questions', questionRoutes);
app.use('/api/quiz', quizRoutes);

// Swagger docs
app.use('/api-docs', swaggerUI.serve, swaggerUI.setup(swaggerSpec));

// Export handler for Vercel
export default serverless(app);

