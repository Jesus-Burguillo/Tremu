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

router.get('/columns/:id/tasks', authMidddleware, async (req: AuthRequest, res) => {
  try {
    const idInt = parseInt(req.params.id)

    if (isNaN(idInt)) {
      return res.status(400).json({
        message: "Invalid request: ID must be a number"
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
        message: "You must be a member of the board to get tasks"
      })
    }

    const tasks = await prisma.task.findMany({
      where: {
        columnId: idInt
      },
      orderBy: {
        order: "asc"
      },
      include: {
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    })

    if (!tasks.length) {
      return res.status(200).json({
        message: "That column has no tasks",
        data: []
      })
    }

    res.status(200).json({
      message: "Tasks retrieved successfully",
      data: tasks
    })
  } catch (error) {
    return res.status(500).json({
      message: "An error occurred while getting tasks",
      error: error instanceof Error ? error.message : "Unknown error"
    })
  }
})

router.patch('/tasks/:id/move', authMidddleware, async (req: AuthRequest, res) => {
  try {
    const idInt = parseInt(req.params.id)
    const { newColumnId, newOrder } = req.body

    if (isNaN(idInt)) {
      return res.status(400).json({
        message: "Invalid request: ID must be a number"
      })
    }

    if (isNaN(newColumnId)) {
      return res.status(400).json({
        message: "Invalid request: newColumnId must be a number"
      })
    }

    if (isNaN(newOrder)) {
      return res.status(400).json({
        message: "Invalid request: newOrder must be a number"
      })
    }

    const task = await prisma.task.findUnique({
      where: {
        id: idInt
      }
    })

    if (!task) {
      return res.status(404).json({
        message: "Task not found"
      })
    }

    const column = await prisma.column.findUnique({
      where: {
        id: newColumnId
      },
      select: {
        boardId: true
      }
    })

    const board = await prisma.board.findUnique({
      where: {
        id: column?.boardId
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
        message: "You must be a member of the board to move a task"
      })
    }

    // Update the task
    const movingWithinSameColumn = task.columnId === newColumnId

    if (movingWithinSameColumn) {
      if (newOrder < task.order) {
        // Move up the task
        await prisma.task.updateMany({
          where: {
            columnId: task.columnId,
            order: {
              gte: newOrder,
              lt: task.order
            }
          },
          data: {
            order: {
              increment: 1
            }
          }
        })
      } else if (newOrder > task.order) {
        // Move down the task
        await prisma.task.updateMany({
          where: {
            columnId: task.columnId,
            order: {
              gt: task.order,
              lte: newOrder
            }
          },
          data: {
            order: {
              decrement: 1
            }
          }
        })
      }
    } else {
      await prisma.task.updateMany({
        where: {
          columnId: newColumnId,
          order: {
            gte: newOrder
          }
        },
        data: {
          order: {
            increment: 1
          }
        }
      })
    }

    const updatedTask = await prisma.task.update({
      where: {
        id: idInt
      },
      data: {
        columnId: newColumnId,
        order: newOrder
      }
    })

    res.status(200).json({
      message: "Task moved successfully",
      data: updatedTask
    })
  } catch (error) {
    return res.status(500).json({
      message: "An error occurred while moving a task",
      error: error instanceof Error ? error.message : "Unknown error"
    })
  }
})

router.delete('/tasks/:id', authMidddleware, async (req: AuthRequest, res) => {
  try {
    const idInt = parseInt(req.params.id)

    if (isNaN(idInt)) {
      return res.status(400).json({
        message: "Invalid request: ID must be a number"
      })
    }

    const task = await prisma.task.findUnique({
      where: {
        id: idInt
      }
    })

    if (!task) {
      return res.status(404).json({
        message: "Task not found"
      })
    }

    const column = await prisma.column.findUnique({
      where: {
        id: task.columnId
      }
    })

    const board = await prisma.board.findUnique({
      where: {
        id: column?.boardId
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
        message: "You must be a member of the board to delete a task"
      })
    }

    await prisma.task.updateMany({
      where: {
        columnId: task.columnId,
        order: {
          gt: task.order
        }
      },
      data: {
        order: {
          decrement: 1
        }
      }
    })

    await prisma.task.delete({
      where: {
        id: idInt
      }
    })

    res.status(200).json({
      message: "Task deleted successfully"
    })
  } catch (error) {
    return res.status(500).json({
      message: "An error occurred while deleting a task",
      error: error instanceof Error ? error.message : "Unknown error"
    })
  }
})

router.patch('/tasks/:id', authMidddleware, async (req: AuthRequest, res) => {
  try {
    const idInt = parseInt(req.params.id)
    const { title, description } = req.body

    if (isNaN(idInt)) {
      return res.status(400).json({
        message: "Invalid request: ID must be a number"
      })
    }

    if (!title && !description) {
      return res.status(400).json({
        message: "Invalid request: at least one of the fields must be provided"
      })
    }

    const task = await prisma.task.findUnique({
      where: {
        id: idInt
      }
    })

    if (!task) {
      return res.status(404).json({
        message: "Task not found"
      })
    }

    const column = await prisma.column.findUnique({
      where: {
        id: task.columnId
      }
    })

    const board = await prisma.board.findUnique({
      where: {
        id: column?.boardId
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
        message: "You must be a member of the board to update a task"
      })
    }

    await prisma.task.update({
      where: {
        id: idInt
      },
      data: {
        ...(title && { title }),
        ...(description !== undefined && { description })
      }
    })

    res.status(200).json({
      message: "Task updated successfully"
    })
  } catch (error) {
    return res.status(500).json({
      message: "An error occurred while updating a task",
      error: error instanceof Error ? error.message : "Unknown error"
    })
  }
})

export default router