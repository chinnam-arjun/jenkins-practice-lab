function createTaskController(taskService) {
  return {
    listTasks: async (req, res) => {
      const tasks = await taskService.listTasks()
      res.status(200).json(tasks)
    },
    getTask: async (req, res) => {
      const task = await taskService.getTask(req.params.id)
      res.status(200).json(task)
    },
    createTask: async (req, res) => {
      const task = await taskService.createTask(req.validatedBody)
      res.status(201).json(task)
    },
    updateTask: async (req, res) => {
      const task = await taskService.updateTask(req.params.id, req.validatedBody)
      res.status(200).json(task)
    },
    deleteTask: async (req, res) => {
      await taskService.deleteTask(req.params.id)
      res.status(204).end()
    }
  }
}

module.exports = createTaskController
