const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'
const API_KEY = import.meta.env.VITE_API_KEY || ''

function headers(userGeminiKey) {
  const h = {
    'Content-Type': 'application/json',
    'X-API-Key': API_KEY,
  }
  if (userGeminiKey) h['X-User-Gemini-Key'] = userGeminiKey
  return h
}

async function fetchWithTimeout(url, options, timeoutMs = 100000) {
  const controller = new AbortController()
  const id = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(url, { ...options, signal: controller.signal })
  } finally {
    clearTimeout(id)
  }
}

async function handleResponse(res, fallbackMsg) {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.detail || `${fallbackMsg}: ${res.status}`)
  }
  return res.json()
}

export async function sendQuery(query, threadId, filterBody, dateFrom, dateTo, userGeminiKey) {
  const res = await fetchWithTimeout(`${BASE_URL}/api/v1/query`, {
    method: 'POST',
    headers: headers(userGeminiKey),
    body: JSON.stringify({ query, thread_id: threadId, filter_body: filterBody, date_from: dateFrom, date_to: dateTo }),
  })
  return handleResponse(res, 'Query failed')
}

export async function listThreads() {
  const res = await fetchWithTimeout(`${BASE_URL}/api/v1/threads`, {
    headers: headers(),
  })
  return handleResponse(res, 'Failed to load threads')
}

export async function getThread(threadId) {
  const res = await fetchWithTimeout(`${BASE_URL}/api/v1/threads/${threadId}`, {
    headers: headers(),
  })
  return handleResponse(res, 'Failed to load thread')
}

export async function deleteThread(threadId) {
  const res = await fetchWithTimeout(`${BASE_URL}/api/v1/threads/${threadId}`, {
    method: 'DELETE',
    headers: headers(),
  })
  return handleResponse(res, 'Failed to delete thread')
}