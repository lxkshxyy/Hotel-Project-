import { admin, Fail } from './server.ts'

/** The caller's agency and role, or a clear error. */
export async function agencyOf(userId: string) {
  const { data } = await admin().from('agent_members').select('role, agents(id, status, credit_limit, data)').eq('user_id', userId).maybeSingle()
  const a = data?.agents as unknown as { id: string; status: string; credit_limit: number; data: Record<string, unknown> } | null
  if (!a) throw new Fail(403, 'This login isn’t linked to an agency.')
  return { agency: a, role: data!.role as 'Admin' | 'Agent' }
}
