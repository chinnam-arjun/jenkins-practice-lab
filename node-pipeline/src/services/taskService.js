const HttpError = require('../errors/httpError')

class TaskService {
  constructor(taskRepository) {
    this.taskRepository = taskRepository
  }

  listTasks() {
    return this.taskRepository.findAll()
  }

  async getTask(id) {
    const task = await this.taskRepository.findById(id)
    if (!task) {
      throw new HttpError(404, 'Task not found')
    }
    return task
  }

  createTask(taskData) {
    return this.taskRepository.create(taskData)
  }

  async updateTask(id, changes) {
    const task = await this.taskRepository.update(id, changes)
    if (!task) {
      throw new HttpError(404, 'Task not found')
    }
    return task
  }

  async deleteTask(id) {
    const deleted = await this.taskRepository.delete(id)
    if (!deleted) {
      throw new HttpError(404, 'Task not found')
    }
  }
}

module.exports = TaskService
