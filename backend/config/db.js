import mongoose from "mongoose"

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000,
      retryWrites: true,
      w: "majority",
    })

    console.log(`MongoDB Connected: ${conn.connection.host}`)
  } catch (error) {
    console.error(`MongoDB Connection Error: ${error.message}`)

    if (error.name === "MongoServerSelectionError") {
      console.error("Could not connect to any MongoDB servers. Please check:")
      console.error("1. Your network connection")
      console.error("2. MongoDB Atlas whitelist settings")
      console.error("3. Your username and password in the connection string")
    }

    process.exit(1)
  }
}

export default connectDB

