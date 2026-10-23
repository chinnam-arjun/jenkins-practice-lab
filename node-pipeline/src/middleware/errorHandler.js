const HttpError = require('../errors/httpError')

function errorHandler(error, req, res, next) {
  if (res.headersSent) {
    return next(error)
  }

  if (error.type === 'entity.parse.failed') {
    return res.status(400).json({ error: { message: 'Malformed JSON request body' } })
  }

  if (error.type === 'entity.too.large') {
    return res.status(413).json({ error: { message: 'Request body is too large' } })
  }

  const statusCode = error instanceof HttpError ? error.statusCode : 500
  const message = statusCode === 500 ? 'Internal server error' : error.message

  return res.status(statusCode).json({ error: { message } })
}

module.exports = errorHandler
