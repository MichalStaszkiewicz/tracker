import { useState } from 'react'
import { api } from '@/api'
import { Icon } from '@/components/Icon'
import { Menu } from '@/components/Menu'
import { TypeForm } from '@/components/TypeForm'
import { useEntry } from '@/hooks/useEntry'
import { useT } from '@/i18n'
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
  const { detail, refetch } = useEntry(id)
  const [tab, setTab] = useState<Tab>('details')
  const [newLink, setNewLink] = useState({ kind: 'url', label: '', target: '' })

  if (!detail) {
    return (
      <div className="screen">
        <div className="loading">…</div>
      </div>
    )
  }

  const commitData = async (key: string, value: unknown) => {
    await api.entries.update(id, { data: { ...detail.data, [key]: value } })
    await refetch()
  }
  const commit = async (patch: Parameters<typeof api.entries.update>[1]) => {
    await api.entries.update(id, patch)
    await refetch()
  }
  const changeStage = async (stageId: number) => {
    await api.entries.setStage(id, stageId)
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
    if ((l.kind === 'url' || l.kind === 'repo') && /^https?:\/\//i.test(l.target)) {
      api.system.openExternal(l.target)
    } else {
      api.system.openPath(l.target)
    }
  }

  const tabs: Tab[] = ['details', 'notes', 'links', 'time']

  return (
    <div className="screen detail">
      <div className="detail__head">
        <button className="iconbtn" aria-label={t('detail.back')} onClick={onClose}>
          <Icon name="arrow-left" size={16} />
        </button>
        <Icon name={detail.type.icon} size={18} />
        <input
          className="pinput pinput--lg detail__title"
          defaultValue={detail.title}
          onBlur={(e) => void commit({ title: e.currentTarget.value })}
        />
        {detail.area && (
          <span className="detail__area">
            <span className="areadot" style={{ background: detail.area.color }} />
            {detail.area.name}
          </span>
        )}
        <button className="btn btn--outline" onClick={() => void api.sessions.start(id)}>
          <Icon name="timer" size={14} />
          {t('detail.session')}
        </button>
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
          <textarea
            className="pinput pinput--area detail__notes"
            defaultValue={detail.descriptionMd}
            placeholder={t('detail.notesPlaceholder')}
            onBlur={(e) => void commit({ descriptionMd: e.currentTarget.value })}
          />
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
                onChange={(e) => setNewLink((s) => ({ ...s, label: e.currentTarget.value }))}
              />
              <input
                className="pinput pinput--sm"
                placeholder={t('detail.linkTarget')}
                value={newLink.target}
                onChange={(e) => setNewLink((s) => ({ ...s, target: e.currentTarget.value }))}
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
            <button className="btn btn--outline" onClick={() => void api.sessions.start(id)}>
              <Icon name="timer" size={14} />
              {t('detail.session')}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
