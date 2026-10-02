import { ArrowDownIcon, ArrowUpIcon, ChevronsUpDownIcon } from 'lucide-react'
import type { Patient } from '@/api/types'
import { cn } from '@/lib/utils'
import { PatientCard, PatientRow } from './PatientRow'
import { LIST_SORT_FIELDS, type ListParams } from './useListParams'
import { useVirtualRows } from './useVirtualRows'

const COLUMNS: { label: string; sort?: (typeof LIST_SORT_FIELDS)[number] }[] = [
  { label: 'Name', sort: 'name' },
  { label: 'Age', sort: 'age' },
  { label: 'Last visit', sort: 'last_visit' },
  { label: 'Status', sort: 'status' },
]

interface ListProps {
  patients: Patient[]
  from: string
  dimmed: boolean
}

interface TableProps extends ListProps {
  params: ListParams
  onSort: (field: ListParams['sort']) => void
}

const CARD =
  'rounded-2xl bg-card shadow-[0_1px_2px_rgb(18_18_18/0.04)] ring-1 ring-foreground/[0.07]'
const SCROLL_BOX = 'h-[70vh] overflow-auto'

export function PatientTable({ patients, from, dimmed, params, onSort }: TableProps) {
  const { enabled, scrollRef, indexes, padTop, padBottom, measureElement } = useVirtualRows(
    patients.length,
    56,
  )

  return (
    <div
      ref={scrollRef}
      className={cn(
        'transition-opacity',
        dimmed && 'opacity-60',
        'overflow-hidden',
        CARD,
        enabled && SCROLL_BOX,
      )}
    >
      <table className="w-full text-left text-sm" aria-rowcount={patients.length + 1}>
        <thead className="sticky top-0 z-10 border-b bg-card/95 backdrop-blur">
          <tr aria-rowindex={1}>
            {COLUMNS.map(({ label, sort }) => {
              const active = sort === params.sort
              return (
                <th
                  key={label}
                  scope="col"
                  aria-sort={
                    active ? (params.order === 'asc' ? 'ascending' : 'descending') : 'none'
                  }
                  className="px-4 py-3 text-xs font-medium tracking-wider text-muted-foreground uppercase"
                >
                  {sort ? (
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 uppercase hover:text-foreground"
                      onClick={() => onSort(sort)}
                    >
                      {label}
                      {active ? (
                        params.order === 'asc' ? (
                          <ArrowUpIcon className="size-3.5" />
                        ) : (
                          <ArrowDownIcon className="size-3.5" />
                        )
                      ) : (
                        <ChevronsUpDownIcon className="size-3.5 text-muted-foreground" />
                      )}
                    </button>
                  ) : (
                    label
                  )}
                </th>
              )
            })}
          </tr>
        </thead>
        <tbody>
          {padTop > 0 && (
            <tr aria-hidden>
              <td colSpan={4} style={{ height: padTop }} />
            </tr>
          )}
          {indexes.map((i) => (
            <PatientRow
              key={patients[i].id}
              patient={patients[i]}
              from={from}
              index={i}
              measureElement={measureElement}
            />
          ))}
          {padBottom > 0 && (
            <tr aria-hidden>
              <td colSpan={4} style={{ height: padBottom }} />
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

export function PatientCards({ patients, from, dimmed }: ListProps) {
  const { enabled, scrollRef, indexes, padTop, padBottom, measureElement } = useVirtualRows(
    patients.length,
    88,
  )

  return (
    <div
      ref={scrollRef}
      className={cn('transition-opacity', dimmed && 'opacity-60', enabled && SCROLL_BOX)}
    >
      <div style={{ paddingTop: padTop, paddingBottom: padBottom }}>
        {indexes.map((i) => (
          <PatientCard
            key={patients[i].id}
            patient={patients[i]}
            from={from}
            index={i}
            measureElement={measureElement}
          />
        ))}
      </div>
    </div>
  )
}
