const express = require('express')
const helmet = require('helmet')
const cors = require('cors')
const taskRoutes = require('./routes/taskRoutes')
const createTaskController = require('./controllers/taskController')
const TaskService = require('./services/taskService')
const InMemoryTaskRepository = require('./repositories/inMemoryTaskRepository')
const notFound = require('./middleware/notFound')
const errorHandler = require('./middleware/errorHandler')

function createApp({ repository = new InMemoryTaskRepository() } = {}) {
  const app = express()
  const taskService = new TaskService(repository)
  const taskController = createTaskController(taskService)
  const configuredOrigins = process.env.CORS_ORIGINS === undefined
    ? (process.env.NODE_ENV === 'production' ? '' : 'http://localhost:5173')
    : process.env.CORS_ORIGINS
  const allowedOrigins = configuredOrigins
    .split(',')
    .map(origin => origin.trim())
    .filter(Boolean)

  app.use(helmet())
  app.use(cors({
    origin: (origin, callback) => {
      if (origin && allowedOrigins.includes(origin)) {
        return callback(null, origin)
      }

      return callback(null, false)
    },
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  }))
  app.use(express.json({ limit: '10kb' }))
  
  app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok' })
  })
  app.use('/api/tasks', taskRoutes(taskController))
  app.use(notFound)
  app.use(errorHandler)

  return app
}

module.exports = createApp
