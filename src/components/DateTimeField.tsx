import { formatDate, hhmm } from '../lib/dates'

type Props = {
  type: 'date' | 'time'
  value: string
  onChange: (value: string) => void
  required?: boolean
  className?: string
  'aria-label'?: string
}

/**
 * Native date/time picker showing dd/MM/yyyy or HH:mm whatever the device locale.
 * The real input sits transparent on top, so tapping it still opens the system picker
 * (and it no longer overflows its box on iOS).
 */
export function DateTimeField({ type, value, onChange, required, className = '', ...rest }: Props) {
  const text = value ? (type === 'date' ? formatDate(value) : hhmm(value)) : type === 'date' ? 'dd/mm/yyyy' : '--:--'
  return (
    <div className={`input relative flex items-center focus-within:border-sky-500 focus-within:ring-2 focus-within:ring-sky-200 dark:focus-within:ring-sky-900 ${className}`}>
      <span className={`truncate tabular-nums ${value ? '' : 'text-slate-400'}`}>{text}</span>
      <input
        type={type}
        required={required}
        value={value}
        aria-label={rest['aria-label']}
        onChange={(e) => onChange(e.target.value)}
        onClick={(e) => {
          try {
            e.currentTarget.showPicker?.()
          } catch {
            // not allowed here (e.g. already open); the native tap behaviour still applies
          }
        }}
        className="absolute inset-0 size-full cursor-pointer appearance-none opacity-0"
      />
    </div>
  )
}
