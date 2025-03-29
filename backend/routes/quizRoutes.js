// quizRoutes.js
import express from "express";
import {
  createQuiz,
  getUserQuizzes,
  getQuizById,
  updateQuiz,
  deleteQuiz,
  submitQuiz,
  getQuizScores,
  getUserQuizPerformance,
  getAllQuizzes // Add this
} from "../controllers/quizController.js";

const router = express.Router();

router.post("/create", createQuiz);
router.get("/user/:userId", getUserQuizzes);
router.get("/:id", getQuizById);
router.put("/update/:id", updateQuiz);
router.delete("/delete/:id", deleteQuiz);
router.post("/submit/:id", submitQuiz);
router.get("/scores/:userId/:quizId", getQuizScores);
router.get("/performance/:userId", getUserQuizPerformance);
router.get("/", getAllQuizzes); // Add this new route

export default router;