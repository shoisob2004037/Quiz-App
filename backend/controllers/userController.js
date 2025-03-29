import User from "../models/User.js"

// Register a new user
export const loginUser = async (req, res) => {
  try {
    const { firebaseUID, email, name } = req.body

    // Check if user exists
    let user = await User.findOne({ firebaseUID })
    
    if (!user) {
      // If user doesn't exist, create a new one (first login)
      user = await User.create({
        firebaseUID,
        email,
        name,
      })
    }

    // Return user data whether newly created or existing
    res.status(200).json({
      _id: user._id,
      firebaseUID: user.firebaseUID,
      email: user.email,
      name: user.name,
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Server Error" })
  }
}

// Modify registerUser to prevent duplicate creation
export const registerUser = async (req, res) => {
  try {
    const { firebaseUID, email, name } = req.body

    const userExists = await User.findOne({ firebaseUID })
    if (userExists) {
      return res.status(400).json({ message: "User already exists" })
    }

    const user = await User.create({
      firebaseUID,
      email,
      name,
    })

    res.status(201).json({
      _id: user._id,
      firebaseUID: user.firebaseUID,
      email: user.email,
      name: user.name,
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Server Error" })
  }
}

// Get user profile
export const getUserProfile = async (req, res) => {
  try {
    const user = await User.findOne({ firebaseUID: req.params.firebaseUID })

    if (user) {
      res.json(user)
    } else {
      res.status(404).json({ message: "User not found" })
    }
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Server Error" })
  }
}

