import { useState } from 'react'
import { api } from '@/api'
import { Card } from '@/components/Card'
import { Icon } from '@/components/Icon'
import { LinkRow } from '@/components/LinkRow'
import { Menu } from '@/components/Menu'
import { useAreas } from '@/hooks/useAreas'
import { useTags } from '@/hooks/useLookups'
import { useT } from '@/i18n'
import { useSettingsCtx } from '@/settings-context'
import { initialsFrom, type ProfileData } from '@shared/profile'

const SERVICES = [
  { kind: 'linkedin', icon: 'linkedin-logo', label: 'LinkedIn' },
  { kind: 'x', icon: 'x-logo', label: 'X' },
  { kind: 'github', icon: 'github-logo', label: 'GitHub' },
  { kind: 'discord', icon: 'discord-logo', label: 'Discord' },
  { kind: 'pwn', icon: 'terminal-window', label: 'pwn.college' },
  { kind: 'web', icon: 'globe', label: 'Strona' }
]
const iconForKind = (kind: string): string => SERVICES.find((s) => s.kind === kind)?.icon ?? 'link-simple'

export function Profile() {
  const { t } = useT()
  const { settings, set } = useSettingsCtx()
  const { areas } = useAreas()
  const { tags } = useTags()

  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<ProfileData>(settings.profile)

  const data = editing ? draft : settings.profile
  const initials = initialsFrom(data.name)

  const patch = (p: Partial<ProfileData>) => setDraft((d) => ({ ...d, ...p }))
  const patchLink = (id: string, p: Partial<ProfileData['links'][number]>) =>
    setDraft((d) => ({ ...d, links: d.links.map((l) => (l.id === id ? { ...l, ...p } : l)) }))
  const addLink = () =>
    setDraft((d) => ({
      ...d,
      links: [...d.links, { id: crypto.randomUUID(), kind: 'web', label: '', url: '' }]
    }))
  const removeLink = (id: string) =>
    setDraft((d) => ({ ...d, links: d.links.filter((l) => l.id !== id) }))

  const startEdit = () => {
    setDraft(settings.profile)
    setEditing(true)
  }
  const save = () => {
    set('profile', draft)
    setEditing(false)
  }

  return (
    <div className="screen profile">
      <div className="profile__head">
        <div className="avatar">{initials || <Icon name="user" size={26} />}</div>

        {editing ? (
          <div className="profile__fields">
            <input
              className="pinput pinput--lg"
              value={draft.name}
              placeholder={t('prof.name')}
              onChange={(e) => patch({ name: e.currentTarget.value })}
            />
            <input
              className="pinput"
              value={draft.headline}
              placeholder={t('prof.headline')}
              onChange={(e) => patch({ headline: e.currentTarget.value })}
            />
            <div className="profile__metaedit">
              <input
                className="pinput pinput--sm"
                value={draft.location}
                placeholder={t('prof.location')}
                onChange={(e) => patch({ location: e.currentTarget.value })}
              />
              <input
                className="pinput pinput--sm"
                value={draft.email}
                placeholder={t('prof.email')}
                onChange={(e) => patch({ email: e.currentTarget.value })}
              />
            </div>
          </div>
        ) : (
          <div className="profile__fields">
            <h1 className="profile__name">{data.name || t('prof.emptyName')}</h1>
            {data.headline && <span className="profile__headline">{data.headline}</span>}
            <div className="profile__meta">
              {data.location && (
                <span>
                  <Icon name="map-pin" size={12} />
                  {data.location}
                </span>
              )}
              {data.email && (
                <span>
                  <Icon name="envelope-simple" size={12} />
                  {data.email}
                </span>
              )}
            </div>
          </div>
        )}

        <div className="profile__actions">
          {editing ? (
            <>
              <button className="btn" onClick={() => setEditing(false)}>
                {t('prof.cancel')}
              </button>
              <button className="btn btn--accent" onClick={save}>
                {t('prof.save')}
              </button>
            </>
          ) : (
            <button className="btn btn--outline" onClick={startEdit}>
              <Icon name="pencil-simple" size={14} />
              {t('prof.edit')}
            </button>
          )}
        </div>
      </div>

      <div className="profile__grid">
        <div className="profile__col">
          <Card label={t('prof.about')}>
            {editing ? (
              <textarea
                className="pinput pinput--area"
                value={draft.bio}
                placeholder={t('prof.emptyBio')}
                onChange={(e) => patch({ bio: e.currentTarget.value })}
              />
            ) : data.bio ? (
              <p className="profile__bio">{data.bio}</p>
            ) : (
              <p className="profile__bio profile__bio--empty">{t('prof.emptyBio')}</p>
            )}
          </Card>

          <Card label={t('prof.doing')}>
            <div className="areachips">
              {areas.map((a) => (
                <span className="areachip" key={a.id}>
                  <span className="areadot" style={{ background: a.color }} />
                  {a.name}
                </span>
              ))}
            </div>
            {tags.length > 0 && (
              <div className="profile__tags">
                {tags.slice(0, 12).map((tag) => (
                  <span className="tag" key={tag.id}>
                    <span className="tag__group">{tag.groupName}:</span>
                    {tag.name}
                  </span>
                ))}
              </div>
            )}
          </Card>
        </div>

        <Card label={t('prof.links')}>
          <div className="linklist">
            {data.links.map((link) =>
              editing ? (
                <div className="linkedit" key={link.id}>
                  <Menu
                    trigger={<Icon name={iconForKind(link.kind)} size={15} />}
                    items={SERVICES.map((s) => ({ key: s.kind, label: s.label, icon: s.icon }))}
                    activeKey={link.kind}
                    onSelect={(kind) => patchLink(link.id, { kind })}
                  />
                  <input
                    className="pinput pinput--sm"
                    value={link.label}
                    placeholder={t('prof.linkLabel')}
                    onChange={(e) => patchLink(link.id, { label: e.currentTarget.value })}
                  />
                  <input
                    className="pinput pinput--sm"
                    value={link.url}
                    placeholder={t('prof.linkUrl')}
                    onChange={(e) => patchLink(link.id, { url: e.currentTarget.value })}
                  />
                  <button className="iconbtn" aria-label={t('prof.remove')} onClick={() => removeLink(link.id)}>
                    <Icon name="trash" size={14} />
                  </button>
                </div>
              ) : (
                <LinkRow
                  key={link.id}
                  icon={iconForKind(link.kind)}
                  label={link.label || link.url}
                  url={link.url}
                  onOpen={() => api.system.openExternal(link.url)}
                />
              )
            )}
          </div>
          {editing && (
            <button className="btn profile__addlink" onClick={addLink}>
              <Icon name="plus" size={14} />
              {t('prof.addLink')}
            </button>
          )}
        </Card>
      </div>
    </div>
  )
}
