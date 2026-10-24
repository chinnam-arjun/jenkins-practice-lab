const assert = require('node:assert/strict')
const { test } = require('node:test')
const request = require('supertest')
const createApp = require('../src/app')

function withEnvironment(environment, run) {
  const previous = Object.fromEntries(
    Object.keys(environment).map(key => [key, process.env[key]])
  )

  for (const [key, value] of Object.entries(environment)) {
    if (value === undefined) {
      delete process.env[key]
    } else {
      process.env[key] = value
    }
  }

  return Promise.resolve()
    .then(run)
    .finally(() => {
      for (const [key, value] of Object.entries(previous)) {
        if (value === undefined) {
          delete process.env[key]
        } else {
          process.env[key] = value
        }
      }
    })
}

test('allows the configured frontend origin', async () => {
  await withEnvironment({
    NODE_ENV: 'test',
    CORS_ORIGINS: 'http://localhost:5173,http://localhost:3000'
  }, async () => {
    const response = await request(createApp())
      .get('/health')
      .set('Origin', 'http://localhost:3000')

    assert.equal(response.status, 200)
    assert.equal(response.headers['access-control-allow-origin'], 'http://localhost:3000')
    assert.equal(response.headers['access-control-allow-credentials'], undefined)
  })
})

test('does not grant CORS access to an unapproved browser origin', async () => {
  await withEnvironment({
    NODE_ENV: 'test',
    CORS_ORIGINS: 'http://localhost:5173'
  }, async () => {
    const response = await request(createApp())
      .get('/health')
      .set('Origin', 'https://untrusted.example')

    assert.equal(response.status, 200)
    assert.equal(response.headers['access-control-allow-origin'], undefined)
  })
})

test('handles preflight with configured methods and request headers', async () => {
  await withEnvironment({
    NODE_ENV: 'test',
    CORS_ORIGINS: 'http://localhost:5173'
  }, async () => {
    const response = await request(createApp())
      .options('/api/tasks')
      .set('Origin', 'http://localhost:5173')
      .set('Access-Control-Request-Method', 'PATCH')
      .set('Access-Control-Request-Headers', 'Content-Type, Authorization')

    assert.equal(response.status, 204)
    assert.equal(response.headers['access-control-allow-origin'], 'http://localhost:5173')
    assert.equal(
      response.headers['access-control-allow-methods'],
      'GET,POST,PATCH,DELETE,OPTIONS'
    )
    assert.equal(
      response.headers['access-control-allow-headers'],
      'Content-Type,Authorization'
    )
  })
})

test('defaults to the Vite frontend in development and allows requests without Origin', async () => {
  await withEnvironment({
    NODE_ENV: 'development',
    CORS_ORIGINS: undefined
  }, async () => {
    const app = createApp()
    const browserResponse = await request(app)
      .get('/health')
      .set('Origin', 'http://localhost:5173')
    const nonBrowserResponse = await request(app).get('/health')

    assert.equal(browserResponse.headers['access-control-allow-origin'], 'http://localhost:5173')
    assert.equal(nonBrowserResponse.status, 200)
    assert.equal(nonBrowserResponse.headers['access-control-allow-origin'], undefined)
  })
})

test('does not implicitly trust browser origins in production', async () => {
  await withEnvironment({
    NODE_ENV: 'production',
    CORS_ORIGINS: undefined
  }, async () => {
    const response = await request(createApp())
      .get('/health')
      .set('Origin', 'http://localhost:5173')

    assert.equal(response.status, 200)
    assert.equal(response.headers['access-control-allow-origin'], undefined)
  })
})
