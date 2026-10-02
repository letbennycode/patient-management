import { ArrowRightIcon, ArrowUpRightIcon } from 'lucide-react'
import { Link } from 'react-router-dom'
import { PATIENT_STATUSES, type PatientStatus, usePatients } from '@/api'
import { PageHeader } from '@/components/PageHeader'
import { QueryError } from '@/components/QueryError'
import { buttonVariants } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { capitalize } from '@/lib/format'
import { cn } from '@/lib/utils'

const STATUS_DOTS: Record<PatientStatus, string> = {
  active: 'bg-emerald-500',
  inactive: 'bg-stone-400',
  critical: 'bg-red-500',
}

function CountCard({ label, to, status }: { label: string; to: string; status?: PatientStatus }) {
  // page_size=1 keeps the payload tiny: only `total` is used.
  const { data, isPending, isError, refetch } = usePatients({ page_size: 1, status })
  const featured = !status
  return (
    <Link
      to={to}
      aria-label={`${label} patients`}
      className={cn(
        'group relative flex min-h-32 flex-col sm:min-h-40 justify-between overflow-hidden rounded-2xl p-5 ring-1 transition-all outline-none hover:-translate-y-0.5 hover:shadow-lg focus-visible:ring-3 focus-visible:ring-ring/60',
        featured
          ? 'col-span-2 bg-primary lg:col-span-1 text-primary-foreground ring-transparent shadow-md'
          : 'bg-card ring-foreground/[0.07] shadow-[0_1px_2px_rgb(18_18_18/0.04)]',
      )}
    >
      {featured && (
        <div
          aria-hidden
          className="pointer-events-none absolute -top-16 -right-10 size-48 rounded-full bg-brand/50 blur-3xl"
        />
      )}
      <div className="relative flex items-center justify-between">
        <span
          className={cn(
            'flex items-center gap-2 text-sm',
            featured ? 'text-primary-foreground/75' : 'text-muted-foreground',
          )}
        >
          {status && (
            <span aria-hidden className={cn('size-2 rounded-full', STATUS_DOTS[status])} />
          )}
          {label}
        </span>
        <ArrowUpRightIcon
          aria-hidden
          className="size-4 opacity-40 transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:opacity-100"
        />
      </div>
      <div className="relative">
        {isError ? (
          <button
            type="button"
            className="text-sm text-destructive underline"
            onClick={(e) => {
              e.preventDefault() // the card is a link; Retry must not navigate
              refetch()
            }}
          >
            Failed to load. Retry
          </button>
        ) : isPending ? (
          <Skeleton
            data-testid="count-skeleton"
            className={cn('h-12 w-20', featured && 'bg-primary-foreground/15')}
          />
        ) : (
          <p className="font-heading text-5xl leading-none sm:text-6xl font-light tracking-tight tabular-nums">
            {data?.total}
          </p>
        )}
      </div>
    </Link>
  )
}

export default function DashboardPage() {
  const total = usePatients({ page_size: 1 })

  return (
    <>
      <PageHeader title="Dashboard" description="An overview" />
      {total.isError ? (
        <QueryError error={total.error} onRetry={() => total.refetch()} />
      ) : total.data?.total === 0 ? (
        <div className="rounded-2xl border border-dashed bg-card/60 p-10 text-center">
          <p className="mb-4 font-heading text-2xl font-light">No patients yet</p>
          <Link to="/patients/new" className={buttonVariants({ size: 'lg' })}>
            Create the first patient
          </Link>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            <CountCard label="Total" to="/patients" />
            {PATIENT_STATUSES.map((status) => (
              <CountCard
                key={status}
                label={capitalize(status)}
                status={status}
                to={`/patients?status=${status}`}
              />
            ))}
          </div>
          <Link
            to="/patients"
            className="group mt-8 inline-flex items-center gap-1.5 text-sm font-medium text-foreground underline-offset-4 hover:underline"
          >
            View all patients
            <ArrowRightIcon
              aria-hidden
              className="size-4 transition-transform group-hover:translate-x-0.5"
            />
          </Link>
        </>
      )}
    </>
  )
}
