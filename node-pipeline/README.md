# Tasks API

A small Express REST API for practicing Node.js testing, quality checks, and CI/CD. Tasks are stored in memory; no database or external service is required.

## Prerequisites

- Node.js 20.19 or later
- npm

## Install and run

```sh
npm ci
npm start
```

The API listens on port `5000` by default. Set the `PORT` environment variable to use another port. For development with automatic restarts, run `npm run dev`.

## API

All task endpoints use JSON. Errors have the form `{ "error": { "message": "..." } }`.

| Method | Path | Description | Success |
| --- | --- | --- | --- |
| `GET` | `/health` | Check application health | `200` |
| `GET` | `/api/tasks` | List all tasks | `200` |
| `GET` | `/api/tasks/:id` | Get one task | `200` |
| `POST` | `/api/tasks` | Create a task | `201` |
| `PATCH` | `/api/tasks/:id` | Update task fields | `200` |
| `DELETE` | `/api/tasks/:id` | Delete a task | `204` |

Create a task with a required, non-empty `title` (up to 120 characters); `description` and `completed` are optional:

```json
{
  "title": "Practice CI",
  "description": "Add automated checks",
  "completed": false
}
```

PATCH accepts one or more of `title`, `description`, and `completed`. Unknown fields and empty PATCH bodies are rejected. Task IDs are UUIDs.

## Quality checks

```sh
npm test
npm run test:coverage
npm run lint
```

## Storage and future database migration

Tasks are held in a JavaScript array and are lost when the server restarts. Routes and controllers use an asynchronous service and repository interface; the in-memory repository can later be replaced with a MySQL-backed repository while keeping the HTTP API and most application code unchanged. No MySQL driver or database setup is included yet.
