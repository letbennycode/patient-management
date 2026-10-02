import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  PATIENT_STATUSES,
  type PatientListParams,
  type PatientStatus,
  type SortField,
  type SortOrder,
} from '@/api/types'

export const PAGE_SIZES = [10, 20, 50, 100] as const
export const LIST_SORT_FIELDS = [
  'name',
  'age',
  'last_visit',
  'status',
] as const satisfies readonly SortField[]

const DEFAULT_PAGE_SIZE = 20

export interface ListParams {
  page: number
  page_size: number
  search: string
  status: PatientStatus | undefined
  sort: (typeof LIST_SORT_FIELDS)[number]
  order: SortOrder
}

const DEFAULTS: ListParams = {
  page: 1,
  page_size: DEFAULT_PAGE_SIZE,
  search: '',
  status: undefined,
  sort: 'name',
  order: 'asc',
}

function parse(sp: URLSearchParams): ListParams {
  const page = Number(sp.get('page'))
  const pageSize = Number(sp.get('page_size'))
  const status = sp.get('status') as PatientStatus | null
  const sort = sp.get('sort') as ListParams['sort'] | null
  const order = sp.get('order')
  return {
    page: Number.isInteger(page) && page >= 1 ? page : DEFAULTS.page,
    page_size: (PAGE_SIZES as readonly number[]).includes(pageSize) ? pageSize : DEFAULTS.page_size,
    search: (sp.get('search') ?? '').trim().slice(0, 100),
    status: status && PATIENT_STATUSES.includes(status) ? status : undefined,
    sort: sort && LIST_SORT_FIELDS.includes(sort) ? sort : DEFAULTS.sort,
    order: order === 'desc' ? 'desc' : 'asc',
  }
}

/** List view state lives in the query string so it is shareable and survives back/forward. */
export function useListParams() {
  const [searchParams, setSearchParams] = useSearchParams()
  const params = useMemo(() => parse(searchParams), [searchParams])

  const update = useCallback(
    (patch: Partial<ListParams>, options?: { replace?: boolean }) => {
      // Any change other than paging itself goes back to the first page.
      const next: ListParams = { ...params, page: 1, ...patch }
      const sp = new URLSearchParams()
      for (const key of Object.keys(DEFAULTS) as (keyof ListParams)[]) {
        const value = next[key]
        if (value !== undefined && value !== '' && value !== DEFAULTS[key])
          sp.set(key, String(value))
      }
      setSearchParams(sp, options)
    },
    [params, setSearchParams],
  )

  const apiParams: PatientListParams = {
    page: params.page,
    page_size: params.page_size,
    search: params.search || undefined,
    status: params.status,
    sort: params.sort,
    order: params.order,
  }

  return { params, apiParams, update, search: searchParams.toString() }
}
