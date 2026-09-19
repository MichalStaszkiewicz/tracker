import { useMemo, useState } from 'react'
import { api } from '@/api'
import { FilterBar } from '@/components/FilterBar'
import { Icon } from '@/components/Icon'
import { ScreenHeader } from '@/components/ScreenHeader'
import { SectionHeader } from '@/components/SectionHeader'
import { SessionWidget } from '@/components/SessionWidget'
import { TaskCard } from '@/components/TaskCard'
import { useActiveSession } from '@/hooks/useActiveSession'
import { useTasks } from '@/hooks/useTasks'
import { useT } from '@/i18n'
import { taskStatus } from '@shared/task-status'
import type { TaskFilter, TaskListItem, TaskStatus } from '@shared/types'

const ORDER: TaskStatus[] = ['in_progress', 'todo', 'done']

export function Tasks() {
  const { t, lang } = useT()
  const [filter, setFilter] = useState<TaskFilter>('active')
  const { tasks, refetch } = useTasks(filter)
  const session = useActiveSession()

  const groups = useMemo(() => {
    const g: Record<TaskStatus, TaskListItem[]> = { in_progress: [], todo: [], done: [] }
    for (const item of tasks) g[taskStatus(item)].push(item)
    return g
  }, [tasks])

  const activeCount = groups.in_progress.length + groups.todo.length
  const dateLabel = new Intl.DateTimeFormat(lang === 'pl' ? 'pl-PL' : 'en-US', {
    day: 'numeric',
    month: 'long'
  }).format(new Date())

  const toggle = async (id: number) => {
    await api.entries.toggleDone(id)
    await refetch()
  }

  const add = async (line: string) => {
    await api.entries.quickAdd(line)
    await refetch()
  }

  const activeTask = tasks.find((it) => it.id === session.active?.entryId) ?? null

  return (
    <div className="screen">
      <ScreenHeader
        eyebrow={t('tasks.eyebrow', { date: dateLabel, count: activeCount })}
        title={t('tasks.title')}
        actions={
          <>
            <button className="btn">
              <Icon name="timer" size={14} />
              {t('tasks.session')}
              <span className="btn__kbd">⌃T</span>
            </button>
            <button className="btn btn--accent">
              <Icon name="plus" size={13} />
              {t('tasks.add')}
              <span className="btn__kbd">⌃⇧␣</span>
            </button>
          </>
        }
      />

      <FilterBar active={filter} onChange={setFilter} />

      <div className="list">
        {ORDER.map((status, i) =>
          groups[status].length === 0 ? null : (
            <div key={status} style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
              <SectionHeader status={status} count={groups[status].length} gap={i > 0} />
              {groups[status].map((item) => (
                <TaskCard key={item.id} item={item} onToggle={toggle} />
              ))}
            </div>
          )
        )}

        <InlineAdd onAdd={add} />
      </div>

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

function InlineAdd({ onAdd }: { onAdd: (line: string) => void }) {
  const { t } = useT()
  const [value, setValue] = useState('')

  const submit = () => {
    const line = value.trim()
    if (!line) return
    onAdd(line)
    setValue('')
  }

  return (
    <div className="addrow">
      <Icon name="plus" size={14} />
      <input
        value={value}
        placeholder={t('add.placeholder')}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') submit()
        }}
      />
      <span className="addrow__hint">{t('add.hint')}</span>
    </div>
  )
}
