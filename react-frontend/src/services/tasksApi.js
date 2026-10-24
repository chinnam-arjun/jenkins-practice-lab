import { request } from './apiClient.js'

function normalizeTask(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('The Tasks API returned an invalid task.')
  }

  const id = value.id ?? value.taskId
  const title = value.title ?? value.name
  if (
    (typeof id !== 'string' && typeof id !== 'number') ||
    typeof title !== 'string' ||
    (value.description !== undefined && typeof value.description !== 'string') ||
    (value.completed !== undefined && typeof value.completed !== 'boolean') ||
    (value.isCompleted !== undefined && typeof value.isCompleted !== 'boolean')
  ) {
    throw new Error('The Tasks API returned an invalid task.')
  }

  return {
    id: String(id),
    title,
    description: value.description ?? '',
    completed: value.completed ?? value.isCompleted ?? false,
    createdAt: value.createdAt ?? value.created_at ?? null,
    updatedAt: value.updatedAt ?? value.updated_at ?? null
  }
}

export async function getTasks() {
  const result = await request('api/tasks')
  const tasks = Array.isArray(result) ? result : result?.tasks
  if (!Array.isArray(tasks)) {
    throw new Error('The Tasks API returned an invalid task list.')
  }
  return tasks.map(normalizeTask)
}

export async function getTask(id) {
  const result = await request(`api/tasks/${encodeURIComponent(id)}`)
  return normalizeTask(result?.task ?? result)
}

export async function createTask(data) {
  const result = await request('api/tasks', { method: 'POST', body: data })
  return normalizeTask(result?.task ?? result)
}

export async function updateTask(id, data) {
  const result = await request(`api/tasks/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: data
  })
  return normalizeTask(result?.task ?? result)
}

export async function deleteTask(id) {
  await request(`api/tasks/${encodeURIComponent(id)}`, { method: 'DELETE' })
}
