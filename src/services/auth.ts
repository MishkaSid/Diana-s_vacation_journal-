const AUTH_STORAGE_KEY = 'journal_authenticated';

/** Development fallback when VITE_JOURNAL_PASSWORD is not set. */
const DEV_FALLBACK_PASSWORD = 'diana-journal';

export function getExpectedPassword(): string {
  const fromEnv = import.meta.env.VITE_JOURNAL_PASSWORD;
  if (typeof fromEnv === 'string' && fromEnv.length > 0) {
    return fromEnv;
  }
  return DEV_FALLBACK_PASSWORD;
}

export function isAuthenticated(): boolean {
  try {
    return localStorage.getItem(AUTH_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

export function setAuthenticated(value: boolean): void {
  try {
    if (value) {
      localStorage.setItem(AUTH_STORAGE_KEY, 'true');
    } else {
      localStorage.removeItem(AUTH_STORAGE_KEY);
    }
  } catch {
    // Storage may be blocked; auth will not persist across refresh.
  }
}

export function validatePassword(password: string): boolean {
  return password === getExpectedPassword();
}

export function logout(): void {
  setAuthenticated(false);
}
