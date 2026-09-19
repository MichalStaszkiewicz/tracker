import { useEffect, useMemo, useState } from 'react'
import { api } from '@/api'
import { BoardCard } from '@/components/BoardCard'
import { Icon } from '@/components/Icon'
import { Menu, type MenuItem } from '@/components/Menu'
import { ScreenHeader } from '@/components/ScreenHeader'
import { useBoard, useBoardTypes } from '@/hooks/useBoard'
import { useAreas } from '@/hooks/useAreas'
import { useTags } from '@/hooks/useLookups'
import { useT } from '@/i18n'
import { filterTasks } from '@/lib/task-view'

export function Board() {
  const { t } = useT()
  const types = useBoardTypes()
  const [typeId, setTypeId] = useState<number | null>(null)
  useEffect(() => {
    if (typeId === null && types.length > 0) setTypeId(types[0].id)
  }, [types, typeId])

  const { view, refetch } = useBoard(typeId)
  const areas = useAreas()
  const { tags } = useTags()
  const [areaId, setAreaId] = useState<number | undefined>()
  const [tagId, setTagId] = useState<number | undefined>()
  const [overStage, setOverStage] = useState<number | null>(null)

  const cards = useMemo(() => filterTasks(view.cards, { areaId, tagId }), [view.cards, areaId, tagId])

  const move = async (id: number, stageId: number) => {
    await api.entries.setStage(id, stageId)
    await refetch()
  }

  if (types.length === 0) {
    return (
      <div className="screen">
        <div className="loading">{t('board.empty')}</div>
      </div>
    )
  }

  const activeType = types.find((ty) => ty.id === typeId)
  const activeArea = areas.find((a) => a.id === areaId)
  const activeTag = tags.find((tg) => tg.id === tagId)

  const areaItems: MenuItem[] = [
    { key: '', label: t('filter.area') },
    ...areas.map((a) => ({ key: String(a.id), label: a.name, dot: a.color }))
  ]
  const tagItems: MenuItem[] = [
    { key: '', label: t('filter.tag') },
    ...tags.map((tg) => ({ key: String(tg.id), label: `${tg.groupName}:${tg.name}` }))
  ]

  return (
    <div className="screen">
      <ScreenHeader
        eyebrow={`${cards.length} · ${activeType?.name ?? ''}`}
        title={t('nav.board')}
        actions={
          <>
            <Menu
              trigger={
                <>
                  <Icon name="cube" size={13} />
                  {activeArea ? activeArea.name : t('filter.area')}
                </>
              }
              items={areaItems}
              activeKey={areaId != null ? String(areaId) : ''}
              onSelect={(k) => setAreaId(k ? Number(k) : undefined)}
            />
            <Menu
              trigger={
                <>
                  <Icon name="hash" size={13} />
                  {activeTag ? activeTag.name : t('filter.tag')}
                </>
              }
              items={tagItems}
              activeKey={tagId != null ? String(tagId) : ''}
              onSelect={(k) => setTagId(k ? Number(k) : undefined)}
            />
          </>
        }
      />

      <div className="board__switch">
        {types.map((ty) => (
          <button
            key={ty.id}
            className={`chip${ty.id === typeId ? ' chip--active' : ''}`}
            onClick={() => setTypeId(ty.id)}
          >
            <Icon name={ty.icon} size={13} />
            {ty.name}
          </button>
        ))}
      </div>

      <div className="board__cols">
        {view.stages.map((stage) => {
          const col = cards.filter((c) => c.stage?.id === stage.id)
          return (
            <div
              key={stage.id}
              className={`bcol${overStage === stage.id ? ' bcol--over' : ''}`}
              onDragOver={(e) => {
                e.preventDefault()
                setOverStage(stage.id)
              }}
              onDragLeave={() => setOverStage((s) => (s === stage.id ? null : s))}
              onDrop={(e) => {
                e.preventDefault()
                const id = Number(e.dataTransfer.getData('text/plain'))
                setOverStage(null)
                if (id) void move(id, stage.id)
              }}
            >
              <div className="bcol__head">
                <span className="bcol__name">{stage.name}</span>
                <span className="bcol__count">{col.length}</span>
              </div>
              <div className="bcol__cards">
                {col.map((item) => (
                  <BoardCard
                    key={item.id}
                    item={item}
                    onDragStart={() => undefined}
                    onDragEnd={() => setOverStage(null)}
                  />
                ))}
                {col.length === 0 && <div className="bcol__drop">{t('board.dropHere')}</div>}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
