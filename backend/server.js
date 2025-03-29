import express from 'express'
import cors from 'cors'
import mongoose from 'mongoose'
import userRoutes from './routes/userRoutes.js'
import quizRoutes from './routes/quizRoutes.js'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

// Create Express App
const app = express()

// Database Connection Function
const connectDB = async () => {
  try {
    // Ensure MONGODB_URI is defined
    if (!process.env.MONGO_URI) {
      throw new Error("MONGODB_URI is not defined in environment variables")
    }

    const conn = await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      authSource: "admin",
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    })

    console.log('MongoDB Connected.')
  } catch (error) {
    console.error("MongoDB Connection Error:")
    console.error(`Error: ${error.message}`)
    process.exit(1)
  }
}

// Connect to Database
connectDB()

// Middleware
app.use(cors())
app.use(express.json())

// Routes
app.use("/api/users", userRoutes)
app.use("/api/quizzes", quizRoutes)

// Basic route
app.get("/", (req, res) => {
  res.send("API is running...")
})

// Server Configuration
const PORT = process.env.PORT || 5000

// Start Server
const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})

// Optional: Handle unhandled promise rejections
process.on('unhandledRejection', (error) => {
  console.error('Unhandled Promise Rejection:', error)
  server.close(() => process.exit(1))
})

export default app