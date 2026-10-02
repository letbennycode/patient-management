import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { useCreateNote } from '@/api'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { applyServerErrors } from '@/lib/formErrors'
import { type NoteFormValues, noteSchema, toLocalInputValue } from './noteSchema'

const MAX_LENGTH = 5000

const now = () => new Date()

// A blank note stamped with the current time (editable, to allow backdating).
const newNoteValues = (): NoteFormValues => ({
  content: '',
  timestamp: toLocalInputValue(now()),
})

export function NoteForm({ patientId }: { patientId: string }) {
  const createNote = useCreateNote(patientId)
  const [initialValues] = useState(() => newNoteValues())
  const [formError, setFormError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    reset,
    setError,
    control,
    formState: { errors, dirtyFields },
  } = useForm<NoteFormValues>({
    resolver: zodResolver(noteSchema),
    defaultValues: initialValues,
  })
  const length = useWatch({ control, name: 'content' }).length

  const onSubmit = handleSubmit((values) => {
    setFormError(null)
    // Untouched time means "now" at submit, not whenever the page was opened.
    const timestamp = dirtyFields.timestamp ? new Date(values.timestamp) : now()
    createNote.mutate(
      { content: values.content, timestamp: timestamp.toISOString() },
      {
        onSuccess: () => reset(newNoteValues()),
        onError: (error) =>
          setFormError(applyServerErrors(error, setError, ['content', 'timestamp'])),
      },
    )
  })

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-3">
      <div className="space-y-1.5">
        <Label htmlFor="note-content">New note</Label>
        <Textarea
          id="note-content"
          rows={3}
          aria-invalid={Boolean(errors.content)}
          aria-describedby="note-content-help"
          {...register('content')}
        />
        <div id="note-content-help" className="flex justify-between gap-2 text-xs">
          <span role={errors.content ? 'alert' : undefined} className="text-destructive">
            {errors.content?.message}
          </span>
          <span className={length > MAX_LENGTH ? 'text-destructive' : 'text-muted-foreground'}>
            {length}/{MAX_LENGTH}
          </span>
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="note-time">Time</Label>
        <Input
          id="note-time"
          type="datetime-local"
          className="sm:w-64"
          aria-invalid={Boolean(errors.timestamp)}
          {...register('timestamp')}
        />
        {errors.timestamp && (
          <p role="alert" className="text-xs text-destructive">
            {errors.timestamp.message}
          </p>
        )}
      </div>
      {formError && (
        <Alert variant="destructive">
          <AlertDescription>{formError}</AlertDescription>
        </Alert>
      )}
      <Button type="submit" disabled={createNote.isPending}>
        {createNote.isPending ? 'Adding…' : 'Add note'}
      </Button>
    </form>
  )
}
