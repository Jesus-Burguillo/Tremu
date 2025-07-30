// 1. Import the necessary modules and libraries
import { Router } from "express"
import { authMidddleware } from "../middleware/authMiddleware"
import { AuthRequest } from "../middleware/authMiddleware"
import { prisma } from "../lib/prisma"

// 2. Create the router instance
const router = Router()

// 3. Create the route
/**
 * @swagger
 * /api/boards:
 *   post:
 *     summary: Create a new board
 *     tags:
 *       - Boards
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *             properties:
 *               title:
 *                 type: string
 *                 example: My Project Board
 *     responses:
 *       201:
 *         description: Board created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                 title:
 *                   type: string
 *                 owner:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                     role:
 *                       type: string
 *                 createdAt:
 *                   type: string
 *                   format: date-time
 *       400:
 *         description: Invalid title in request body
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Invalid title. It must be a string with at least 2 characters.
 *       500:
 *         description: Server error while creating the board
 */
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

/**
 * @swagger
 * /api/boards:
 *   get:
 *     summary: Obtain a list of the boards where the user is a member
 *     security:
 *       - bearerAuth: []
 *     tags:
 *       - Boards
 *     responses:
 *       200:
 *         description: List of boards where the user is a member
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       title:
 *                         type: string
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                       role:
 *                         type: string
 *                 - type: object
 *                   properties:
 *                     message:
 *                       type: string
 *                       example: You are not a member of any boards
 *       500:
 *         description: Server error
 */
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
      return res.status(200).json({
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

/**
 * @swagger
 * /api/boards/{id}:
 *   get:
 *     summary: Get a specific board by ID (if the user is a member)
 *     tags:
 *       - Boards
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID of the board
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Board found and returned successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                 title:
 *                   type: string
 *                 createdAt:
 *                   type: string
 *                   format: date-time
 *                 owner:
 *                   type: boolean
 *                 role:
 *                   type: string
 *                 members:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       name:
 *                         type: string
 *                       role:
 *                         type: string
 *       400:
 *         description: Missing or invalid board ID
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Invalid ID format, it must be a number
 *       403:
 *         description: User is not a member of the board
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: You are not a member of this board
 *       404:
 *         description: Board not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Board not found
 *       500:
 *         description: Server error while fetching the board
 */
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

    // 5. Check if the user is owner of the board
    const myMembership = board.members.find(m => m.user.id === req.user?.id)

    // 6. Map to a cleaner response
    const response = {
      id: board.id,
      title: board.title,
      createdAt: board.createdAt,
      owner: board.ownerId === req.user?.id,
      role: myMembership?.role, // 👈 The ? operator is used to check if myMembership is defined
      members: board.members.map(m => ({
        id: m.user.id,
        name: m.user.name,
        role: m.role
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

/**
 * @swagger
 * /api/boards/{id}:
 *   delete:
 *     summary: Delete a board (only if the user is the owner)
 *     tags:
 *       - Boards
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID of the board to delete
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Board deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Board deleted successfully
 *       400:
 *         description: Invalid board ID format
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Invalid ID format, it must be a number
 *       403:
 *         description: User is not the owner of the board
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: You are not the owner of this board
 *       404:
 *         description: Board not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Board not found
 *       500:
 *         description: Server error while deleting the board
 */
router.delete('/boards/:id', authMidddleware, async (req: AuthRequest, res) => {
  try {
    // 1. Parse the id to an integer
    const idInt = parseInt(req.params.id)

    if (isNaN(idInt)) {
      return res.status(400).json({
        message: "Ivalid ID format, it must be a number"
      })
    }

    // 2. Get the board
    const board = await prisma.board.findUnique({
      where: {
        id: idInt
      }
    })

    if (!board) {
      return res.status(404).json({
        message: "Board not found"
      })
    }

    // 3. Check if the user is member of the board and is the owner
    if (board.ownerId !== req.user?.id) {
      return res.status(403).json({
        message: "You are not the owner of this board"
      })
    }

    // 4. Delete relations in order
    await prisma.boardMember.deleteMany({
      where: {
        boardId: idInt
      }
    })

    // Delete tasks if needed
    const columns = await prisma.column.findMany({
      where: {
        boardId: idInt
      },
      select: {
        id: true
      }
    })

    const columnIds = columns.map(c => c.id)

    await prisma.task.deleteMany({
      where: {
        columnId: {
          in: columnIds
        }
      }
    })

    await prisma.column.deleteMany({
      where: {
        boardId: idInt
      }
    })

    // 5. Delete the board
    await prisma.board.delete({
      where: {
        id: idInt
      }
    })

    // 6. Send the response
    res.status(200).json({
      message: "Board deleted successfully"
    })
  } catch (error) {
    return res.status(500).json({
      message: "An error occurred while deleting a board",
      error: error instanceof Error ? error.message : "Unknown error"
    })
  }
})

/**
 * @swagger
 * /api/boards/{id}/invite:
 *   post:
 *     summary: Invite a user to a board (only the owner can invite)
 *     tags:
 *       - Boards
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID of the board to which the user will be invited
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: user@example.com
 *     responses:
 *       201:
 *         description: User successfully invited to the board
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: User with email user@example.com invited to the board successfully
 *       400:
 *         description: Invalid request or user is already a member
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: User is already a member of the board
 *       403:
 *         description: Only the owner can invite users
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Only the owner of the board can invite users
 *       404:
 *         description: Board or user not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: User with this email not found
 *       500:
 *         description: Server error while inviting user
 */
router.post('/boards/:id/invite', authMidddleware, async (req: AuthRequest, res) => {
  try {
    // 1. Parse the id to an integer and extract the email from the request body
    const idInt = parseInt(req.params.id)
    const { email } = req.body

    if (isNaN(idInt) || !email || typeof email !== 'string' || email.length < 5) {
      return res.status(400).json({
        message: "Invalid request: ID must be a number and email must be a valid string"
      })
    }

    // 2. Get the board
    const board = await prisma.board.findUnique({
      where: {
        id: idInt
      }
    })

    if (!board) {
      return res.status(404).json({
        message: "Board not found"
      })
    }

    // 3. Check if the user is the owner of the board
    if (board.ownerId !== req.user?.id) {
      return res.status(403).json({
        message: "Only the owner of the board can invite users"
      })
    }

    // 4. Find the user by email and check if it exists
    const userToInvite = await prisma.user.findUnique({
      where: {
        email: email.toLowerCase()
      }
    })

    if (!userToInvite) {
      return res.status(404).json({
        message: "User with this email not found"
      })
    }

    // 5. Check if the user is already a member of the board
    const isMember = await prisma.boardMember.findFirst({
      where: {
        boardId: idInt,
        userId: userToInvite.id
      }
    })

    if (isMember) {
      return res.status(400).json({
        message: "User is already a member of the board"
      })
    }

    // 6. Create the boardMember
    await prisma.boardMember.create({
      data: {
        boardId: idInt,
        userId: userToInvite.id,
        role: "member" // 👈 Default role for invited users
      }
    })

    // 7. Send the response
    res.status(201).json({
      message: `User with email ${email} invited to the board successfully`
    })
  } catch (error) {
    return res.status(500).json({
      message: "An error occurred while inviting a user to a board",
      error: error instanceof Error ? error.message : "Unknown error"
    })
  }
})
// 4. Export the router
export default router