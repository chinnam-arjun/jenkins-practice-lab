import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError, buildApiUrl, request } from '../src/services/apiClient.js'
import { createTask, deleteTask, getTask, getTasks, updateTask } from '../src/services/tasksApi.js'

const task = {
  id: 'task-1',
  title: 'Write tests',
  description: 'Keep coverage meaningful',
  completed: false,
  createdAt: '2025-01-01T10:00:00.000Z',
  updatedAt: '2025-01-01T10:00:00.000Z'
}

function jsonResponse(payload, status = 200) {
  return new Response(payload === null ? null : JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' }
  })
}

afterEach(() => vi.unstubAllGlobals())

describe('API client', () => {
  it('constructs URLs from the configured base without duplicate slashes', () => {
    expect(buildApiUrl('/api/tasks')).toBe('http://localhost:5000/api/tasks')
  })

  it('serializes JSON and sets request headers', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(task))
    vi.stubGlobal('fetch', fetchMock)

    await request('api/tasks', { method: 'POST', body: { title: 'Write tests' } })

    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:5000/api/tasks',
      expect.objectContaining({
        method: 'POST',
        body: '{"title":"Write tests"}',
        headers: expect.any(Headers)
      })
    )
    const headers = fetchMock.mock.calls[0][1].headers
    expect(headers.get('Accept')).toBe('application/json')
    expect(headers.get('Content-Type')).toBe('application/json')
  })

  it('handles no-content responses', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(null, 204)))
    await expect(request('api/tasks/task-1', { method: 'DELETE' })).resolves.toBeNull()
  })

  it('uses API error messages and safe fallbacks', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ error: { message: 'Task not found' } }, 404)))
    await expect(request('api/tasks/missing')).rejects.toMatchObject({
      name: 'ApiError',
      status: 404,
      message: 'Task not found'
    })
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({}, 503)))
    await expect(request('api/tasks')).rejects.toThrow('The request failed with status 503.')
  })

  it('handles network errors and malformed successful responses', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('offline')))
    await expect(request('api/tasks')).rejects.toBeInstanceOf(ApiError)
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('<html/>', { status: 200 })))
    await expect(request('api/tasks')).rejects.toThrow('unreadable response')
  })

  it('allows an empty successful response body', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 200 })))
    await expect(request('api/tasks')).resolves.toBeNull()
  })
})

describe('Tasks API adapter', () => {
  it('normalizes direct and alternate task response shapes', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(jsonResponse([task]))
      .mockResolvedValueOnce(jsonResponse({ tasks: [{ taskId: 7, name: 'Alternate', isCompleted: true, created_at: 'today' }] })))
    await expect(getTasks()).resolves.toEqual([task])
    await expect(getTasks()).resolves.toEqual([{
      id: '7',
      title: 'Alternate',
      description: '',
      completed: true,
      createdAt: 'today',
      updatedAt: null
    }])
  })

  it('uses the supported endpoints, methods, and normalized response task', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse({ task }))
      .mockResolvedValueOnce(jsonResponse(task, 201))
      .mockResolvedValueOnce(jsonResponse(task))
      .mockResolvedValueOnce(jsonResponse(null, 204))
    vi.stubGlobal('fetch', fetchMock)

    await expect(getTask('task 1')).resolves.toEqual(task)
    await expect(createTask({ title: task.title })).resolves.toEqual(task)
    await expect(updateTask('task-1', { completed: true })).resolves.toEqual(task)
    await expect(deleteTask('task-1')).resolves.toBeUndefined()
    expect(fetchMock.mock.calls.map(([url, options]) => [url, options?.method ?? 'GET'])).toEqual([
      ['http://localhost:5000/api/tasks/task%201', 'GET'],
      ['http://localhost:5000/api/tasks', 'POST'],
      ['http://localhost:5000/api/tasks/task-1', 'PATCH'],
      ['http://localhost:5000/api/tasks/task-1', 'DELETE']
    ])
  })

  it('rejects invalid task collections and malformed task data', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(jsonResponse({ tasks: 'bad' }))
      .mockResolvedValueOnce(jsonResponse([{ id: 'task-1', title: 9 }]))
      .mockResolvedValueOnce(jsonResponse({ id: 'task-1', title: 'Valid', completed: 'yes' })))
    await expect(getTasks()).rejects.toThrow('invalid task list')
    await expect(getTasks()).rejects.toThrow('invalid task')
    await expect(getTask('task-1')).rejects.toThrow('invalid task')
  })
})
