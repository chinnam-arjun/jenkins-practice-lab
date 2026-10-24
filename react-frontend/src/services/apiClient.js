const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'
const baseUrl = configuredBaseUrl.replace(/\/+$/, '')

export class ApiError extends Error {
  constructor(message, status = null) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

export function buildApiUrl(path) {
  const normalizedPath = path.replace(/^\/+/, '')
  return `${baseUrl}/${normalizedPath}`
}

export async function request(path, options = {}) {
  const headers = new Headers(options.headers)
  if (options.body !== undefined && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }
  headers.set('Accept', 'application/json')

  let response
  try {
    response = await fetch(buildApiUrl(path), {
      ...options,
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body)
    })
  } catch {
    throw new ApiError('Unable to reach the Tasks API. Check your connection and try again.')
  }

  if (response.status === 204) {
    return null
  }

  const responseText = await response.text()
  let payload = null
  if (responseText) {
    try {
      payload = JSON.parse(responseText)
    } catch {
      if (response.ok) {
        throw new ApiError('The Tasks API returned an unreadable response.', response.status)
      }
    }
  }

  if (!response.ok) {
    const message = payload?.error?.message
    throw new ApiError(
      typeof message === 'string' && message.trim()
        ? message
        : `The request failed with status ${response.status}.`,
      response.status
    )
  }

  return payload
}
