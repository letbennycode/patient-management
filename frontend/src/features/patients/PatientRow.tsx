import { memo } from 'react'
import { Link } from 'react-router-dom'
import type { PatientListItem } from '@/api/types'
import { StatusBadge } from '@/components/StatusBadge'
import { Card } from '@/components/ui/card'
import { formatDate, fullName } from '@/lib/format'

function Initials({ patient }: { patient: PatientListItem }) {
  return (
    <span
      aria-hidden
      className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-soft text-xs font-semibold text-brand-foreground"
    >
      {patient.first_name[0]}
      {patient.last_name[0]}
    </span>
  )
}

interface RowProps {
  patient: PatientListItem
  /** Query string of the list view, so the detail page can link back to it. */
  from: string
  index: number
  measureElement?: (el: HTMLElement | null) => void
}

export const PatientRow = memo(function PatientRow({
  patient,
  from,
  index,
  measureElement,
}: RowProps) {
  return (
    <tr
      ref={measureElement}
      data-index={index}
      aria-rowindex={index + 2}
      className="h-16 border-b border-border/70 transition-colors last:border-0 hover:bg-muted/40"
    >
      <td className="px-4 py-2 font-medium">
        <span className="flex items-center gap-3">
          <Initials patient={patient} />
          <Link
            to={`/patients/${patient.id}`}
            state={{ from }}
            className="underline-offset-4 hover:underline"
          >
            {fullName(patient)}
          </Link>
        </span>
      </td>
      <td className="px-4 py-2 text-muted-foreground tabular-nums">{patient.age}</td>
      <td className="px-4 py-2 text-muted-foreground">{formatDate(patient.last_visit)}</td>
      <td className="px-4 py-2">
        <StatusBadge status={patient.status} />
      </td>
    </tr>
  )
})

export const PatientCard = memo(function PatientCard({
  patient,
  from,
  index,
  measureElement,
}: RowProps) {
  return (
    <div ref={measureElement} data-index={index} className="pb-3">
      <Link to={`/patients/${patient.id}`} state={{ from }} className="block">
        <Card className="flex-row items-center gap-3 p-4 transition-colors hover:bg-muted/40">
          <Initials patient={patient} />
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <span className="font-medium">{fullName(patient)}</span>
              <StatusBadge status={patient.status} />
            </div>
            <p className="text-sm text-muted-foreground">
              {patient.age} years · Last visit: {formatDate(patient.last_visit)}
            </p>
          </div>
        </Card>
      </Link>
    </div>
  )
})
