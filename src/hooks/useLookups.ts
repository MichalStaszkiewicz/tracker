import { useEffect, useState } from 'react'
import { api } from '@/api'
import type { EntryType, ParentCandidate, Tag } from '@shared/types'

export function useTypes() {
  const [types, setTypes] = useState<EntryType[]>([])
  useEffect(() => {
    void api.types.list().then(setTypes)
  }, [])
  return types
}

export function useTags() {
  const [tags, setTags] = useState<Tag[]>([])
  const reload = () => void api.tags.list().then(setTags)
  useEffect(reload, [])
  return { tags, reload }
}

export function useParents() {
  const [parents, setParents] = useState<ParentCandidate[]>([])
  const reload = () => void api.entries.parents().then(setParents)
  useEffect(reload, [])
  return { parents, reload }
}
