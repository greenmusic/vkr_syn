const USER_KEY = 'current-user'

const readStoredUser = () => {
  try {
    return JSON.parse(localStorage.getItem(USER_KEY) || 'null')
  } catch {
    return null
  }
}

let cachedUser = readStoredUser()
let sessionPromise = null
let skipSessionCheck = false
let sessionChecked = false

const emitUserUpdated = (user) => {
  window.dispatchEvent(new CustomEvent('user-updated', { detail: user }))
}

export const getCachedUser = () => cachedUser

export const setSession = (user) => {
  cachedUser = user || null
  sessionPromise = null
  skipSessionCheck = false
  sessionChecked = true
  if (cachedUser) {
    localStorage.setItem(USER_KEY, JSON.stringify(cachedUser))
  } else {
    localStorage.removeItem(USER_KEY)
  }
  emitUserUpdated(cachedUser)
}

export const clearSession = () => {
  cachedUser = null
  sessionPromise = null
  skipSessionCheck = true
  sessionChecked = true
  localStorage.removeItem(USER_KEY)
  emitUserUpdated(null)
}

/** Подтягивает сессию по cookie. localStorage сам по себе не значит, что входа нет — так входит Bitrix24. */
export const ensureSession = async (api) => {
  if (skipSessionCheck) {
    skipSessionCheck = false
    return null
  }
  if (cachedUser && sessionChecked) return cachedUser
  if (sessionPromise) return sessionPromise

  sessionPromise = api
    .get('/me')
    .then(({ data }) => {
      cachedUser = data
      localStorage.setItem(USER_KEY, JSON.stringify(data))
      emitUserUpdated(data)
      return data
    })
    .catch(() => {
      cachedUser = null
      localStorage.removeItem(USER_KEY)
      emitUserUpdated(null)
      return null
    })
    .finally(() => {
      sessionChecked = true
      sessionPromise = null
    })

  return sessionPromise
}
