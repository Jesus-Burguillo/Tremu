// 1. Import the necessary modules and libraries
import { Router } from "express";
import { authMidddleware } from "../middleware/authMiddleware";
import { AuthRequest } from "../middleware/authMiddleware";
import { prisma } from "../lib/prisma";

// 2. Create the router instance
const router = Router()

// 3. Create the route
router.get('/me', authMidddleware, async (req: AuthRequest, res) => {
  try {
    // 1. Check if the user is authenticated
    const userId = req.user?.id

    // 2. Fecth the user data
    const user = await prisma.user.findUnique({
      where: {
        id: userId
      }
    })

    if (!user) {
      return res.status(404).json({
        message: "User not found"
      })
    }

    // 3. Send the response
    res.json({
      id: user.id,
      email: user.email,
      name: user.name
    })
  } catch (error) {
    return res.status(500).json({
      message: "An error occurred while fetching user data",
      error: error instanceof Error ? error.message : "Unknown error"
    })
  }
})

// 4. Export the router
export default router