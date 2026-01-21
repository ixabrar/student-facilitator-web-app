/**
 * Utility functions for safe API fetching with authentication
 */

export interface FetchOptions extends RequestInit {
  includeAuth?: boolean
}

/**
 * Safe fetch with automatic Authorization header and error handling
 * @param url - API endpoint URL
 * @param options - Fetch options with optional includeAuth flag
 * @returns Parsed JSON response or fallback value
 */
export async function safeFetch<T = any>(
  url: string,
  options: FetchOptions = {}
): Promise<{ data: T | null; error: string | null; ok: boolean }> {
  try {
    const { includeAuth = true, ...fetchOptions } = options

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(fetchOptions.headers as Record<string, string> || {}),
    }

    // Add Authorization header if includeAuth is true and token exists
    if (includeAuth) {
      const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }
    }

    const response = await fetch(url, {
      ...fetchOptions,
      headers,
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      return {
        data: null,
        error: errorData.error || `HTTP ${response.status}`,
        ok: false,
      }
    }

    const data = await response.json()
    return {
      data,
      error: null,
      ok: true,
    }
  } catch (error: any) {
    return {
      data: null,
      error: error.message || 'Network error',
      ok: false,
    }
  }
}

/**
 * Safely ensure a value is an array
 * @param value - The value to check
 * @returns Array or empty array if value is not an array
 */
export function ensureArray<T = any>(value: any): T[] {
  if (Array.isArray(value)) {
    return value
  }
  return []
}
