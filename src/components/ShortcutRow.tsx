import { useEffect, useState } from 'react'
import { useT } from '@/i18n'
import { comboFromEvent } from '@/lib/hotkeys'
import { formatCombo } from '@shared/shortcuts'

interface Props {
  label: string
  combo: string
  custom: boolean
  onRecord: (combo: string) => void
  onReset: () => void
}

const MODIFIER_ONLY = ['Control', 'Shift', 'Alt', 'Meta']

export function ShortcutRow({ label, combo, custom, onRecord, onReset }: Props) {
  const { t } = useT()
  const [recording, setRecording] = useState(false)

  useEffect(() => {
    if (!recording) return
    const onKey = (e: KeyboardEvent) => {
      if (MODIFIER_ONLY.includes(e.key)) return // czekaj na właściwy klawisz
      e.preventDefault()
      e.stopPropagation()
      if (e.key !== 'Escape') onRecord(comboFromEvent(e))
      setRecording(false)
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [recording, onRecord])

  return (
    <div className="scrow">
      <span className="scrow__label">{label}</span>
      {custom && (
        <button className="scrow__reset" aria-label={t('sc.reset')} onClick={onReset}>
          ↺
        </button>
      )}
      <button
        className={`scrow__combo scrow__combo--btn${recording ? ' scrow__combo--rec' : ''}`}
        onClick={() => setRecording((r) => !r)}
      >
        {recording ? t('sc.recording') : formatCombo(combo)}
      </button>
    </div>
  )
}
