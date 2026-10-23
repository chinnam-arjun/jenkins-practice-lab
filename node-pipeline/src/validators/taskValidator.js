const HttpError = require('../errors/httpError')

const allowedTaskFields = new Set(['title', 'description', 'completed'])
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const maxTitleLength = 120

function validateBodyObject(body) {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) {
    throw new HttpError(400, 'Request body must be a JSON object')
  }

  const unknownFields = Object.keys(body).filter((field) => !allowedTaskFields.has(field))
  if (unknownFields.length > 0) {
    throw new HttpError(400, `Unsupported field: ${unknownFields[0]}`)
  }
}

function validateTitle(title) {
  if (typeof title !== 'string') {
    throw new HttpError(400, 'Title must be a string')
  }

  const normalizedTitle = title.trim()
  if (normalizedTitle.length === 0) {
    throw new HttpError(400, 'Title cannot be empty')
  }
  if (normalizedTitle.length > maxTitleLength) {
    throw new HttpError(400, `Title cannot exceed ${maxTitleLength} characters`)
  }

  return normalizedTitle
}

function validateOptionalFields(body) {
  const validatedBody = {}

  if (Object.hasOwn(body, 'description')) {
    if (typeof body.description !== 'string') {
      throw new HttpError(400, 'Description must be a string')
    }
    validatedBody.description = body.description
  }

  if (Object.hasOwn(body, 'completed')) {
    if (typeof body.completed !== 'boolean') {
      throw new HttpError(400, 'Completed must be a boolean')
    }
    validatedBody.completed = body.completed
  }

  return validatedBody
}

function validateCreateTask(req, res, next) {
  try {
    validateBodyObject(req.body)
    if (!Object.hasOwn(req.body, 'title')) {
      throw new HttpError(400, 'Title is required')
    }

    req.validatedBody = {
      title: validateTitle(req.body.title),
      ...validateOptionalFields(req.body)
    }
    return next()
  } catch (error) {
    return next(error)
  }
}

function validateTaskId(req, res, next) {
  if (!uuidPattern.test(req.params.id)) {
    return next(new HttpError(400, 'Task ID must be a valid UUID'))
  }
  return next()
}

function validateUpdateTask(req, res, next) {
  try {
    validateBodyObject(req.body)
    if (Object.keys(req.body).length === 0) {
      throw new HttpError(400, 'PATCH request body cannot be empty')
    }

    const validatedBody = validateOptionalFields(req.body)
    if (Object.hasOwn(req.body, 'title')) {
      validatedBody.title = validateTitle(req.body.title)
    }

    req.validatedBody = validatedBody
    return next()
  } catch (error) {
    return next(error)
  }
}

module.exports = { validateCreateTask, validateTaskId, validateUpdateTask }
