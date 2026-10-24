import { useCallback, useEffect, useMemo, useState } from 'react'
import Feedback from './components/Feedback.jsx'
import TaskCard from './components/TaskCard.jsx'
import TaskDetails from './components/TaskDetails.jsx'
import TaskForm from './components/TaskForm.jsx'
import { createTask, deleteTask, getTask, getTasks, updateTask } from './services/tasksApi.js'

const filters = ['All tasks', 'Active', 'Completed']

function getErrorMessage(error) {
  return error instanceof Error ? error.message : 'Something went wrong. Please try again.'
}

export default function App() {
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [filter, setFilter] = useState('All tasks')
  const [feedback, setFeedback] = useState(null)
  const [formTask, setFormTask] = useState(undefined)
  const [details, setDetails] = useState(null)
  const [detailsLoading, setDetailsLoading] = useState(false)
  const [deleteCandidate, setDeleteCandidate] = useState(null)

  const loadTasks = useCallback(async () => {
    setLoading(true)
    setFeedback(null)
    try {
      setTasks(await getTasks())
    } catch (error) {
      setFeedback({
        type: 'error',
        message: getErrorMessage(error),
        retry: () => loadTasks()
      })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadTasks()
  }, [loadTasks])

  const counts = useMemo(() => ({
    total: tasks.length,
    active: tasks.filter((task) => !task.completed).length,
    completed: tasks.filter((task) => task.completed).length
  }), [tasks])

  const visibleTasks = useMemo(() => tasks.filter((task) => {
    if (filter === 'Active') return !task.completed
    if (filter === 'Completed') return task.completed
    return true
  }), [filter, tasks])

  async function runMutation(action, successMessage, onSuccess) {
    setBusy(true)
    setFeedback(null)
    try {
      const result = await action()
      onSuccess(result)
      setFeedback({ type: 'success', message: successMessage })
    } catch (error) {
      setFeedback({
        type: 'error',
        message: getErrorMessage(error),
        retry: () => runMutation(action, successMessage, onSuccess)
      })
    } finally {
      setBusy(false)
    }
  }

  function handleFormSubmit(data) {
    const editing = Boolean(formTask)
    const action = () => editing ? updateTask(formTask.id, data) : createTask(data)
    runMutation(action, editing ? 'Your changes have been saved.' : 'Task created.', (task) => {
      setTasks((current) => editing
        ? current.map((item) => item.id === task.id ? task : item)
        : [task, ...current])
      setFormTask(undefined)
      if (details?.id === task.id) setDetails(task)
    })
  }

  function handleToggle(task) {
    const nextCompleted = !task.completed
    runMutation(
      () => updateTask(task.id, { completed: nextCompleted }),
      nextCompleted ? 'Task marked as completed.' : 'Task marked as active.',
      (updated) => {
        setTasks((current) => current.map((item) => item.id === updated.id ? updated : item))
        if (details?.id === updated.id) setDetails(updated)
      }
    )
  }

  function handleDelete() {
    const task = deleteCandidate
    if (!task) return
    runMutation(() => deleteTask(task.id), 'Task deleted.', () => {
      setTasks((current) => current.filter((item) => item.id !== task.id))
      setDeleteCandidate(null)
      if (details?.id === task.id) setDetails(null)
    })
  }

  async function handleView(task) {
    setDetailsLoading(true)
    setFeedback(null)
    try {
      setDetails(await getTask(task.id))
    } catch (error) {
      setFeedback({
        type: 'error',
        message: getErrorMessage(error),
        retry: () => handleView(task)
      })
    } finally {
      setDetailsLoading(false)
    }
  }

  function handleEdit(task) {
    setDetails(null)
    setFormTask(task)
  }

  const activeModal = formTask !== undefined || details !== null || deleteCandidate !== null

  return (
    <main className="app-shell">
      <header className="topbar">
        <a aria-label="Daymark home" className="brand" href="/">
          <span aria-hidden="true" className="brand__mark"><span /></span>
          <span>daymark</span>
        </a>
        <div className="topbar__caption"><span className="topbar__dot" /> Your personal workspace</div>
        <div className="topbar__date">{new Intl.DateTimeFormat(undefined, { weekday: 'short', month: 'short', day: 'numeric' }).format(new Date())}</div>
      </header>

      <section className="welcome">
        <div>
          <p className="eyebrow">YOUR SPACE TO GET THINGS DONE</p>
          <h1>A little progress<br className="mobile-break" /> goes a long way.</h1>
          <p className="welcome__copy">Keep your day in focus, one task at a time.</p>
        </div>
        <button className="button button--primary add-button" disabled={busy} onClick={() => setFormTask(null)} type="button">
          <span aria-hidden="true" className="add-button__plus">+</span> New task
        </button>
      </section>

      <Feedback feedback={feedback} onDismiss={() => setFeedback(null)} />

      <section aria-label="Task summary" className="stats-grid">
        <article className="stat-card">
          <span className="stat-card__icon stat-card__icon--total"><svg aria-hidden="true" fill="none" viewBox="0 0 24 24"><path d="M7 5h10M7 10h10M7 15h6M5 3h14v18H5z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.6" /></svg></span>
          <span className="stat-card__label">Total tasks</span>
          <strong>{counts.total}</strong>
          <span className="stat-card__foot">All the things on your list</span>
        </article>
        <article className="stat-card">
          <span className="stat-card__icon stat-card__icon--active"><svg aria-hidden="true" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.6" /><path d="M12 7v5l3 2" stroke="currentColor" strokeLinecap="round" strokeWidth="1.6" /></svg></span>
          <span className="stat-card__label">In progress</span>
          <strong>{counts.active}</strong>
          <span className="stat-card__foot">Ready when you are</span>
        </article>
        <article className="stat-card">
          <span className="stat-card__icon stat-card__icon--done"><svg aria-hidden="true" fill="none" viewBox="0 0 24 24"><path d="m6.5 12.5 3.5 3.5 7.5-8" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" /><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" /></svg></span>
          <span className="stat-card__label">Completed</span>
          <strong>{counts.completed}</strong>
          <span className="stat-card__foot">Nice work, keep it up</span>
        </article>
      </section>

      <section aria-labelledby="tasks-heading" className="tasks-section">
        <div className="tasks-heading">
          <div>
            <p className="eyebrow">YOUR WORKSPACE</p>
            <h2 id="tasks-heading">Your tasks <span className="task-total">{counts.total}</span></h2>
          </div>
          <div aria-label="Filter tasks" className="filter-tabs" role="group">
            {filters.map((item) => (
              <button
                aria-pressed={filter === item}
                className={`filter-tab${filter === item ? ' filter-tab--selected' : ''}`}
                key={item}
                onClick={() => setFilter(item)}
                type="button"
              >
                {item}
                {item === 'Active' && <span className="filter-count">{counts.active}</span>}
                {item === 'Completed' && <span className="filter-count">{counts.completed}</span>}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div aria-label="Loading tasks" className="loading-state" role="status">
            <span className="spinner" />
            <p>Gathering your tasks...</p>
          </div>
        ) : tasks.length === 0 ? (
          <div className="empty-state">
            <div aria-hidden="true" className="empty-state__icon"><svg fill="none" viewBox="0 0 52 52"><rect height="34" rx="5" stroke="currentColor" strokeWidth="1.7" width="32" x="10" y="9" /><path d="M18 19h16M18 26h16M18 33h9" stroke="currentColor" strokeLinecap="round" strokeWidth="1.7" /><path d="M36 36v8m-4-4h8" stroke="currentColor" strokeLinecap="round" strokeWidth="1.7" /></svg></div>
            <h3>Your list is a blank canvas.</h3>
            <p>Add a task to make a little progress today.</p>
            <button className="button button--primary" disabled={busy} onClick={() => setFormTask(null)} type="button">Create your first task</button>
          </div>
        ) : visibleTasks.length === 0 ? (
          <div className="empty-filter">
            <p>No {filter.toLowerCase()} tasks right now.</p>
            <button className="text-button" onClick={() => setFilter('All tasks')} type="button">Show all tasks</button>
          </div>
        ) : (
          <div className="task-list">
            {visibleTasks.map((task) => (
              <TaskCard
                busy={busy}
                key={task.id}
                onComplete={handleToggle}
                onDelete={setDeleteCandidate}
                onEdit={handleEdit}
                onView={handleView}
                task={task}
              />
            ))}
          </div>
        )}
        {!loading && tasks.length > 0 && (
          <p className="list-footer">
            Showing {visibleTasks.length} of {counts.total} {counts.total === 1 ? 'task' : 'tasks'}
            {counts.completed > 0 && <span> · {counts.completed} completed so far</span>}
          </p>
        )}
      </section>

      <footer className="footer"><span>Make room for what matters.</span><span>DAYMARK <span aria-hidden="true">·</span> TASKS</span></footer>

      {formTask !== undefined && <TaskForm busy={busy} onClose={() => setFormTask(undefined)} onSubmit={handleFormSubmit} task={formTask} />}
      {details && <TaskDetails busy={busy} onClose={() => setDetails(null)} onEdit={handleEdit} task={details} />}
      {detailsLoading && !activeModal && <div aria-label="Loading task details" className="loading-overlay" role="status"><span className="spinner" /> Loading details...</div>}

      {deleteCandidate && (
        <div className="modal-backdrop">
          <section aria-labelledby="delete-title" aria-modal="true" className="modal modal--confirm" role="alertdialog">
            <div className="confirm-icon" aria-hidden="true">!</div>
            <h2 id="delete-title">Delete this task?</h2>
            <p><strong>{deleteCandidate.title}</strong> will be permanently removed from your list.</p>
            <div className="modal__actions">
              <button className="button button--secondary" disabled={busy} onClick={() => setDeleteCandidate(null)} type="button">Keep task</button>
              <button className="button button--danger" disabled={busy} onClick={handleDelete} type="button">
                {busy ? <><span className="spinner spinner--small" /> Deleting...</> : 'Delete task'}
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  )
}
