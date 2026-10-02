import { useState } from 'react'
import { useDeleteNote, useNotes } from '@/api'
import type { Note } from '@/api/types'
import { QueryError } from '@/components/QueryError'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { formatDateTime } from '@/lib/format'
import { getErrorMessage } from '@/lib/errors'
import { NoteForm } from './NoteForm'

function NoteItem({ note, patientId }: { note: Note; patientId: string }) {
  const deleteNote = useDeleteNote(patientId)
  const [confirming, setConfirming] = useState(false)

  return (
    <li className="space-y-1 border-t pt-3 first:border-t-0 first:pt-0">
      <div className="flex items-center justify-between gap-2">
        <time dateTime={note.timestamp} className="text-xs font-medium text-muted-foreground">
          {formatDateTime(note.timestamp)}
        </time>
        {confirming ? (
          <span className="flex items-center gap-1">
            <Button
              variant="destructive"
              size="xs"
              disabled={deleteNote.isPending}
              onClick={() => deleteNote.mutate(note.id, { onSettled: () => setConfirming(false) })}
            >
              Confirm delete
            </Button>
            <Button variant="ghost" size="xs" onClick={() => setConfirming(false)}>
              Cancel
            </Button>
          </span>
        ) : (
          <Button
            variant="ghost"
            size="xs"
            aria-label={`Delete note from ${formatDateTime(note.timestamp)}`}
            onClick={() => setConfirming(true)}
          >
            Delete
          </Button>
        )}
      </div>
      {/* Plain text only: React escapes it, whitespace-pre-wrap keeps line breaks. */}
      <p className="text-sm whitespace-pre-wrap">{note.content}</p>
      {deleteNote.isError && (
        <p role="alert" className="text-xs text-destructive">
          {getErrorMessage(deleteNote.error)}
        </p>
      )}
    </li>
  )
}

export function PatientNotes({ patientId }: { patientId: string }) {
  const { data, isPending, isError, error, refetch } = useNotes(patientId)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Notes</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <NoteForm patientId={patientId} />
        {isPending ? (
          <div data-testid="notes-skeleton" className="space-y-2">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : isError ? (
          <QueryError error={error} onRetry={() => refetch()} />
        ) : data.items.length === 0 ? (
          <p className="text-sm text-muted-foreground">No notes yet</p>
        ) : (
          <ul className="space-y-3">
            {data.items.map((note) => (
              <NoteItem key={note.id} note={note} patientId={patientId} />
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
