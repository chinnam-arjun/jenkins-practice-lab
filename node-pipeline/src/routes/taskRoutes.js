const express = require('express')
const {
  validateCreateTask,
  validateTaskId,
  validateUpdateTask
} = require('../validators/taskValidator')

function taskRoutes(controller) {
  const router = express.Router()

  router.get('/', controller.listTasks)
  router.post('/', validateCreateTask, controller.createTask)
  router.get('/:id', validateTaskId, controller.getTask)
  router.patch('/:id', validateTaskId, validateUpdateTask, controller.updateTask)
  router.delete('/:id', validateTaskId, controller.deleteTask)

  return router
}

module.exports = taskRoutes
