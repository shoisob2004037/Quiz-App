// userRoutes.js
import express from "express"
import { registerUser, getUserProfile, loginUser } from "../controllers/userController.js"

const router = express.Router()

router.post("/register", registerUser)
router.post("/login", loginUser)  // Add this new login route
router.get("/profile/:firebaseUID", getUserProfile)

export default router