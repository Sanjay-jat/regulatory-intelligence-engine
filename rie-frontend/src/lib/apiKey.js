const KEY = 'gemini_api_key'
const TIME = 'gemini_api_key_saved_at'
const TTL_MS = 60 * 60 * 1000

export function clearKey() {
  sessionStorage.removeItem(KEY)
  sessionStorage.removeItem(TIME)
}

export function getKey() {
  localStorage.removeItem(KEY)
  localStorage.removeItem(TIME)
  const key = sessionStorage.getItem(KEY)
  const savedAt = Number(sessionStorage.getItem(TIME))
  if (!key || Date.now() - savedAt > TTL_MS) {
    clearKey()
    return ''
  }
  return key
}

export function saveKey(key) {
  sessionStorage.setItem(KEY, key)
  sessionStorage.setItem(TIME, Date.now().toString())
}