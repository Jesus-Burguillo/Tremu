import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'

dotenv.config()

const app = express()

app.use(cors())
app.use(express.json())

// Aqui deberan ir los endpoints

app.get('/', (req, res) => {
  res.send('Hello World! 👋')
})

export default app