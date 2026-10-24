const express = require('express')
const helmet = require('helmet')
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

  app.use(helmet())
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
