import { useState, useEffect, useCallback } from 'react'
import { pb } from '../api/client'
import type { Group } from '../types'

export function useGrupos() {
  const [groups, setGroups]   = useState<Group[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState(false)
  const [error, setError]     = useState<string | null>(null)

  const load = useCallback(() => {
    pb.collection('groups')
      .getFullList<Group>({ sort: 'name', requestKey: null })
      .then(setGroups)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Erro ao carregar.'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  const create = useCallback(async (data: { name: string; description: string }) => {
    setSaving(true)
    setError(null)
    try {
      const created = await pb.collection('groups').create<Group>(data)
      setGroups(prev => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)))
      return true
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao criar grupo.')
      return false
    } finally {
      setSaving(false)
    }
  }, [])

  const update = useCallback(async (id: string, data: { name: string; description: string }) => {
    setSaving(true)
    setError(null)
    try {
      const updated = await pb.collection('groups').update<Group>(id, data)
      setGroups(prev =>
        prev.map(g => g.id === updated.id ? updated : g)
           .sort((a, b) => a.name.localeCompare(b.name)),
      )
      return true
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar.')
      return false
    } finally {
      setSaving(false)
    }
  }, [])

  const remove = useCallback(async (group: Group) => {
    setError(null)
    try {
      await pb.collection('groups').delete(group.id)
      setGroups(prev => prev.filter(g => g.id !== group.id))
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao excluir.')
    }
  }, [])

  return { groups, loading, saving, error, setError, create, update, remove }
}
