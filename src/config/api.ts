const DEFAULT_DEV_API_BASE_URL = 'https://localhost:44356'

export function getApiBaseUrl(): string {
  const envValue = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim() ?? ''
  if (import.meta.env.MODE === 'development') {
    return envValue || DEFAULT_DEV_API_BASE_URL
  }
  // Для production-сборки оставляем относительный путь, если явно не указано иное.
  return envValue
}
