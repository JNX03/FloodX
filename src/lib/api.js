const DEFAULT_API_ORIGIN = 'https://ping-river-monitor.nothingtodo.me'
export const API_ORIGIN: string = (import.meta as any).env?.VITE_API_ORIGIN || DEFAULT_API_ORIGIN
export const API_WS_URL: string = (import.meta as any).env?.VITE_API_WS_URL || ''

export function apiUrl(path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  if (API_ORIGIN) return `${API_ORIGIN.replace(/\/$/, '')}${normalizedPath}`
  // Fallback to same-origin
  if (typeof window !== 'undefined') {
    return `${window.location.origin}${normalizedPath}`
  }
  return normalizedPath
}

export function websocketUrl(): string {
  if (API_WS_URL) return API_WS_URL
  const origin = API_ORIGIN || (typeof window !== 'undefined' ? window.location.origin : '')
  if (!origin) return '/websocket'
  const url = new URL(origin)
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:'
  url.pathname = '/websocket'
  url.search = ''
  url.hash = ''
  return url.toString()
}


