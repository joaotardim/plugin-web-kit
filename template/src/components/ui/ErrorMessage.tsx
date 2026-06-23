interface ErrorMessageProps {
  message: string | null
}

export function ErrorMessage({ message }: ErrorMessageProps) {
  if (!message) return null
  return (
    <p style={{ color: '#ef4444', marginBottom: '1rem', fontSize: '0.875rem' }}>
      {message}
    </p>
  )
}
