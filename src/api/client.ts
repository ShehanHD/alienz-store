import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios'

let _client: AxiosInstance | null = null

export function createApiClient(getToken: () => string | null): AxiosInstance {
  const client = axios.create({
    baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:8000',
    headers: { 'Content-Type': 'application/json' },
    timeout: 10000,
  })

  client.interceptors.request.use((config: InternalAxiosRequestConfig) => {
    const token = getToken()
    if (token) {
      config.headers = config.headers ?? {}
      config.headers['Authorization'] = `Bearer ${token}`
    }
    return config
  })

  return client
}

export function initApiClient(
  getToken: () => string | null,
  refresh: () => Promise<string | null>,
): AxiosInstance {
  const client = createApiClient(getToken)

  client.interceptors.response.use(
    (res) => res,
    async (error: AxiosError) => {
      const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean }
      if (error.response?.status === 401 && !original._retry) {
        original._retry = true
        const newToken = await refresh()
        if (newToken) {
          original.headers['Authorization'] = `Bearer ${newToken}`
          return client(original)
        }
      }
      return Promise.reject(error)
    },
  )

  _client = client
  return client
}

export function getApiClient(): AxiosInstance {
  if (!_client) throw new Error('API client not initialized. Call initApiClient first.')
  return _client
}
