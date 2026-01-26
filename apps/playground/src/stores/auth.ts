import { atom, onMount } from 'nanostores'

export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
}

export interface Session {
  user: User;
  session: any;
}

export const $session = atom<Session | null>(null)
export const $isLoading = atom(true)
export const $needsSetup = atom<boolean | null>(null)
export const $error = atom<string | null>(null)

export async function checkSetupStatus() {
  try {
    const res = await fetch('/api/__admin/setup')
    if (!res.ok) throw new Error('Setup check failed')
    const data = await res.json() as any
    $needsSetup.set(!!data && !data.isSetup)
  } catch (e) {
    $error.set('Backend unreachable. Make sure the server is running.')
    $needsSetup.set(false)
  }
}

export async function fetchSession() {
  try {
    const res = await fetch('/api/auth/get-session')
    const data = await res.json() as any
    if (data && data.session) {
      $session.set(data as Session)
    } else {
      $session.set(null)
    }
  } catch (e) {
    $session.set(null)
  }
}

export async function initAuth() {
  $isLoading.set(true)
  await Promise.all([
    checkSetupStatus(),
    fetchSession()
  ])
  $isLoading.set(false)
}

onMount($session, () => {
  initAuth()
})
