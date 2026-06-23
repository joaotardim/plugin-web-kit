import { useState, useEffect, useCallback } from 'react'
import { pb } from '../api/client'
import type { Group, UserRow } from '../types'

export function useUsuarios() {
  const [users, setUsers]     = useState<UserRow[]>([])
  const [groups, setGroups]   = useState<Group[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState<string | null>(null)
  const [error, setError]     = useState<string | null>(null)

  useEffect(() => {
    Promise.all([
      pb.collection('users').getFullList<UserRow>({ sort: 'name', requestKey: null }),
      pb.collection('groups').getFullList<Group>({ sort: 'name', requestKey: null }),
    ])
      .then(([u, g]) => { setUsers(u); setGroups(g) })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Erro ao carregar dados.'))
      .finally(() => setLoading(false))
  }, [])

  const updateGroup = useCallback(async (userId: string, groupId: string) => {
    setSaving(userId)
    setError(null)
    try {
      const updated = await pb
        .collection('users')
        .update<UserRow>(userId, { group: groupId || null })
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, group: updated.group } : u))
    } catch {
      setError('Erro ao salvar. Tente novamente.')
    } finally {
      setSaving(null)
    }
  }, [])

  return { users, groups, loading, saving, error, updateGroup }
}
