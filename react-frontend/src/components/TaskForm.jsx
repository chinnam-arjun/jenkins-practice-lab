import { useEffect, useState } from 'react'

export default function TaskForm({ task, busy, onClose, onSubmit }) {
  const [title, setTitle] = useState(task?.title ?? '')
  const [description, setDescription] = useState(task?.description ?? '')
  const [validationMessage, setValidationMessage] = useState('')

  useEffect(() => {
    function onKeyDown(event) {
      if (event.key === 'Escape' && !busy) onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [busy, onClose])

  function handleSubmit(event) {
    event.preventDefault()
    const normalizedTitle = title.trim()
    if (!normalizedTitle) {
      setValidationMessage('Enter a title before saving.')
      return
    }
    if (normalizedTitle.length > 120) {
      setValidationMessage('Titles must be 120 characters or fewer.')
      return
    }
    setValidationMessage('')
    onSubmit({ title: normalizedTitle, description })
  }

  return (
    <div className="modal-backdrop" onMouseDown={(event) => {
      if (event.target === event.currentTarget && !busy) onClose()
    }}>
      <section aria-labelledby="task-form-title" aria-modal="true" className="modal" role="dialog">
        <div className="modal__heading">
          <div>
            <p className="eyebrow">{task ? 'MAKE AN UPDATE' : 'ADD TO YOUR LIST'}</p>
            <h2 id="task-form-title">{task ? 'Edit task' : 'Create a task'}</h2>
          </div>
          <button aria-label="Close form" className="icon-button" disabled={busy} onClick={onClose} type="button">
            ×
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <label className="field">
            <span>Task title <span className="required">*</span></span>
            <input
              autoFocus
              maxLength={120}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="What needs to get done?"
              required
              value={title}
            />
            <small className="field__hint">{title.trim().length}/120 characters</small>
          </label>
          <label className="field">
            <span>Description <span className="field__optional">Optional</span></span>
            <textarea
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Add a few details to help you get started..."
              rows={4}
              value={description}
            />
          </label>
          {validationMessage && <p className="form-error" role="alert">{validationMessage}</p>}
          <div className="modal__actions">
            <button className="button button--secondary" disabled={busy} onClick={onClose} type="button">
              Cancel
            </button>
            <button className="button button--primary" disabled={busy} type="submit">
              {busy ? <><span className="spinner spinner--small" /> Saving...</> : task ? 'Save changes' : 'Create task'}
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}
