import { useMemo, useState } from 'react'
import { api } from '@/api'
import { FilterBar } from '@/components/FilterBar'
import { Icon } from '@/components/Icon'
import { QuickAdd } from '@/components/QuickAdd'
import { ScreenHeader } from '@/components/ScreenHeader'
import { SectionHeader } from '@/components/SectionHeader'
import { SessionWidget } from '@/components/SessionWidget'
import { TaskCard } from '@/components/TaskCard'
import { useActiveSession } from '@/hooks/useActiveSession'
import { useHotkeys } from '@/hooks/useHotkeys'
import { useTags, useTypes } from '@/hooks/useLookups'
import { useTasks } from '@/hooks/useTasks'
import { useT } from '@/i18n'
import { filterTasks, groupTasks, type GroupBy } from '@/lib/task-view'
import { requestQuickAddFocus } from '@/lib/quick-add-focus'
import { useSettingsCtx } from '@/settings-context'
import { taskStatus } from '@shared/task-status'
import type { TaskFilter } from '@shared/types'

interface Props {
  areaFilter?: { id: number; name: string } | null
  onClearArea?: () => void
  onOpenEntry?: (id: number) => void
}

export function Tasks({ areaFilter, onClearArea, onOpenEntry }: Props) {
  const { t, lang } = useT()
  const [filter, setFilter] = useState<TaskFilter>('active')
  const [typeKey, setTypeKey] = useState<string | undefined>()
  const [tagId, setTagId] = useState<number | undefined>()
  const [query, setQuery] = useState('')
  const [groupBy, setGroupBy] = useState<GroupBy>('status')

  const { tasks, refetch } = useTasks(filter)
  const types = useTypes()
  const { tags, reload: reloadTags } = useTags()
  const session = useActiveSession()
  const { shortcuts } = useSettingsCtx()

  useHotkeys({ [shortcuts.session]: () => void session.toggle() })

  const filtered = useMemo(
    () => filterTasks(tasks, { areaId: areaFilter?.id, typeKey, tagId, query }),
    [tasks, areaFilter, typeKey, tagId, query]
  )
  const groups = useMemo(() => groupTasks(filtered, groupBy), [filtered, groupBy])
  const activeCount = filtered.filter((it) => taskStatus(it) !== 'done').length

  const dateLabel = new Intl.DateTimeFormat(lang === 'pl' ? 'pl-PL' : 'en-US', {
    day: 'numeric',
    month: 'long'
  }).format(new Date())

  const toggle = async (id: number) => {
    await api.entries.toggleDone(id)
    await refetch()
  }

  const add = async (line: string) => {
    // W otwartym folderze obszaru nowe zadanie dziedziczy ten obszar (zostaje widoczne).
    await api.entries.quickAdd(line, { areaId: areaFilter?.id })
    await Promise.all([refetch(), reloadTags()])
  }

  const activeTask = tasks.find((it) => it.id === session.active?.entryId) ?? null

  return (
    <div className="screen">
      <ScreenHeader
        eyebrow={t('tasks.eyebrow', { date: dateLabel, count: activeCount })}
        title={t('tasks.title')}
        actions={
          <>
            <button
              className={`btn${session.active ? ' btn--accent' : ''}`}
              onClick={() => void session.toggle()}
            >
              <Icon name={session.active ? 'pause' : 'timer'} size={14} />
              {t('tasks.session')}
              <span className="btn__kbd">⌃T</span>
            </button>
            <button className="btn btn--accent" onClick={() => requestQuickAddFocus()}>
              <Icon name="plus" size={13} />
              {t('tasks.add')}
              <span className="btn__kbd">⌃⇧␣</span>
            </button>
          </>
        }
      />

      <FilterBar
        filter={filter}
        onFilter={setFilter}
        types={types}
        tags={tags}
        typeKey={typeKey}
        tagId={tagId}
        query={query}
        groupBy={groupBy}
        onTypeKey={setTypeKey}
        onTagId={setTagId}
        onQuery={setQuery}
        onGroupBy={setGroupBy}
        areaName={areaFilter?.name ?? null}
        onClearArea={onClearArea}
      />

      <div className="list">
        {groups.map((g, i) => (
          <div key={g.key} style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
            <SectionHeader status={g.status} label={g.label ?? undefined} count={g.items.length} gap={i > 0} />
            {g.items.map((item) => (
              <TaskCard key={item.id} item={item} onToggle={toggle} onOpen={onOpenEntry} />
            ))}
          </div>
        ))}
      </div>

      <QuickAdd onSubmit={add} />

      <SessionWidget
        active={session.active}
        elapsed={session.elapsed}
        entryTitle={activeTask?.title ?? null}
        areaColor={activeTask?.area?.color ?? null}
        onStop={session.stop}
      />
    </div>
  )
}
