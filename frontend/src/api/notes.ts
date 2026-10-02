import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { request } from './client'
import type { Note, NoteInput, NoteList } from './types'

export const noteKeys = {
  list: (patientId: string) => ['patients', patientId, 'notes'] as const,
}

export const summaryKeys = {
  detail: (patientId: string) => ['patients', patientId, 'summary'] as const,
}

export function useNotes(patientId: string) {
  return useQuery({
    queryKey: noteKeys.list(patientId),
    queryFn: () => request<NoteList>(`/patients/${patientId}/notes`),
  })
}

function useInvalidateNotesAndSummary(patientId: string) {
  const queryClient = useQueryClient()
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: noteKeys.list(patientId) }),
      queryClient.invalidateQueries({ queryKey: summaryKeys.detail(patientId) }),
    ])
}

export function useCreateNote(patientId: string) {
  const invalidate = useInvalidateNotesAndSummary(patientId)
  return useMutation({
    mutationFn: (input: NoteInput) =>
      request<Note>(`/patients/${patientId}/notes`, {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    onSuccess: invalidate,
  })
}

export function useDeleteNote(patientId: string) {
  const invalidate = useInvalidateNotesAndSummary(patientId)
  return useMutation({
    mutationFn: (noteId: string) =>
      request<null>(`/patients/${patientId}/notes/${noteId}`, { method: 'DELETE' }),
    onSuccess: invalidate,
  })
}
