import { ArrowDownIcon, ArrowUpIcon, Loader2Icon } from 'lucide-react'
import { PATIENT_STATUSES, type PatientStatus } from '@/api/types'
import { Button } from '@/components/ui/button'
import { NativeSelect } from '@/components/ui/native-select'
import { capitalize } from '@/lib/format'
import { SearchInput } from './SearchInput'
import { LIST_SORT_FIELDS, type ListParams } from './useListParams'

const SORT_LABELS: Record<(typeof LIST_SORT_FIELDS)[number], string> = {
  name: 'Name',
  age: 'Age',
  last_visit: 'Last visit',
  status: 'Status',
}

interface PatientsToolbarProps {
  params: ListParams
  updating: boolean
  onChange: (patch: Partial<ListParams>, options?: { replace?: boolean }) => void
}

export function PatientsToolbar({ params, updating, onChange }: PatientsToolbarProps) {
  return (
    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
      <div className="sm:w-72">
        <SearchInput
          value={params.search}
          onSearch={(search) => onChange({ search }, { replace: true })}
        />
      </div>
      <NativeSelect
        aria-label="Filter by status"
        className="sm:w-40"
        value={params.status ?? ''}
        onChange={(e) =>
          onChange({ status: (e.target.value || undefined) as PatientStatus | undefined })
        }
      >
        <option value="">All statuses</option>
        {PATIENT_STATUSES.map((s) => (
          <option key={s} value={s}>
            {capitalize(s)}
          </option>
        ))}
      </NativeSelect>
      {/* Column headers sort on wide screens; this control covers the card layout. */}
      <div className="flex gap-2 md:hidden">
        <NativeSelect
          aria-label="Sort by"
          value={params.sort}
          onChange={(e) => onChange({ sort: e.target.value as ListParams['sort'] })}
        >
          {LIST_SORT_FIELDS.map((f) => (
            <option key={f} value={f}>
              Sort: {SORT_LABELS[f]}
            </option>
          ))}
        </NativeSelect>
        <Button
          variant="outline"
          size="icon"
          aria-label={params.order === 'asc' ? 'Ascending' : 'Descending'}
          onClick={() => onChange({ order: params.order === 'asc' ? 'desc' : 'asc' })}
        >
          {params.order === 'asc' ? <ArrowUpIcon /> : <ArrowDownIcon />}
        </Button>
      </div>
      <p
        role="status"
        aria-live="polite"
        className="flex items-center gap-1.5 text-sm text-muted-foreground sm:ml-auto"
      >
        {updating && (
          <>
            <Loader2Icon className="size-3.5 animate-spin" />
            Updating…
          </>
        )}
      </p>
    </div>
  )
}
