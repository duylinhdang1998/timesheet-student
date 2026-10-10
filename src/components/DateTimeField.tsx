import { useId } from 'react'
import { IonDatetime, IonDatetimeButton, IonItem, IonLabel, IonModal } from '@ionic/react'
import { maxPickDate, todayVN } from '../lib/dates'

type Kind = 'date' | 'time'

interface PickerProps {
  kind: Kind
  /** "yyyy-MM-dd" for dates, "HH:mm" for times */
  value: string
  onChange: (value: string) => void
  min?: string
  max?: string
  disabled?: boolean
}

// IonDatetime speaks ISO 8601; a time is anchored to an arbitrary day and read back from the "THH:mm" part
const toIon = (kind: Kind, value: string) => (kind === 'date' ? value : `2000-01-01T${value}`)
const fromIon = (kind: Kind, iso: string) =>
  kind === 'date' ? iso.slice(0, 10) : (/T(\d{2}:\d{2})/.exec(iso)?.[1] ?? '')

const FORMAT = {
  date: { date: { day: '2-digit', month: '2-digit', year: 'numeric' } },
  time: { time: { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' } },
} as const

/**
 * Button showing dd/MM/yyyy or HH:mm; dates default to today … 5 years ahead. tapping opens Ionic's calendar or time wheel in a small card.
 * The value only changes when "Xong" is tapped.
 */
export function DateTimePicker({ kind, value, onChange, min, max, disabled }: PickerProps) {
  const id = `dt-${useId().replace(/[^a-zA-Z0-9]/g, '')}`
  return (
    <>
      <IonDatetimeButton datetime={id} disabled={disabled} />
      <IonModal keepContentsMounted className="picker-modal">
        <IonDatetime
          id={id}
          presentation={kind}
          locale="vi-VN"
          hourCycle="h23"
          firstDayOfWeek={1}
          value={value ? toIon(kind, value) : undefined}
          min={min ?? (kind === 'date' ? todayVN() : undefined)}
          max={max ?? (kind === 'date' ? maxPickDate() : undefined)}
          formatOptions={FORMAT[kind]}
          showDefaultButtons
          doneText="Xong"
          cancelText="Huỷ"
          onIonChange={(e) => {
            const v = e.detail.value
            if (typeof v === 'string') onChange(fromIon(kind, v))
          }}
        />
      </IonModal>
    </>
  )
}

/** List row: label on the left, picker button on the right. */
export function DateTimeItem({ label, ...picker }: PickerProps & { label: string }) {
  return (
    <IonItem>
      <IonLabel>{label}</IonLabel>
      <div slot="end">
        <DateTimePicker {...picker} />
      </div>
    </IonItem>
  )
}
