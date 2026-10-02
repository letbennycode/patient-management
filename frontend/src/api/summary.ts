import { useQuery } from '@tanstack/react-query'
import { request } from './client'
import { summaryKeys } from './notes'
import type { PatientSummary } from './types'

export function usePatientSummary(patientId: string) {
  return useQuery({
    queryKey: summaryKeys.detail(patientId),
    queryFn: () => request<PatientSummary>(`/patients/${patientId}/summary`),
    // Each fetch can call the LLM, so only refetch on invalidation or "Regenerate".
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  })
}
