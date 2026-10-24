import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from '../src/App.jsx'
import * as tasksApi from '../src/services/tasksApi.js'

afterEach(cleanup)

vi.mock('../src/services/tasksApi.js', () => ({
  getTasks: vi.fn(),
  getTask: vi.fn(),
  createTask: vi.fn(),
  updateTask: vi.fn(),
  deleteTask: vi.fn()
}))

const tasks = [
  {
    id: 'a',
    title: 'Prepare release notes',
    description: 'Summarize the changes',
    completed: false,
    createdAt: '2025-01-01T10:00:00.000Z',
    updatedAt: '2025-01-01T10:00:00.000Z'
  },
  {
    id: 'b',
    title: 'Review pull request',
    description: '',
    completed: true,
    createdAt: '2025-01-02T10:00:00.000Z',
    updatedAt: '2025-01-02T10:00:00.000Z'
  }
]

function renderApp() {
  return render(<App />)
}

beforeEach(() => {
  vi.clearAllMocks()
  tasksApi.getTasks.mockResolvedValue(tasks)
  tasksApi.getTask.mockImplementation(async (id) => tasks.find((task) => task.id === id))
})

describe('Tasks dashboard', () => {
  it('shows a loading state before tasks arrive', async () => {
    let resolveTasks
    tasksApi.getTasks.mockReturnValue(new Promise((resolve) => { resolveTasks = resolve }))
    renderApp()
    expect(screen.getByRole('status', { name: 'Loading tasks' })).toBeInTheDocument()
    resolveTasks(tasks)
    expect(await screen.findByText('Prepare release notes')).toBeInTheDocument()
  })

  it('renders tasks, counts, and filters active and completed tasks', async () => {
    const user = userEvent.setup()
    renderApp()
    expect(await screen.findByText('Prepare release notes')).toBeInTheDocument()
    expect(screen.getByText('Review pull request')).toBeInTheDocument()
    expect(screen.getByText('2', { selector: '.stat-card strong' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Active 1' }))
    expect(screen.getByText('Prepare release notes')).toBeInTheDocument()
    expect(screen.queryByText('Review pull request')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Completed 1' }))
    expect(screen.getByText('Review pull request')).toBeInTheDocument()
    expect(screen.queryByText('Prepare release notes')).not.toBeInTheDocument()
  })

  it('shows a useful empty state and can start creating the first task', async () => {
    const user = userEvent.setup()
    tasksApi.getTasks.mockResolvedValue([])
    renderApp()
    expect(await screen.findByText('Your list is a blank canvas.')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Create your first task' }))
    expect(screen.getByRole('dialog', { name: 'Create a task' })).toBeInTheDocument()
  })

  it('creates a task with a trimmed title and optional description', async () => {
    const user = userEvent.setup()
    const created = { ...tasks[0], id: 'new', title: 'New task', description: 'Details' }
    tasksApi.createTask.mockResolvedValue(created)
    renderApp()
    await user.click(await screen.findByRole('button', { name: /New task/ }))
    await user.type(screen.getByLabelText(/Task title/), '  New task  ')
    await user.type(screen.getByLabelText(/Description/), 'Details')
    await user.click(screen.getByRole('button', { name: 'Create task' }))
    expect(tasksApi.createTask).toHaveBeenCalledWith({ title: 'New task', description: 'Details' })
    expect(await screen.findByText('Task created.')).toBeInTheDocument()
    expect(screen.getAllByText('New task').length).toBeGreaterThan(0)
  })

  it('validates a blank title before submitting', async () => {
    const user = userEvent.setup()
    renderApp()
    await user.click(await screen.findByRole('button', { name: /New task/ }))
    await user.type(screen.getByLabelText(/Task title/), '   ')
    await user.click(screen.getByRole('button', { name: 'Create task' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Enter a title')
    expect(tasksApi.createTask).not.toHaveBeenCalled()
  })

  it('edits a task and saves the updated version', async () => {
    const user = userEvent.setup()
    const updated = { ...tasks[0], title: 'Release notes complete' }
    tasksApi.updateTask.mockResolvedValue(updated)
    renderApp()
    await user.click(await screen.findByRole('button', { name: 'Edit Prepare release notes' }))
    const titleInput = screen.getByLabelText(/Task title/)
    await user.clear(titleInput)
    await user.type(titleInput, updated.title)
    await user.click(screen.getByRole('button', { name: 'Save changes' }))
    expect(tasksApi.updateTask).toHaveBeenCalledWith('a', {
      title: updated.title,
      description: tasks[0].description
    })
    expect(await screen.findByText(updated.title)).toBeInTheDocument()
  })

  it('updates completion status and respects filtered empty states', async () => {
    const user = userEvent.setup()
    const updated = { ...tasks[0], completed: true }
    tasksApi.updateTask.mockResolvedValue(updated)
    renderApp()
    await user.click(await screen.findByRole('button', { name: 'Mark Prepare release notes complete' }))
    expect(tasksApi.updateTask).toHaveBeenCalledWith('a', { completed: true })
    expect(await screen.findByText('Task marked as completed.')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Active 0' }))
    expect(screen.getByText('No active tasks right now.')).toBeInTheDocument()
  })

  it('fetches and displays details for a task', async () => {
    const user = userEvent.setup()
    renderApp()
    await user.click(await screen.findByRole('button', { name: 'View Prepare release notes' }))
    expect(await screen.findByRole('dialog', { name: /Prepare release notes/ })).toBeInTheDocument()
    expect(tasksApi.getTask).toHaveBeenCalledWith('a')
    expect(screen.getAllByText('Summarize the changes').length).toBe(2)
  })

  it('asks for confirmation and deletes only after confirmation', async () => {
    const user = userEvent.setup()
    tasksApi.deleteTask.mockResolvedValue(undefined)
    renderApp()
    await user.click(await screen.findByRole('button', { name: 'Delete Prepare release notes' }))
    const confirmation = screen.getByRole('alertdialog', { name: 'Delete this task?' })
    expect(confirmation).toBeInTheDocument()
    expect(tasksApi.deleteTask).not.toHaveBeenCalled()
    await user.click(within(confirmation).getByRole('button', { name: 'Delete task' }))
    expect(tasksApi.deleteTask).toHaveBeenCalledWith('a')
    expect(await screen.findByText('Task deleted.')).toBeInTheDocument()
    expect(screen.queryByText('Prepare release notes')).not.toBeInTheDocument()
  })

  it('reports load errors and retries the request', async () => {
    const user = userEvent.setup()
    tasksApi.getTasks.mockRejectedValueOnce(new Error('API is unavailable')).mockResolvedValueOnce(tasks)
    renderApp()
    expect(await screen.findByRole('alert')).toHaveTextContent('API is unavailable')
    await user.click(screen.getByRole('button', { name: 'Try again' }))
    expect(await screen.findByText('Prepare release notes')).toBeInTheDocument()
    expect(tasksApi.getTasks).toHaveBeenCalledTimes(2)
  })

  it('offers retry after a mutation fails and disables controls while pending', async () => {
    const user = userEvent.setup()
    let finishUpdate
    tasksApi.updateTask.mockReturnValue(new Promise((resolve) => { finishUpdate = resolve }))
    renderApp()
    const completeButton = await screen.findByRole('button', { name: 'Mark Prepare release notes complete' })
    await user.click(completeButton)
    expect(completeButton).toBeDisabled()
    finishUpdate({ ...tasks[0], completed: true })
    expect(await screen.findByText('Task marked as completed.')).toBeInTheDocument()

    tasksApi.updateTask.mockRejectedValueOnce(new Error('Could not update'))
    await user.click(screen.getByRole('button', { name: 'Mark Prepare release notes incomplete' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not update')
    tasksApi.updateTask.mockResolvedValueOnce({ ...tasks[0], completed: false })
    await user.click(screen.getByRole('button', { name: 'Try again' }))
    await waitFor(() => expect(screen.getByText('Task marked as active.')).toBeInTheDocument())
  })

  it('supports cancelling the delete confirmation and closes details', async () => {
    const user = userEvent.setup()
    renderApp()
    await user.click(await screen.findByRole('button', { name: 'Delete Prepare release notes' }))
    await user.click(screen.getByRole('button', { name: 'Keep task' }))
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'View Prepare release notes' }))
    await screen.findByRole('dialog')
    await user.click(screen.getByRole('button', { name: 'Close details' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('reports detail-loading errors and provides a retry action', async () => {
    const user = userEvent.setup()
    tasksApi.getTask.mockRejectedValueOnce(new Error('Task could not be loaded')).mockResolvedValueOnce(tasks[0])
    renderApp()
    await user.click(await screen.findByRole('button', { name: 'View Prepare release notes' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Task could not be loaded')
    await user.click(screen.getByRole('button', { name: 'Try again' }))
    expect(await screen.findByRole('dialog', { name: /Prepare release notes/ })).toBeInTheDocument()
  })

  it('supports editing from the details view and keeps content text-only', async () => {
    const user = userEvent.setup()
    renderApp()
    await user.click(await screen.findByRole('button', { name: 'View Prepare release notes' }))
    await screen.findByRole('dialog')
    await user.click(screen.getByRole('button', { name: 'Edit task' }))
    expect(screen.getByRole('dialog', { name: 'Edit task' })).toBeInTheDocument()
    expect(screen.getByLabelText(/Task title/)).toHaveValue('Prepare release notes')
    fireEvent.keyDown(window, { key: 'Escape' })
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })
})
