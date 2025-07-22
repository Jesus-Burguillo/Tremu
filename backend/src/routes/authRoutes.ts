// 1. Import the necessary modules and libraries
import express from "express"
import { prisma } from "../lib/prisma"
import bcrypt from "bcrypt"
import jwt from "jsonwebtoken"

// 2. Create the router
const router = express.Router()

// 3. Create the route
router.post('/register', async (req, res) => {
  try {
    // 1. Extract the data from the request
    const { email, password, name } = req.body

    // 2. Validate the data
    if (!email || typeof email !== 'string' || email.length < 5) {
      return res.status(400).json({
        message: 'Something is wrong with the email'
      })
    }

    if (!password || typeof password !== 'string' || password.length < 8) {
      return res.status(400).json({
        message: 'Something is wrong with the password'
      })
    }

    if (!name || typeof name !== 'string' || name.length < 2) {
      return res.status(400).json({
        message: 'Something is wrong with the name'
      })
    }

    // 3. Check if the user already exists
    const user = await prisma.user.findUnique({
      where: {
        email: email.toLowerCase()
      }
    })

    if (user) {
      return res.status(409).json({
        message: "User with this email already exists"
      })
    }

    // 4. Create the user
    const newUser = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        name,
        password: bcrypt.hashSync(password, 10) // Hash the password with bcrypt
      }
    })

    // 5. Send the response
    res.status(201).json({
      message: "User created successfully",
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name
      }
    })
  } catch (error) {
    res.status(500).json({
      message: "An error occurred during registration",
      error: error instanceof Error ? error.message : "Unknown error"
    })
  }
})

router.post('/login', async (req, res) => {
  try {
    // 1. Extract the data from the request
    const { email, password } = req.body

    // 2. Validate the data
    if (!email || typeof email !== 'string' || email.length < 5) {
      return res.status(400).json({
        message: 'Something is wrong with the email'
      })
    }

    if (!password || typeof password !== 'string' || password.length < 8) {
      return res.status(400).json({
        message: 'Something is wrong with the password'
      })
    }

    // 3. Check if the user exists and verify the password
    const user = await prisma.user.findUnique({
      where: {
        email: email.toLowerCase()
      }
    })

    if (!user || !await bcrypt.compare(password, user.password)) {
      return res.status(401).json({
        message: "Invalid email or password"
      })
    }

    // 4. Create a JWT token
    const token = jwt.sign({
      userId: user.id
    }, process.env.JWT_SECRET as string, { expiresIn: '1d' })

    // 5. Send the response
    res.status(200).json({
      message: "Login successful",
      user: {
        id: user.id,
        email: user.email,
        name: user.name
      },
      token
    })
  } catch (error) {
    res.status(500).json({
      message: "An error occurred during login",
      error: error instanceof Error ? error.message : "Unknown error"
    })
  }
})

// 4. Export the router
export default router