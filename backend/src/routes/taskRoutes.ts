import { Router } from "express"
import { authMidddleware } from "../middleware/authMiddleware"
import { AuthRequest } from "../middleware/authMiddleware"
import { prisma } from "../lib/prisma"

const router = Router()

router.post('/columns/:id/tasks', authMidddleware, async (req: AuthRequest, res) => {
  try {
    const idInt = parseInt(req.params.id)
    const { title, description } = req.body

    if (isNaN(idInt) || !title || typeof title !== 'string' || title.length < 2) {
      return res.status(400).json({
        message: "Invalid request: ID must be a number and title must be a valid string"
      })
    }

    const column = await prisma.column.findUnique({
      where: {
        id: idInt
      }
    })

    if (!column) {
      return res.status(404).json({
        message: "Column not found"
      })
    }

    const board = await prisma.board.findUnique({
      where: {
        id: column.boardId
      },
      include: {
        members: {
          where: {
            userId: req.user?.id
          }
        }
      }
    })

    if (!board?.members.length) {
      return res.status(403).json({
        message: "You must be a member of the board to create a task"
      })
    }

    const allTasks = await prisma.task.findMany({
      where: {
        columnId: idInt
      }
    })

    const newTask = await prisma.task.create({
      data: {
        title,
        description: description ?? null,
        order: allTasks.length,
        columnId: idInt
      }
    })

    res.status(201).json({
      message: "Task created successfully",
      data: {
        id: newTask.id,
        title: newTask.title,
        description: newTask.description ?? null,
        order: newTask.order
      }
    })
  } catch (error) {
    return res.status(500).json({
      message: "An error occurred while creating a task",
      error: error instanceof Error ? error.message : "Unknown error"
    })
  }
})

router.patch('/tasks/:id/assign', authMidddleware, async (req: AuthRequest, res) => {
  try {
    const taskId = parseInt(req.params.id)
    const userId = parseInt(req.body.userId)

    if (isNaN(taskId)) {
      return res.status(400).json({
        message: "Invalid request: ID must be a number"
      })
    }

    if (isNaN(userId)) {
      return res.status(400).json({
        message: "Invalid request: userId must be a number"
      })
    }

    const task = await prisma.task.findUnique({
      where: {
        id: taskId
      },
      include: {
        column: {
          select: {
            boardId: true
          }
        }
      }
    })

    if (!task) {
      return res.status(404).json({
        message: "Task not found"
      })
    }

    const boardId = task.column.boardId

    const board = await prisma.board.findUnique({
      where: {
        id: boardId
      },
      include: {
        members: true
      }
    })

    if (!board) {
      return res.status(404).json({
        message: "Board not found"
      })
    }

    const isRequesterMember = board?.members.some(m => m.userId === req.user?.id)
    const isAssigneeMember = board?.members.some(m => m.userId === userId)

    if (!isRequesterMember) {
      return res.status(403).json({
        message: "You must be a member of the board to assign a task"
      })
    }

    if (!isAssigneeMember) {
      return res.status(403).json({
        message: "The user you are trying to assign the task to is not a member of the board"
      })
    }

    if (task.assignedToId === userId) {
      return res.status(400).json({
        message: "The task is already assigned to this user"
      })
    }

    await prisma.task.update({
      where: {
        id: taskId
      },
      data: {
        assignedToId: userId
      }
    })

    res.status(200).json({
      message: "Task assigned successfully"
    })
  } catch (error) {
    return res.status(500).json({
      message: "An error occurred while assigning a task",
      error: error instanceof Error ? error.message : "Unknown error"
    })
  }
})

export default router