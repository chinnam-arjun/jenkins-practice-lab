function formatDate(value) {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? null
    : new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(date)
}

export default function TaskCard({ task, busy, onComplete, onDelete, onEdit, onView }) {
  return (
    <article className={`task-card${task.completed ? ' task-card--completed' : ''}`}>
      <button
        aria-label={task.completed ? `Mark ${task.title} incomplete` : `Mark ${task.title} complete`}
        aria-pressed={task.completed}
        className={`task-check${task.completed ? ' task-check--checked' : ''}`}
        disabled={busy}
        onClick={() => onComplete(task)}
        type="button"
      >
        {task.completed && <span aria-hidden="true">✓</span>}
      </button>
      <div className="task-card__body">
        <button className="task-card__title" onClick={() => onView(task)} type="button">
          {task.title}
        </button>
        {task.description && <p className="task-card__description">{task.description}</p>}
        <div className="task-card__meta">
          <span className={`status-pill${task.completed ? ' status-pill--done' : ''}`}>
            <span className="status-pill__dot" />
            {task.completed ? 'Completed' : 'In progress'}
          </span>
          {formatDate(task.updatedAt) && <span>Updated {formatDate(task.updatedAt)}</span>}
        </div>
      </div>
      <div className="task-card__actions">
        <button aria-label={`View ${task.title}`} className="icon-button" disabled={busy} onClick={() => onView(task)} title="View details" type="button">
          <svg aria-hidden="true" fill="none" viewBox="0 0 20 20"><path d="M2.5 10s2.7-5 7.5-5 7.5 5 7.5 5-2.7 5-7.5 5-7.5-5-7.5-5Z" stroke="currentColor" strokeWidth="1.5" /><circle cx="10" cy="10" r="2" stroke="currentColor" strokeWidth="1.5" /></svg>
        </button>
        <button aria-label={`Edit ${task.title}`} className="icon-button" disabled={busy} onClick={() => onEdit(task)} title="Edit task" type="button">
          <svg aria-hidden="true" fill="none" viewBox="0 0 20 20"><path d="m13.8 3.7 2.5 2.5M3 17l3.7-.8L16 6.9a1.8 1.8 0 0 0-2.5-2.5L4.2 13.7 3 17Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" /></svg>
        </button>
        <button aria-label={`Delete ${task.title}`} className="icon-button icon-button--danger" disabled={busy} onClick={() => onDelete(task)} title="Delete task" type="button">
          <svg aria-hidden="true" fill="none" viewBox="0 0 20 20"><path d="M4.5 6h11m-9.5 0 .6 10h6.8l.6-10M8 6V4h4v2m-3 3v4m2-4v4" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" /></svg>
        </button>
      </div>
    </article>
  )
}
