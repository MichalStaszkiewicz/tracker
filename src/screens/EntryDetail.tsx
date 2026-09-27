import { useState } from 'react'
import { api } from '@/api'
import { DatePicker } from '@/components/DatePicker'
import { Icon } from '@/components/Icon'
import { Menu } from '@/components/Menu'
import { TypeForm } from '@/components/TypeForm'
import { useAreas } from '@/hooks/useAreas'
import { useEntry } from '@/hooks/useEntry'
import { useTypes } from '@/hooks/useLookups'
import { useT } from '@/i18n'
import { useSessionCtx } from '@/session-context'
import type { StringKey } from '@/i18n/strings'
import { formatDuration } from '@/lib/format'
import type { Link } from '@shared/types'

type Tab = 'details' | 'notes' | 'links' | 'time'
const LINK_KINDS = ['url', 'file', 'folder', 'repo']
const iconForKind = (kind: string): string =>
  kind === 'url' ? 'globe' : kind === 'repo' ? 'github-logo' : kind === 'folder' ? 'folder-open' : 'note'

interface Props {
  id: number
  onClose: () => void
  onOpen: (id: number) => void
}

export function EntryDetail({ id, onClose, onOpen }: Props) {
  const { t } = useT()
  const session = useSessionCtx()
  const { detail, refetch } = useEntry(id)
  const types = useTypes()
  const { areas } = useAreas()
  const [tab, setTab] = useState<Tab>('details')
  const [newLink, setNewLink] = useState({ kind: 'url', label: '', target: '' })
  const [tagInput, setTagInput] = useState('')
  const [notesSaved, setNotesSaved] = useState(false)

  if (!detail) {
    return (
      <div className="screen">
        <div className="loading">…</div>
      </div>
    )
  }

  const commitData = async (key: string, value: unknown) => {
    // Wysyłamy tylko zmienione pole — repo scala z resztą (bez wyścigu o stały detail.data).
    await api.entries.update(id, { data: { [key]: value } })
    await refetch()
  }
  // Widżet sesji pokazuje tytuł i kolor obszaru zadania — po edycji tego zadania odśwież go.
  const refreshSessionIfMine = () => {
    if (session.active?.entryId === id || session.paused?.entryId === id) void session.refresh()
  }
  const commit = async (patch: Parameters<typeof api.entries.update>[1]) => {
    await api.entries.update(id, patch)
    await refetch()
    refreshSessionIfMine()
  }
  const saveNotes = async (value: string) => {
    await commit({ descriptionMd: value })
    setNotesSaved(true)
  }
  const changeStage = async (stageId: number) => {
    await api.entries.setStage(id, stageId)
    await refetch()
  }
  const changeType = async (typeId: number) => {
    await api.entries.setType(id, typeId)
    await refetch()
  }
  const changeArea = async (areaId: number | null) => {
    // Klawiaturowa/klikalna alternatywa dla drag & drop (i jedyny sposób na wyczyszczenie obszaru).
    await api.entries.update(id, { areaId })
    await refetch()
    refreshSessionIfMine()
  }
  const addTag = async () => {
    const raw = tagInput.trim()
    if (!raw) return
    // Format "grupa:nazwa" — bez dwukropka trafia do grupy "inne".
    const idx = raw.indexOf(':')
    const group = idx > 0 ? raw.slice(0, idx).trim() : 'inne'
    const name = (idx > 0 ? raw.slice(idx + 1) : raw).trim()
    if (!name) return
    await api.entries.addTag(id, group, name)
    setTagInput('')
    await refetch()
  }
  const removeTag = async (tagId: number) => {
    await api.entries.removeTag(id, tagId)
    await refetch()
  }
  const addLink = async () => {
    if (!newLink.target.trim()) return
    await api.entries.addLink(id, newLink.kind, newLink.label.trim() || newLink.target.trim(), newLink.target.trim())
    setNewLink({ kind: 'url', label: '', target: '' })
    await refetch()
  }
  const removeLink = async (linkId: number) => {
    await api.entries.removeLink(linkId)
    await refetch()
  }
  const openLink = (l: Link) => {
    if (l.kind === 'file' || l.kind === 'folder') {
      api.system.openPath(l.target)
      return
    }
    // url / repo → przeglądarka; dołóż https:// gdy brak schematu (np. "github.com/x")
    const url = /^[a-z][a-z0-9+.-]*:\/\//i.test(l.target) ? l.target : `https://${l.target}`
    api.system.openExternal(url)
  }

  const tabs: Tab[] = ['details', 'notes', 'links', 'time']

  return (
    <div className="screen detail">
      <div className="detail__head">
        <button className="iconbtn" aria-label={t('detail.back')} onClick={onClose}>
          <Icon name="arrow-left" size={16} />
        </button>
        <Menu
          ariaLabel={t('detail.changeType')}
          trigger={<Icon name={detail.type.icon} size={16} />}
          items={types.map((ty) => ({ key: String(ty.id), label: ty.name, icon: ty.icon }))}
          activeKey={String(detail.type.id)}
          onSelect={(k) => void changeType(Number(k))}
        />
        <input
          className="pinput pinput--lg detail__title"
          defaultValue={detail.title}
          onBlur={(e) => void commit({ title: e.currentTarget.value })}
        />
        <Menu
          align="right"
          ariaLabel={t('area.change')}
          trigger={
            detail.area ? (
              <>
                <span className="areadot" style={{ background: detail.area.color }} />
                {detail.area.name}
              </>
            ) : (
              <span className="detail__areanone">{t('area.none')}</span>
            )
          }
          items={[
            { key: 'none', label: t('area.none') },
            ...areas.map((a) => ({ key: String(a.id), label: a.name, dot: a.color }))
          ]}
          activeKey={detail.area ? String(detail.area.id) : 'none'}
          onSelect={(k) => void changeArea(k === 'none' ? null : Number(k))}
        />
        <DatePicker
          align="right"
          ariaLabel={t('date.pick')}
          value={detail.plannedDate}
          onChange={(v) => void commit({ plannedDate: v })}
        />
        <button className="btn btn--outline" onClick={() => void session.start(id)}>
          <Icon name="timer" size={14} />
          {t('detail.session')}
        </button>
      </div>

      <div className="detail__tags">
        {detail.tags.map((tag) => (
          <span key={tag.id} className={`tag${tag.groupName === 'skill' ? ' tag--skill' : ''}`}>
            <span className="tag__group">{tag.groupName}:</span>
            {tag.name}
            <button className="tag__x" aria-label={t('detail.removeTag')} onClick={() => void removeTag(tag.id)}>
              <Icon name="x" size={10} />
            </button>
          </span>
        ))}
        <input
          className="pinput pinput--sm detail__tagadd"
          placeholder={t('detail.addTag')}
          value={tagInput}
          onChange={(e) => setTagInput(e.currentTarget.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void addTag()
          }}
        />
      </div>

      {detail.stages.length > 0 && (
        <div className="stagepath">
          {detail.stages.map((s) => (
            <button
              key={s.id}
              className={`stagepath__step${detail.stage?.id === s.id ? ' stagepath__step--active' : ''}`}
              onClick={() => void changeStage(s.id)}
            >
              {s.isDone && <Icon name="check" size={11} />}
              {s.name}
            </button>
          ))}
        </div>
      )}

      <div className="tabs">
        {tabs.map((tb) => (
          <button
            key={tb}
            className={`tab${tb === tab ? ' tab--active' : ''}`}
            onClick={() => setTab(tb)}
          >
            {t(`detail.${tb}` as StringKey)}
            {tb === 'links' && detail.links.length > 0 && <span className="tab__count">{detail.links.length}</span>}
          </button>
        ))}
      </div>

      <div className="detail__body">
        {tab === 'details' && (
          <div className="detail__col">
            <TypeForm fields={detail.type.fields} data={detail.data} onCommit={commitData} />
            {detail.children.length > 0 && (
              <div className="detail__section">
                <div className="detail__sectionlabel">{t('detail.subtasks')}</div>
                {detail.children.map((c) => (
                  <button key={c.id} className="subrow" onClick={() => onOpen(c.id)}>
                    <span
                      className={`subrow__check${c.completedAt || c.stage?.isDone ? ' subrow__check--done' : ''}`}
                    >
                      {(c.completedAt || c.stage?.isDone) && <Icon name="check" size={10} />}
                    </span>
                    <span className="subrow__title">{c.title}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'notes' && (
          <div className="detail__noteswrap">
            <textarea
              className="pinput pinput--area detail__notes"
              defaultValue={detail.descriptionMd}
              placeholder={t('detail.notesPlaceholder')}
              onChange={() => setNotesSaved(false)}
              onBlur={(e) => void saveNotes(e.currentTarget.value)}
              onKeyDown={(e) => {
                if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
                  e.preventDefault()
                  void saveNotes(e.currentTarget.value)
                }
              }}
            />
            <div className={`detail__savehint${notesSaved ? ' detail__savehint--saved' : ''}`}>
              {notesSaved ? (
                <>
                  <Icon name="check" size={12} />
                  {t('detail.saved')}
                </>
              ) : (
                t('detail.autosaveHint')
              )}
            </div>
          </div>
        )}

        {tab === 'links' && (
          <div className="detail__col">
            <div className="linklist">
              {detail.links.map((l) => (
                <div className="linkrow2" key={l.id}>
                  <button className="linkrow2__open" onClick={() => openLink(l)}>
                    <Icon name={iconForKind(l.kind)} size={15} />
                    <span className="linkrow2__label">{l.label}</span>
                    <span className="linkrow2__target">{l.target}</span>
                  </button>
                  <button className="iconbtn" aria-label={t('prof.remove')} onClick={() => void removeLink(l.id)}>
                    <Icon name="trash" size={14} />
                  </button>
                </div>
              ))}
            </div>
            <div className="linkadd">
              <Menu
                trigger={<span>{t(`link.${newLink.kind}` as StringKey)}</span>}
                items={LINK_KINDS.map((k) => ({ key: k, label: t(`link.${k}` as StringKey) }))}
                activeKey={newLink.kind}
                onSelect={(k) => setNewLink((s) => ({ ...s, kind: k }))}
              />
              <input
                className="pinput pinput--sm"
                placeholder={t('detail.linkLabel')}
                value={newLink.label}
                onChange={(e) => {
                  // Wartość czytamy synchronicznie: currentTarget jest null, gdy React odpali updater w renderze.
                  const value = e.currentTarget.value
                  setNewLink((s) => ({ ...s, label: value }))
                }}
              />
              <input
                className="pinput pinput--sm"
                placeholder={t('detail.linkTarget')}
                value={newLink.target}
                onChange={(e) => {
                  const value = e.currentTarget.value
                  setNewLink((s) => ({ ...s, target: value }))
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void addLink()
                }}
              />
              <button className="btn btn--outline" onClick={() => void addLink()}>
                <Icon name="plus" size={13} />
                {t('detail.addLink')}
              </button>
            </div>
          </div>
        )}

        {tab === 'time' && (
          <div className="detail__col">
            <div className="detail__time">{formatDuration(detail.secondsSpent)}</div>
            <button className="btn btn--outline" onClick={() => void session.start(id)}>
              <Icon name="timer" size={14} />
              {t('detail.session')}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
