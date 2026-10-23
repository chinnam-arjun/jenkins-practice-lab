const assert = require('node:assert/strict')
const { test } = require('node:test')
const request = require('supertest')
const createApp = require('../src/app')

function createTaskApp(repository) {
  return createApp(repository ? { repository } : undefined)
}

test('GET /api/tasks returns an empty list for a new app instance', async () => {
  const response = await request(createTaskApp()).get('/api/tasks')

  assert.equal(response.status, 200)
  assert.deepEqual(response.body, [])
})

test('GET /api/tasks lists tasks created in the same app instance', async () => {
  const app = createTaskApp()
  const created = await request(app).post('/api/tasks').send({ title: 'List me' })
  const response = await request(app).get('/api/tasks')

  assert.equal(response.status, 200)
  assert.deepEqual(response.body, [created.body])
})

test('POST /api/tasks creates a task with defaults and timestamps', async () => {
  const response = await request(createTaskApp())
    .post('/api/tasks')
    .send({ title: '  Write tests  ', description: 'Add API coverage' })

  assert.equal(response.status, 201)
  assert.match(response.body.id, /^[0-9a-f-]{36}$/i)
  assert.equal(response.body.title, 'Write tests')
  assert.equal(response.body.description, 'Add API coverage')
  assert.equal(response.body.completed, false)
  assert.equal(new Date(response.body.createdAt).toISOString(), response.body.createdAt)
  assert.equal(response.body.updatedAt, response.body.createdAt)
})

test('POST /api/tasks accepts a completed flag', async () => {
  const response = await request(createTaskApp())
    .post('/api/tasks')
    .send({ title: 'Finished task', completed: true })

  assert.equal(response.status, 201)
  assert.equal(response.body.completed, true)
})

const invalidCreateBodies = [
  [{ description: 'No title' }, 'Title is required'],
  [{ title: '' }, 'Title cannot be empty'],
  [{ title: '   ' }, 'Title cannot be empty'],
  [{ title: 42 }, 'Title must be a string'],
  [{ title: 'x'.repeat(121) }, 'Title cannot exceed 120 characters'],
  [{ title: 'Task', description: 3 }, 'Description must be a string'],
  [{ title: 'Task', completed: 'false' }, 'Completed must be a boolean'],
  [{ title: 'Task', unexpected: true }, 'Unsupported field: unexpected']
]

for (const [body, message] of invalidCreateBodies) {
  test(`POST /api/tasks rejects invalid input: ${message}`, async () => {
    const response = await request(createTaskApp()).post('/api/tasks').send(body)

    assert.equal(response.status, 400)
    assert.deepEqual(response.body, { error: { message } })
  })
}

test('GET /api/tasks/:id retrieves a task and returns 404 when it is missing', async () => {
  const app = createTaskApp()
  const created = await request(app).post('/api/tasks').send({ title: 'Find me' })
  const found = await request(app).get(`/api/tasks/${created.body.id}`)
  const missing = await request(app).get('/api/tasks/7ee3f946-c925-4c2b-9a21-0f2328cb135d')

  assert.equal(found.status, 200)
  assert.deepEqual(found.body, created.body)
  assert.equal(missing.status, 404)
  assert.deepEqual(missing.body, { error: { message: 'Task not found' } })
})

test('task routes reject malformed UUIDs', async () => {
  const response = await request(createTaskApp()).get('/api/tasks/not-an-id')

  assert.equal(response.status, 400)
  assert.deepEqual(response.body, { error: { message: 'Task ID must be a valid UUID' } })
})

test('PATCH /api/tasks/:id updates supported fields and preserves unchanged values', async () => {
  const app = createTaskApp()
  const created = await request(app)
    .post('/api/tasks')
    .send({ title: 'Original title', description: 'Keep this' })
  const updated = await request(app)
    .patch(`/api/tasks/${created.body.id}`)
    .send({ title: 'Updated title', completed: true })

  assert.equal(updated.status, 200)
  assert.equal(updated.body.id, created.body.id)
  assert.equal(updated.body.title, 'Updated title')
  assert.equal(updated.body.description, 'Keep this')
  assert.equal(updated.body.completed, true)
  assert.equal(updated.body.createdAt, created.body.createdAt)
  assert.ok(Date.parse(updated.body.updatedAt) >= Date.parse(created.body.updatedAt))
})

const invalidPatchBodies = [
  [{}, 'PATCH request body cannot be empty'],
  [{ title: '' }, 'Title cannot be empty'],
  [{ description: false }, 'Description must be a string'],
  [{ completed: 1 }, 'Completed must be a boolean'],
  [{ id: 'caller-supplied' }, 'Unsupported field: id']
]

for (const [body, message] of invalidPatchBodies) {
  test(`PATCH /api/tasks/:id rejects invalid input: ${message}`, async () => {
    const response = await request(createTaskApp()).patch(
      '/api/tasks/7ee3f946-c925-4c2b-9a21-0f2328cb135d'
    ).send(body)

    assert.equal(response.status, 400)
    assert.deepEqual(response.body, { error: { message } })
  })
}

test('PATCH /api/tasks/:id returns 404 when the task does not exist', async () => {
  const response = await request(createTaskApp())
    .patch('/api/tasks/7ee3f946-c925-4c2b-9a21-0f2328cb135d')
    .send({ completed: true })

  assert.equal(response.status, 404)
  assert.deepEqual(response.body, { error: { message: 'Task not found' } })
})

test('DELETE /api/tasks/:id removes a task and returns 404 when it is missing', async () => {
  const app = createTaskApp()
  const created = await request(app).post('/api/tasks').send({ title: 'Delete me' })
  const deleted = await request(app).delete(`/api/tasks/${created.body.id}`)
  const missing = await request(app).delete(`/api/tasks/${created.body.id}`)
  const list = await request(app).get('/api/tasks')

  assert.equal(deleted.status, 204)
  assert.equal(deleted.text, '')
  assert.equal(missing.status, 404)
  assert.deepEqual(missing.body, { error: { message: 'Task not found' } })
  assert.deepEqual(list.body, [])
})

test('unknown routes return a consistent JSON 404', async () => {
  const response = await request(createTaskApp()).get('/unknown')

  assert.equal(response.status, 404)
  assert.deepEqual(response.body, { error: { message: 'Route not found' } })
})

test('malformed JSON returns a consistent JSON 400 without parser details', async () => {
  const response = await request(createTaskApp())
    .post('/api/tasks')
    .set('Content-Type', 'application/json')
    .send('{"title":')

  assert.equal(response.status, 400)
  assert.deepEqual(response.body, { error: { message: 'Malformed JSON request body' } })
})

test('request bodies above the configured limit return 413', async () => {
  const response = await request(createTaskApp())
    .post('/api/tasks')
    .send({ title: 'Task', description: 'x'.repeat(11 * 1024) })

  assert.equal(response.status, 413)
  assert.deepEqual(response.body, { error: { message: 'Request body is too large' } })
})

test('unexpected repository errors return a generic 500 response', async () => {
  const repository = {
    findAll: async () => {
      throw Object.assign(new Error('internal database detail'), { statusCode: 400 })
    }
  }
  const response = await request(createTaskApp(repository)).get('/api/tasks')

  assert.equal(response.status, 500)
  assert.deepEqual(response.body, { error: { message: 'Internal server error' } })
  assert.equal(JSON.stringify(response.body).includes('internal database detail'), false)
})
