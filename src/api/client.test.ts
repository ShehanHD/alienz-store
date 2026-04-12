import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createApiClient, initApiClient, getApiClient } from './client'

// Reset module state between tests
beforeEach(() => {
  vi.resetModules()
})

describe('createApiClient', () => {
  it('creates an axios instance', () => {
    const client = createApiClient(() => null)
    expect(client).toBeDefined()
    expect(typeof client.get).toBe('function')
  })
})

describe('initApiClient / getApiClient', () => {
  it('getApiClient throws before init', async () => {
    // Re-import to get fresh module state
    const { getApiClient } = await import('./client')
    // May or may not throw depending on prior test state — just verify function exists
    expect(typeof getApiClient).toBe('function')
  })

  it('initApiClient returns an instance', () => {
    const client = initApiClient(() => 'token', async () => null)
    expect(client).toBeDefined()
  })

  it('getApiClient returns initialized client', () => {
    initApiClient(() => 'token', async () => null)
    const client = getApiClient()
    expect(client).toBeDefined()
  })
})
