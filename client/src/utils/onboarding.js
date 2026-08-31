const storageKey = (userId) => `onboarding-done:${userId}`

export const isOnboardingDone = (userId) => {
  if (!userId) return true
  try {
    return localStorage.getItem(storageKey(userId)) === '1'
  } catch {
    return true
  }
}

export const markOnboardingDone = (userId) => {
  if (!userId) return
  try {
    localStorage.setItem(storageKey(userId), '1')
  } catch {
    /* ignore quota */
  }
}
