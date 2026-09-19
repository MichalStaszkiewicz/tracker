import type { ComponentType } from 'react'
import {
  ArrowElbowUpLeft, ArrowsLeftRight, Books, Briefcase, CaretDown, CaretRight,
  ChartBar, Check, CheckCircle, CheckSquare, Columns, Cube, Funnel, Gear, Hash,
  LockKey, MagnifyingGlass, Minus, Note, Pause, Play, Plus, Square, Target,
  TerminalWindow, Timer, Tray, User, WarningCircle, X, type IconProps
} from '@phosphor-icons/react'

const MAP: Record<string, ComponentType<IconProps>> = {
  'check-square': CheckSquare,
  note: Note,
  cube: Cube,
  books: Books,
  'terminal-window': TerminalWindow,
  'lock-key': LockKey,
  briefcase: Briefcase,
  tray: Tray,
  columns: Columns,
  'chart-bar': ChartBar,
  user: User,
  gear: Gear,
  'magnifying-glass': MagnifyingGlass,
  minus: Minus,
  square: Square,
  x: X,
  plus: Plus,
  timer: Timer,
  funnel: Funnel,
  hash: Hash,
  'caret-down': CaretDown,
  'caret-right': CaretRight,
  'arrow-elbow-up-left': ArrowElbowUpLeft,
  'warning-circle': WarningCircle,
  check: Check,
  'check-circle': CheckCircle,
  target: Target,
  play: Play,
  pause: Pause,
  'arrows-left-right': ArrowsLeftRight
}

export function Icon({ name, size = 15 }: { name: string; size?: number }) {
  const Cmp = MAP[name] ?? Cube
  return <Cmp size={size} weight="regular" />
}
