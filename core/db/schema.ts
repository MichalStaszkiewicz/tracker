import { sql } from 'drizzle-orm'
import { integer, primaryKey, sqliteTable, text, unique } from 'drizzle-orm/sqlite-core'
import type { FieldDef, ProgressMode } from '@shared/types'

export const areas = sqliteTable('areas', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  color: text('color').notNull(),
  position: integer('position').notNull().default(0)
})

export const entryTypes = sqliteTable('entry_types', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  key: text('key').notNull().unique(),
  name: text('name').notNull(),
  icon: text('icon').notNull().default(''),
  fields: text('fields', { mode: 'json' }).notNull().$type<FieldDef[]>(),
  progressMode: text('progress_mode').notNull().$type<ProgressMode>().default('none'),
  autoRetro: integer('auto_retro', { mode: 'boolean' }).notNull().default(false),
  showOnBoard: integer('show_on_board', { mode: 'boolean' }).notNull().default(false),
  template: text('template', { mode: 'json' }).notNull().$type<string[]>(),
  position: integer('position').notNull().default(0)
})

export const stages = sqliteTable('stages', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  typeId: integer('type_id')
    .notNull()
    .references(() => entryTypes.id),
  name: text('name').notNull(),
  position: integer('position').notNull().default(0),
  isDone: integer('is_done', { mode: 'boolean' }).notNull().default(false)
})

export const entries = sqliteTable('entries', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  typeId: integer('type_id')
    .notNull()
    .references(() => entryTypes.id),
  parentId: integer('parent_id'),
  areaId: integer('area_id').references(() => areas.id),
  stageId: integer('stage_id').references(() => stages.id),
  title: text('title').notNull(),
  descriptionMd: text('description_md'),
  data: text('data', { mode: 'json' }).notNull().$type<Record<string, unknown>>(),
  priority: integer('priority'),
  position: integer('position').notNull().default(0),
  plannedDate: text('planned_date'),
  dueDate: text('due_date'),
  completedAt: text('completed_at'),
  deletedAt: text('deleted_at'),
  createdAt: text('created_at')
    .notNull()
    .default(sql`(current_timestamp)`),
  updatedAt: text('updated_at')
    .notNull()
    .default(sql`(current_timestamp)`)
})

export const tags = sqliteTable(
  'tags',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    groupName: text('group_name').notNull(),
    name: text('name').notNull(),
    color: text('color')
  },
  (t) => ({ uniq: unique().on(t.groupName, t.name) })
)

export const entryTags = sqliteTable(
  'entry_tags',
  {
    entryId: integer('entry_id').notNull(),
    tagId: integer('tag_id').notNull()
  },
  (t) => ({ pk: primaryKey({ columns: [t.entryId, t.tagId] }) })
)

export const retros = sqliteTable('retros', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  entryId: integer('entry_id').notNull(),
  wentWell: text('went_well'),
  wentWrong: text('went_wrong'),
  toPractice: text('to_practice'),
  difficulty: integer('difficulty'),
  extra: text('extra', { mode: 'json' }),
  createdAt: text('created_at')
    .notNull()
    .default(sql`(current_timestamp)`)
})

export const retroSkills = sqliteTable(
  'retro_skills',
  {
    retroId: integer('retro_id').notNull(),
    tagId: integer('tag_id').notNull(),
    rating: integer('rating').notNull()
  },
  (t) => ({ pk: primaryKey({ columns: [t.retroId, t.tagId] }) })
)

export const sessions = sqliteTable('sessions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  entryId: integer('entry_id'),
  startedAt: text('started_at').notNull(),
  endedAt: text('ended_at'),
  note: text('note'),
  /** Odcinki jednej sesji (pauza/wznowienie) wskazują id pierwszego odcinka; null = sam jest grupą. */
  groupId: integer('group_id')
})

export const links = sqliteTable('links', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  entryId: integer('entry_id').notNull(),
  kind: text('kind').notNull(),
  label: text('label').notNull(),
  target: text('target').notNull()
})

export const settings = sqliteTable('settings', {
  key: text('key').primaryKey(),
  value: text('value', { mode: 'json' }).notNull()
})
