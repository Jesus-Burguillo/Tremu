// 1. Import the necessary modules and libraries
import jwt from "jsonwebtoken"
import { NextFunction, Request, Response } from "express"

// 2. Create an interface for the request with user information
export interface AuthRequest extends Request {
  user?: {
    id: number
  } 
}

// 3. Create the middleware
export const authMidddleware = (req: AuthRequest, res: Response, next: NextFunction) => {
  // 1. Read the Authorization header from the request and extract the token
  const token = req.headers.authorization?.split(" ")[1]

  if (!token) {
    return res.status(401).json({
      message: 'No token provided'
    })
  }

  // 2. Verify the token and extract the user information
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as jwt.JwtPayload

    req.user = {
      id: decoded.userId
    }

    // 3. Call the next middleware or route handler
    return next()
  } catch (error) {
    return res.status(401).json({
      message: "Invalid token",
      error: error instanceof Error ? error.message : "Unknown error"
    })
  }
}