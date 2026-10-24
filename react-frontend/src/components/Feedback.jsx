export default function Feedback({ feedback, onDismiss }) {
  if (!feedback) return null

  return (
    <div
      className={`feedback feedback--${feedback.type}`}
      role={feedback.type === 'error' ? 'alert' : 'status'}
    >
      <span>{feedback.message}</span>
      <div className="feedback__actions">
        {feedback.retry && (
          <button className="text-button" onClick={feedback.retry} type="button">
            Try again
          </button>
        )}
        <button
          aria-label="Dismiss notification"
          className="icon-button feedback__dismiss"
          onClick={onDismiss}
          type="button"
        >
          ×
        </button>
      </div>
    </div>
  )
}
