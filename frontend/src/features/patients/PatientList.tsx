import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { usePatients } from '@/api'
import { QueryError } from '@/components/QueryError'
import { Button, buttonVariants } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useMediaQuery } from '@/lib/useMediaQuery'
import { Pagination } from './Pagination'
import { PatientCards, PatientTable } from './PatientTable'
import { PatientsToolbar } from './PatientsToolbar'
import { useListParams } from './useListParams'

function ListSkeleton() {
  return (
    <div data-testid="list-skeleton" className="space-y-2">
      {Array.from({ length: 8 }, (_, i) => (
        <Skeleton key={i} className="h-16 w-full rounded-xl" />
      ))}
    </div>
  )
}

export function PatientList() {
  const { params, apiParams, update, linkState } = useListParams()
  const { data, isPending, isError, error, refetch, isFetching, isPlaceholderData } =
    usePatients(apiParams)
  const isWide = useMediaQuery('(min-width: 768px)', true)

  // After a delete or a shrinking filter the stored page can be past the end: step back.
  const totalPages = data ? Math.max(1, Math.ceil(data.total / params.page_size)) : 1
  useEffect(() => {
    if (data && !isPlaceholderData && params.page > totalPages)
      update({ page: totalPages }, { replace: true })
  }, [data, isPlaceholderData, params.page, totalPages, update])

  const hasFilters = Boolean(params.search || params.status)
  const updating = isFetching && !isPending

  const toggleSort = (field: typeof params.sort) =>
    update(
      field === params.sort
        ? { order: params.order === 'asc' ? 'desc' : 'asc' }
        : { sort: field, order: 'asc' },
    )

  let content
  if (isPending) {
    content = <ListSkeleton />
  } else if (isError && !data) {
    content = <QueryError error={error} onRetry={() => refetch()} />
  } else if (data.items.length === 0 && data.total === 0) {
    content = hasFilters ? (
      <div className="rounded-2xl border border-dashed bg-card/60 p-10 text-center">
        <p className="mb-4 font-heading text-2xl font-light">No patients match your search</p>
        <Button variant="outline" onClick={() => update({ search: '', status: undefined })}>
          Clear filters
        </Button>
      </div>
    ) : (
      <div className="rounded-2xl border border-dashed bg-card/60 p-10 text-center">
        <p className="mb-4 font-heading text-2xl font-light">No patients yet</p>
        <Link to="/patients/new" className={buttonVariants()}>
          New patient
        </Link>
      </div>
    )
  } else {
    content = isWide ? (
      <PatientTable
        patients={data.items}
        linkState={linkState}
        dimmed={updating}
        params={params}
        onSort={toggleSort}
      />
    ) : (
      <PatientCards patients={data.items} linkState={linkState} dimmed={updating} />
    )
  }

  return (
    <>
      <PatientsToolbar params={params} updating={updating} onChange={update} />
      {isError && data && <QueryError error={error} onRetry={() => refetch()} />}
      {content}
      {data && data.total > 0 && (
        <Pagination
          page={params.page}
          pageSize={params.page_size}
          total={data.total}
          onPageChange={(page) => update({ page })}
          onPageSizeChange={(page_size) => update({ page_size })}
        />
      )}
    </>
  )
}
