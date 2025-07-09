export function getApiUrl(endpoint: string): string {
  return process.env.NEXT_PUBLIC_FIREBASE_FUNCTION_URL
    ? `${process.env.NEXT_PUBLIC_FIREBASE_FUNCTION_URL}/${endpoint}`
    : `/${endpoint}`
}
