import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'

dotenv.config()

const app = express()

app.use(cors())
app.use(express.json())

// Import the auth routes
import authRoutes from './routes/authRoutes'

// Aqui deberan ir los endpoints
app.use('/api/auth', authRoutes)

// Example route
app.get('/', (req, res) => {
  res.send('Hello World! 👋')
})

export default app