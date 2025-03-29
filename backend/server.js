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
    // Don't exit process in production as it will terminate the serverless function
    if (process.env.NODE_ENV !== 'production') {
      process.exit(1)
    }
  }
}

// Connect to Database
connectDB()

// Middleware
app.use(cors({
  origin: '*', // Update this with your frontend URL in production
  credentials: true
}))
app.use(express.json())

// Routes
app.use("/api/users", userRoutes)
app.use("/api/quizzes", quizRoutes)

// Basic route
app.get("/", (req, res) => {
  res.send("API is running...")
})

// Only start the server in development mode
// In production (Vercel), we just export the app
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 5000
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`)
  })
}

// Handle unhandled promise rejections without closing server in production
process.on('unhandledRejection', (error) => {
  console.error('Unhandled Promise Rejection:', error)
  if (process.env.NODE_ENV !== 'production') {
    process.exit(1)
  }
})

// Export the Express app for Vercel
export default app
