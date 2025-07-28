// 1. Import the neccessary modules and libraries
import { Router } from "express";
import { authMidddleware } from "../middleware/authMiddleware";
import { AuthRequest } from "../middleware/authMiddleware";
import { prisma } from "../lib/prisma";

// 2. Create the router instance
const router = Router()

// 3. Create the routes
router.post('/boards/:id/columns', authMidddleware, async (req: AuthRequest, res) => {
  try {
    // 1. Parse the id to an integer and extract the title from the request body
    const idInt = parseInt(req.params.id)
    const { title } = req.body

    if (isNaN(idInt) || !title || typeof title !== 'string' || title.length < 2) {
      return res.status(400).json({
        message: "Invalid request: ID must be a number and title must be a valid string"
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
        message: "Only the owner of the board can create columns"
      })
    }

    // 4. Calculate the order of the new column
    const lastOrder = await prisma.column.findFirst({
      where: {
        boardId: idInt
      },
      orderBy: {
        order: "desc"
      }
    })

    // 5. Create the column
    const newColumn = await prisma.column.create({
      data: {
        title,
        order: lastOrder ? lastOrder.order + 1 : 0,
        boardId: idInt
      }
    })

    // 6. Send the response
    res.status(201).json({
      message: "Column created successfully",
      data: {
        id: newColumn.id,
        title: newColumn.title,
        order: newColumn.order,
        boardId: newColumn.boardId
      }
    })
  } catch (error) {
    return res.status(500).json({
      message: "An error occurred while creating a column",
      error: error instanceof Error ? error.message : "Unknown error"
    })
  }
})

router.get('/boards/:id/columns', authMidddleware, async (req: AuthRequest, res) => {
  try {
    const idInt = parseInt(req.params.id)

    if (isNaN(idInt)) {
      return res.status(400).json({
        message: "Invalid ID format, it must be a number"
      })
    }

    const board = await prisma.board.findUnique({
      where: {
        id: idInt
      },
      include: {
        members: {
          where: {
            userId: req.user?.id
          }
        }
      }
    })

    if (!board) {
      return res.status(404).json({
        message: "Board not found"
      })
    }

    const isMember = board.members.some(m => m.userId === req.user?.id)

    if (!isMember) {
      return res.status(403).json({
        message: "To view the columns, you must be a member of the board"
      })
    }

    const columns = await prisma.column.findMany({
      where: {
        boardId: idInt
      },
      orderBy: {
        order: "asc"
      }
    })

    if (columns.length === 0) {
      return res.status(200).json({
        message: "No columns found for this board",
        data: []
      })
    }

    const response = columns.map(c => ({
      id: c.id,
      title: c.title,
      order: c.order
    }))

    res.status(200).json(response)
  } catch (error) {
    return res.status(500).json({
      message: "An error occurred while fetching columns",
      error: error instanceof Error ? error.message : "Unknown error"
    })
  }
})

router.patch('/columns/:id', authMidddleware, async (req: AuthRequest, res) => {
  try {
    const idInt = parseInt(req.params.id)
    const { title } = req.body

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
        message: "You must be a member of the board to update a column"
      })
    }

    // Update the column
    const updatedColumn = await prisma.column.update({
      where: {
        id: idInt
      },
      data: {
        title
      }
    })

    res.status(200).json({
      message: "Column updated successfully",
      data: updatedColumn
    })
  } catch (error) {
    return res.status(500).json({
      message: "An error occurred while updating a column",
      error: error instanceof Error ? error.message : "Unknown error"
    })
  }
})

router.delete('/columns/:id', authMidddleware, async (req: AuthRequest, res) => {
  try {
    const idInt = parseInt(req.params.id)

    if (isNaN(idInt)) {
      return res.status(400).json({
        message: "Invalid ID format, it must be a number"
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
      select: {
        ownerId: true
      }
    })

    if (board?.ownerId !== req.user?.id) {
      return res.status(403).json({
        message: "You must be the owner of the board to delete a column"
      })
    }

    // Delete the column and its tasks, and reorder the remaining columns
    await prisma.$transaction(async (tx) => {
      await tx.task.deleteMany({
        where: {
          columnId: idInt
        }
      })

      await tx.column.delete({
        where: {
          id: idInt
        }
      })

      const remainingColumns = await tx.column.findMany({
        where: {
          boardId: column.boardId
        },
        orderBy: {
          order: "asc"
        }
      })

      await Promise.all(
        remainingColumns.map((c, index) => {
          return tx.column.update({
            where: {
              id: c.id
            },
            data: {
              order: index
            }
          })
        })
      )
    })

    res.status(200).json({
      message: "Column and its tasks deleted successfully"
    })
  } catch (error) {
    return res.status(500).json({
      message: "An error occurred while deleting a column",
      error: error instanceof Error ? error.message : "Unknown error"
    })
  }
})

router.patch('/columns/:id/reorder', authMidddleware, async (req: AuthRequest, res) => {
  try {
    const idInt = parseInt(req.params.id)
    const newOrder = parseInt(req.body.newOrder)

    if (isNaN(idInt) || !newOrder || isNaN(newOrder)) {
      return res.status(400).json({
        message: "Invalid request: Both ID's must be numbers"
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
          },
          select: {
            userId: true
          }
        }
      }
    })

    if (!board?.members.length) {
      return res.status(403).json({
        message: "You must be a member of the board to reorder columns"
      })
    }

    const allColumns = await prisma.column.findMany({
      where: {
        boardId: column.boardId
      },
      orderBy: {
        order: "asc"
      }
    })

    if (newOrder < 0 || newOrder >= allColumns.length) {
      return res.status(400).json({
        message: "Invalid request: New order is out of bounds"
      })
    }

    // Update the columns order
    await prisma.$transaction(async (tx) => {
      // 1. Extract the column from the array
      const columnsWithoutMoved = allColumns.filter(c => c.id !== idInt)

      // 2. Insert the column at the new position
      columnsWithoutMoved.splice(newOrder, 0, column)

      // 3. Update the order of the all columns
      await Promise.all(
        columnsWithoutMoved.map((c, index) => {
          return tx.column.update({
            where: {
              id: c.id
            },
            data: {
              order: index
            }
          })
        })
      )
    })

    res.status(200).json({
      message: "Columns reordered successfully"
    })
  } catch (error) {
    return res.status(500).json({
      message: "An error occurred while reordering columns",
      error: error instanceof Error ? error.message : "Unknown error"
    })
  }
})
// 4. Export the router
export default router