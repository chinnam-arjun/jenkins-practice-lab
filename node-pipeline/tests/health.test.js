const assert = require('node:assert/strict')
const { test } = require('node:test')
const request = require('supertest')
const createApp = require('../src/app')

test('GET /health returns the application health status', async () => {
  const response = await request(createApp()).get('/health')

  assert.equal(response.status, 200)
  assert.deepEqual(response.body, { status: 'ok' })
  assert.equal(response.headers['x-content-type-options'], 'nosniff')
})
