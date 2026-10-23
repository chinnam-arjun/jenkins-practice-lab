const { randomUUID } = require('node:crypto')

class InMemoryTaskRepository {
  constructor() {
    this.tasks = []
  }

  async findAll() {
    return this.tasks.map((task) => ({ ...task }))
  }

  async findById(id) {
    const task = this.tasks.find((storedTask) => storedTask.id === id)
    return task ? { ...task } : null
  }

  async create(taskData) {
    const timestamp = new Date().toISOString()
    const task = {
      id: randomUUID(),
      title: taskData.title,
      description: taskData.description,
      completed: taskData.completed ?? false,
      createdAt: timestamp,
      updatedAt: timestamp
    }

    this.tasks.push(task)
    return { ...task }
  }

  async update(id, changes) {
    const task = this.tasks.find((storedTask) => storedTask.id === id)
    if (!task) {
      return null
    }

    Object.assign(task, changes, { updatedAt: new Date().toISOString() })
    return { ...task }
  }

  async delete(id) {
    const taskIndex = this.tasks.findIndex((task) => task.id === id)
    if (taskIndex === -1) {
      return false
    }

    this.tasks.splice(taskIndex, 1)
    return true
  }
}

module.exports = InMemoryTaskRepository
