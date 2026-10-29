export const initials = (s: string) =>
  s
    .replace(/@.*/, '')
    .split(/[.\s_-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join('') || 'U'

/** "lakshay.pandit@gmail.com" → "Lakshay Pandit" (or the saved name, if any). */
export const displayName = (email: string, name?: string) =>
  name ||
  email
    .replace(/@.*/, '')
    .split(/[._-]+/)
    .filter(Boolean)
    .map((p) => p[0]!.toUpperCase() + p.slice(1))
    .join(' ')
