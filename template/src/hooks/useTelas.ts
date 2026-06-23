import { useState, useEffect, useCallback } from 'react'
import { pb } from '../api/client'
import type { Group, Screen } from '../types'

export function useTelas() {
  const [screens, setScreens] = useState<Screen[]>([])
  const [groups, setGroups]   = useState<Group[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState<string | null>(null)
  const [error, setError]     = useState<string | null>(null)

  useEffect(() => {
    Promise.all([
      pb.collection('screens').getFullList<Screen>({ sort: 'name', requestKey: null }),
      pb.collection('groups').getFullList<Group>({ sort: 'name', requestKey: null }),
    ])
      .then(([s, g]) => { setScreens(s); setGroups(g) })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Erro ao carregar dados.'))
      .finally(() => setLoading(false))
  }, [])

  const toggleGroup = useCallback(async (
    screenId: string,
    groupId: string,
    checked: boolean,
    current: string[],
  ) => {
    setSaving(screenId)
    setError(null)
    const next = checked ? [...current, groupId] : current.filter(id => id !== groupId)
    try {
      const updated = await pb
        .collection('screens')
        .update<Screen>(screenId, { groups: next }, { requestKey: null })
      setScreens(prev => prev.map(s => s.id === screenId ? { ...s, groups: updated.groups } : s))
      // Sincroniza listRule/viewRule fora da transação do registro (fire-and-forget)
      fetch(`${import.meta.env.VITE_POCKETBASE_URL}/api/screens/sync-rules`, {
        method: 'POST',
        headers: { Authorization: pb.authStore.token ?? '' },
      }).catch(() => {})
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar. Verifique as permissões da coleção "screens" no PocketBase.')
    } finally {
      setSaving(null)
    }
  }, [])

  return { screens, groups, loading, saving, error, toggleGroup }
}
