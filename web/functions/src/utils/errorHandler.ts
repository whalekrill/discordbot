import { HttpsError } from 'firebase-functions/v2/https'

export function handleFunctionError(context: string, error: unknown): never {
  console.error({
    severity: 'ERROR',
    message: `Error in ${context}`,
    context,
    error:
      error instanceof Error
        ? {
            name: error.name,
            message: error.message,
            stack: error.stack,
          }
        : error,
    timestamp: new Date().toISOString(),
  })

  if (error instanceof HttpsError) {
    throw error
  }
  throw new HttpsError('internal', 'Internal server error')
}

export function handleRequestError(
  context: string,
  error: unknown,
  res: { status: (code: number) => { json: (data: { error: string }) => void } },
): void {
  console.error({
    severity: 'ERROR',
    message: `Error in ${context}`,
    context,
    error:
      error instanceof Error
        ? {
            name: error.name,
            message: error.message,
            stack: error.stack,
          }
        : error,
    timestamp: new Date().toISOString(),
  })

  res.status(500).json({ error: 'Internal server error' })
}
