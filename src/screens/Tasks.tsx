import { useMemo, useState } from 'react'
import { api } from '@/api'
import { FilterBar } from '@/components/FilterBar'
import { Icon } from '@/components/Icon'
import { QuickAdd } from '@/components/QuickAdd'
import { ScreenHeader } from '@/components/ScreenHeader'
import { SessionWidget } from '@/components/SessionWidget'
import { TaskCard } from '@/components/TaskCard'
import { TaskSection } from '@/components/TaskSection'
import { useActiveSession } from '@/hooks/useActiveSession'
import { useHotkeys } from '@/hooks/useHotkeys'
import { useTags, useTypes } from '@/hooks/useLookups'
import { useTaskReorder } from '@/hooks/useTaskReorder'
import { useTasks } from '@/hooks/useTasks'
import { useT } from '@/i18n'
import { weekdayDate } from '@/lib/dates'
import { filterTasks, groupTasks, type GroupBy, type TaskGroup } from '@/lib/task-view'
import { requestQuickAddFocus } from '@/lib/quick-add-focus'
import { useSettingsCtx } from '@/settings-context'
import { toDateKey } from '@shared/dates'
import { taskStatus } from '@shared/task-status'
import type { TaskFilter } from '@shared/types'

interface Props {
  areaFilter?: { id: number; name: string } | null
  onClearArea?: () => void
  onOpenEntry?: (id: number) => void
  /** Zmiana tej wartości wymusza ponowne pobranie listy (np. po drag & drop obszaru). */
  refreshToken?: number
}

export function Tasks({ areaFilter, onClearArea, onOpenEntry, refreshToken }: Props) {
  const { t, lang } = useT()
  const [filter, setFilter] = useState<TaskFilter>('active')
  const [typeKey, setTypeKey] = useState<string | undefined>()
  const [tagId, setTagId] = useState<number | undefined>()
  const [query, setQuery] = useState('')
  const [groupBy, setGroupBy] = useState<GroupBy>('status')

  const { tasks, refetch } = useTasks(filter, refreshToken)
  const types = useTypes()
  const { tags, reload: reloadTags } = useTags()
  const session = useActiveSession()
  const { shortcuts } = useSettingsCtx()

  useHotkeys({ [shortcuts.session]: () => void session.toggle() })

  const filtered = useMemo(
    () => filterTasks(tasks, { areaId: areaFilter?.id, typeKey, tagId, query }),
    [tasks, areaFilter, typeKey, tagId, query]
  )
  // Przy grupowaniu po dacie Dziś/Jutro/Bez daty są zawsze widoczne — można na nie przeciągnąć.
  const ensureDateBuckets = groupBy === 'date' && (filter === 'active' || filter === 'today')
  const groups = useMemo(
    () => groupTasks(filtered, groupBy, { ensureDateBuckets }),
    [filtered, groupBy, ensureDateBuckets]
  )
  const reorder = useTaskReorder({ groups, onMoved: refetch })
  const activeCount = filtered.filter((it) => taskStatus(it) !== 'done').length

  const sectionLabel = (g: TaskGroup): string | undefined => {
    switch (g.date?.kind) {
      case 'overdue':
        return t('date.overdue')
      case 'today':
        return t('date.today')
      case 'tomorrow':
        return t('date.tomorrow')
      case 'day':
        return g.date.dateKey ? weekdayDate(g.date.dateKey, lang) : undefined
      case 'none':
        return t('date.none')
      case 'done':
        return undefined // nagłówek bierze etykietę statusu „zrobione"
    }
    return g.label === '—' ? t('area.none') : g.label ?? undefined
  }

  const dateLabel = new Intl.DateTimeFormat(lang === 'pl' ? 'pl-PL' : 'en-US', {
    day: 'numeric',
    month: 'long'
  }).format(new Date())

  const toggle = async (id: number) => {
    await api.entries.toggleDone(id)
    await refetch()
  }

  const add = async (line: string) => {
    // Nowe zadanie ma zostać widoczne: dziedziczy otwarty obszar, a w widoku Dziś — dzisiejszą datę.
    await api.entries.quickAdd(line, {
      areaId: areaFilter?.id,
      plannedDate: filter === 'today' ? toDateKey(new Date()) : undefined
    })
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

      <div className="list" {...reorder.listProps}>
        {groups.map((g, i) => (
          <TaskSection
            key={g.key}
            status={g.status}
            label={sectionLabel(g)}
            count={g.items.length}
            gap={i > 0}
            drop={reorder.bindSection(g)}
            emptyHint={t('list.dropHere')}
          >
            {g.items.map((item) => (
              <TaskCard
                key={item.id}
                item={item}
                onToggle={toggle}
                onOpen={onOpenEntry}
                reorder={reorder.bindCard(item, g)}
              />
            ))}
          </TaskSection>
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
