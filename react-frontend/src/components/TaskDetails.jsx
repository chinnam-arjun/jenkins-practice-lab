function formatTimestamp(value) {
  if (!value) return 'Not available'
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? 'Not available'
    : new Intl.DateTimeFormat(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short'
    }).format(date)
}

export default function TaskDetails({ task, busy, onClose, onEdit }) {
  return (
    <div className="modal-backdrop" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose()
    }}>
      <section aria-labelledby="task-details-title" aria-modal="true" className="modal modal--details" role="dialog">
        <div className="modal__heading">
          <p className="eyebrow">TASK DETAILS</p>
          <button aria-label="Close details" className="icon-button" onClick={onClose} type="button">×</button>
        </div>
        <h2 id="task-details-title">{task.title}</h2>
        <span className={`status-pill${task.completed ? ' status-pill--done' : ''}`}>
          <span className="status-pill__dot" />
          {task.completed ? 'Completed' : 'In progress'}
        </span>
        <div className="details-description">
          <h3>Description</h3>
          <p>{task.description || 'No description added.'}</p>
        </div>
        <dl className="details-timestamps">
          <div><dt>Created</dt><dd>{formatTimestamp(task.createdAt)}</dd></div>
          <div><dt>Last updated</dt><dd>{formatTimestamp(task.updatedAt)}</dd></div>
        </dl>
        <div className="modal__actions">
          <button className="button button--secondary" onClick={onClose} type="button">Close</button>
          <button className="button button--primary" disabled={busy} onClick={() => onEdit(task)} type="button">Edit task</button>
        </div>
      </section>
    </div>
  )
}
