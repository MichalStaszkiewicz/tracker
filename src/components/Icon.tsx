import type { ComponentType } from 'react'
import {
  ArrowElbowUpLeft, ArrowsLeftRight, ArrowUpRight, Books, Briefcase, CaretDown, CaretRight,
  ChartBar, Check, CheckCircle, CheckSquare, Columns, Cube, DiscordLogo, EnvelopeSimple,
  Flame, FolderOpen, Funnel, Gear, GithubLogo, Globe, Hash, HourglassMedium, LinkedinLogo,
  LinkSimple, LockKey, MagnifyingGlass, MapPin, Minus, Note, Notebook, Pause, PencilSimple,
  Play, Plus, Square, Target, TerminalWindow, Timer, Trash, Tray, User, WarningCircle, X,
  XLogo, type IconProps
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
  'folder-open': FolderOpen,
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
  'arrows-left-right': ArrowsLeftRight,
  'arrow-up-right': ArrowUpRight,
  'linkedin-logo': LinkedinLogo,
  'x-logo': XLogo,
  'github-logo': GithubLogo,
  'discord-logo': DiscordLogo,
  'link-simple': LinkSimple,
  globe: Globe,
  'map-pin': MapPin,
  'envelope-simple': EnvelopeSimple,
  'pencil-simple': PencilSimple,
  trash: Trash,
  flame: Flame,
  hourglass: HourglassMedium,
  notebook: Notebook
}

export function Icon({ name, size = 15 }: { name: string; size?: number }) {
  const Cmp = MAP[name] ?? Cube
  return <Cmp size={size} weight="regular" />
}
