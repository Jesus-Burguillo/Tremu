// 1. Import the necessary modules and libraries
import { Router } from "express"
import { authMidddleware } from "../middleware/authMiddleware"
import { AuthRequest } from "../middleware/authMiddleware"
import { prisma } from "../lib/prisma"

// 2. Create the router instance
const router = Router()

// 3. Create the route
router.post('/boards', authMidddleware, async (req: AuthRequest, res) => {
  try {
    // 1. Chech if the title is provided
    const { title } = req.body

    if (!title || typeof title !== 'string' || title.length < 2) {
      return res.status(400).json({
        message: "Invalid title. It must be a string with at least 2 characters."
      })
    }

    // 2. Create the board (with onwerId = req.user.id)
    const newBoard = await prisma.board.create({
      data: {
        title,
        ownerId: req.user?.id! // <-- Assuming req.user is defined due to authMiddleware
      }
    })
    
    // 3. Create the BoardMember (userId = req.user.id, boardId = newBoard.id, role = "owner")
    const newBoardMember = await prisma.boardMember.create({
      data: {
        userId: req.user?.id!,
        boardId: newBoard.id,
        role: "owner"
      }
    })

    // 4. Send the board data
    res.status(201).json({
      id: newBoard.id,
      title: newBoard.title,
      owner: {
        id: req.user?.id,
        role: newBoardMember.role
      },
      createdAt: newBoard.createdAt
    })
  } catch (error) {
    return res.status(500).json({
      message: "An error occurred while creating a board",
      error: error instanceof Error ? error.message : "Unknown error"
    })
  }
})

router.get('/boards', authMidddleware, async (req: AuthRequest, res) => {
  try {
    // 1. Extract the userId from the request
    const userId = req.user?.id

    // 2. Get all boards memberships for the user
    const memberships = await prisma.boardMember.findMany({
      where: {
        userId
      },
      include: {
        board: true
      }
    })
    
    // 3. Map to a cleaner response
    const boards = memberships.map(m => ({
      id: m.board.id,
      title: m.board.title,
      createdAt: m.board.createdAt,
      role: m.role
    }))

    if (boards.length === 0) {
      res.status(200).json({
        message: "You are not a member of any boards"
      })
    }

    // 4. Send the response
    res.status(200).json(boards)
  } catch (error) {
    return res.status(500).json({
      message: "An error occurred while fetching boards",
      error: error instanceof Error ? error.message : "Unknown error"
    })
  }
})

router.get('/boards/:id', authMidddleware, async (req: AuthRequest, res) => {
  try {
    // 1. Extract the boardId from the request params
    const { id } = req.params

    if (!id) {
      return res.status(400).json({
        message: "ID is required"
      })
    }

    // 1.1 Parse the id to an integer
    const idInt = parseInt(id)

    if (isNaN(idInt)) {
      return res.status(400).json({
        message: "Invalid ID format, it must be a number"
      })
    }

    // 2. Get the board
    const board = await prisma.board.findUnique({
      where: {
        id: idInt
      },
      include: {
        members: {
          include: {
            user: true
          }
        }
      }
    })

    // 3. Check if the board exists
    if (!board) {
      return res.status(404).json({
        message: "Board not found"
      })
    }

    // 4. Check if the user is member of the board
    const isMember = board.members.some(m => m.user.id === req.user?.id)

    if (!isMember) {
      return res.status(403).json({
        message: "You are not a member of this board"
      })
    }

    // 5. Map to a cleaner response
    const response = {
      id: board.id,
      title: board.title,
      createdAt: board.createdAt,
      owner: board.ownerId === req.user?.id,
      members: board.members.map(m => ({
        id: m.user.id,
        name: m.user.name
      }))
    }

    // 6. Send the response
    res.status(200).json(response)
  } catch (error) {
    return res.status(500).json({
      message: "An error occurred while fetching a board",
      error: error instanceof Error ? error.message : "Unknown error"
    })
  }
})

// 4. Export the router
export default router