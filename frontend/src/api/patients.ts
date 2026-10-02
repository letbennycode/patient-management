import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { request } from './client'
import { summaryKeys } from './notes'
import type { Patient, PatientInput, PatientListParams, PatientPage } from './types'

export const patientKeys = {
  all: ['patients'] as const,
  lists: () => [...patientKeys.all, 'list'] as const,
  list: (params: PatientListParams) => [...patientKeys.lists(), params] as const,
  detail: (id: string) => [...patientKeys.all, 'detail', id] as const,
}

function toQueryString(params: PatientListParams): string {
  const query = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') query.set(key, String(value))
  }
  const qs = query.toString()
  return qs ? `?${qs}` : ''
}

export function usePatients(params: PatientListParams) {
  return useQuery({
    queryKey: patientKeys.list(params),
    queryFn: () => request<PatientPage>(`/patients${toQueryString(params)}`),
    placeholderData: keepPreviousData,
  })
}

export function usePatient(id: string | undefined) {
  return useQuery({
    queryKey: patientKeys.detail(id ?? ''),
    queryFn: () => request<Patient>(`/patients/${id}`),
    enabled: Boolean(id),
  })
}

export function useCreatePatient() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: PatientInput) =>
      request<Patient>('/patients', { method: 'POST', body: JSON.stringify(input) }),
    onSuccess: (patient) => {
      queryClient.setQueryData(patientKeys.detail(patient.id), patient)
      return queryClient.invalidateQueries({ queryKey: patientKeys.lists() })
    },
  })
}

export function useUpdatePatient(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: PatientInput) =>
      request<Patient>(`/patients/${id}`, { method: 'PUT', body: JSON.stringify(input) }),
    onSuccess: (patient) => {
      queryClient.setQueryData(patientKeys.detail(id), patient)
      // The summary embeds profile data, so it is stale after an edit too.
      queryClient.invalidateQueries({ queryKey: summaryKeys.detail(id) })
      return queryClient.invalidateQueries({ queryKey: patientKeys.lists() })
    },
  })
}

export function useDeletePatient(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => request<null>(`/patients/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: patientKeys.detail(id) })
      return queryClient.invalidateQueries({ queryKey: patientKeys.lists() })
    },
  })
}
