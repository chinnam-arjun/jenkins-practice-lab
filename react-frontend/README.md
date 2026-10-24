# Daymark React Tasks

A responsive React/Vite dashboard for the Tasks REST API. API communication and task normalization live in `src/services`; the UI depends on the normalized task model rather than a particular backend language.

## Prerequisites and local run

- Node.js 20.19+ and npm
- The Tasks API running locally (by default, `http://localhost:5000`)

```sh
npm ci
Copy-Item .env.example .env.local
npm run dev
```

Set `VITE_API_BASE_URL` in `.env.local` to the backend origin, without an `/api/tasks` suffix. The checked-in `.env.example` uses the Node API's default port. Vite reads this value through `import.meta.env.VITE_API_BASE_URL`; do not put credentials or secrets in frontend environment variables. Vite embeds public values into the built assets.

## Checks and production build

```sh
npm test
npm run test:coverage
npm run lint
npm run build
npm run preview
```

The production files are emitted to `dist/`. Configure `VITE_API_BASE_URL` at build time when building for a non-default backend.

## Tasks API contract

The current Node API uses `/api/tasks`:

| Method | Path | Request | Success response |
| --- | --- | --- | --- |
| `GET` | `/api/tasks` | — | JSON array of tasks |
| `GET` | `/api/tasks/:id` | — | One task JSON object |
| `POST` | `/api/tasks` | `{ "title": "Required", "description": "Optional", "completed": false }` | `201`, one task |
| `PATCH` | `/api/tasks/:id` | One or more of `title`, `description`, `completed` | `200`, updated task |
| `DELETE` | `/api/tasks/:id` | — | `204`, no body |

A task has `id`, `title`, `description`, `completed`, `createdAt`, and `updatedAt`. IDs are UUIDs. Titles are trimmed, required, and limited to 120 characters; descriptions must be strings and `completed` must be a boolean. The server rejects unknown fields and an empty PATCH. Errors use `{ "error": { "message": "..." } }`; a missing task returns `404`. The API is in-memory, so tasks do not persist across server restarts.

The UI contract normalizes these fields in `src/services/tasksApi.js`. That adapter also demonstrates how to map common alternatives such as `taskId`, `name`, `isCompleted`, snake-case timestamps, and a `{ tasks: [...] }` response envelope. To connect a Python/Flask, FastAPI, or Java/Spring backend, configure its base URL and adjust only the API adapter if its route, request, or response shape differs; preserve the normalized task model and supported create/read/update/delete behaviors.

## CORS

The backend must allow the frontend's origin (for Vite, usually `http://localhost:5173`) and the required methods/headers. Configure CORS on the backend; the browser client does not bypass CORS.

## Jenkins

Create a multibranch pipeline for this repository and set Script Path to `react-frontend/Jenkinsfile` after adding a frontend pipeline file. The pipeline working directory must be `react-frontend/` for npm commands. No Jenkinsfile is included in this initial frontend implementation.

## Current deployment scope

No Dockerfile or Jenkinsfile is included, per the requested scope. The static `dist/` output can be served by a production static host.
