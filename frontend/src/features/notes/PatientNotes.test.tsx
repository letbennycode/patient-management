import { screen, waitFor, within } from '@testing-library/react'
import userEvent, { type UserEvent } from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import type { Note, NoteInput } from '@/api/types'
import { NETWORK_MESSAGE } from '@/lib/errors'
import { makeNote } from '@/test/fixtures'
import { API } from '@/test/handlers'
import { renderWithProviders } from '@/test/render'
import { recordRequests, server } from '@/test/server'
import { PatientNotes } from './PatientNotes'
import { toLocalInputValue } from './noteSchema'

const PATIENT_ID = '00000000-0000-4000-8000-0000000000aa'
const NOTES_URL = `${API}/patients/${PATIENT_ID}/notes`

// Built from local wall-clock times so the expected text is the same in every timezone.
const older = makeNote({
  patient_id: PATIENT_ID,
  timestamp: new Date(2026, 2, 1, 8, 5).toISOString(),
  content: 'Initial consult.',
})
const newer = makeNote({
  patient_id: PATIENT_ID,
  timestamp: new Date(2026, 2, 30, 10, 15).toISOString(),
  content: 'BP 132/84.\nContinue current plan.',
})

/** Stateful notes API: GET lists, POST adds, DELETE removes (newest first, like the API). */
function serveNotes(initial: Note[]) {
  let notes = [...initial]
  server.use(
    http.get(NOTES_URL, () => {
      const items = [...notes].sort((a, b) => b.timestamp.localeCompare(a.timestamp))
      return HttpResponse.json({ items, total: items.length })
    }),
    http.post(NOTES_URL, async ({ request }) => {
      const body = (await request.json()) as NoteInput
      const note = makeNote({ ...body, patient_id: PATIENT_ID })
      notes.push(note)
      return HttpResponse.json(note, { status: 201 })
    }),
    http.delete(`${NOTES_URL}/:noteId`, ({ params }) => {
      notes = notes.filter((n) => n.id !== params.noteId)
      return new HttpResponse(null, { status: 204 })
    }),
  )
}

function renderNotes() {
  const requests = recordRequests()
  const utils = renderWithProviders(<PatientNotes patientId={PATIENT_ID} />)
  const writes = (method: string) => requests.filter((r) => r.method === method)
  return { ...utils, writes }
}

// The sr-only suffix starts with a space inside its <span>; jsdom's name computation trims
// it ("Deletenote from …") while browsers keep it, so allow either.
const DELETE_NOTE = /^Delete\s*note from /

const textarea = () => screen.getByRole('textbox', { name: 'New note' })
const addNote = (user: UserEvent) => user.click(screen.getByRole('button', { name: 'Add note' }))

describe('PatientNotes', () => {
  it('shows a skeleton, then notes newest first with formatted timestamps', async () => {
    serveNotes([older, newer])
    renderNotes()

    expect(screen.getByTestId('notes-skeleton')).toBeInTheDocument()
    const items = await screen.findAllByRole('listitem')
    expect(items).toHaveLength(2)
    expect(within(items[0]).getByText('30 Mar 2026, 10:15')).toHaveAttribute(
      'datetime',
      newer.timestamp,
    )
    expect(items[0]).toHaveTextContent('BP 132/84.')
    expect(within(items[1]).getByText('1 Mar 2026, 08:05')).toBeInTheDocument()
  })

  it('renders note content as plain text, never as HTML', async () => {
    serveNotes([makeNote({ patient_id: PATIENT_ID, content: '<b>bold</b><img src=x>' })])
    renderNotes()

    expect(await screen.findByText('<b>bold</b><img src=x>')).toBeInTheDocument()
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
  })

  it('shows "No notes yet" when there are none', async () => {
    serveNotes([])
    renderNotes()
    expect(await screen.findByText('No notes yet')).toBeInTheDocument()
  })

  it('shows a load error with Retry', async () => {
    const user = userEvent.setup()
    serveNotes([older])
    server.use(
      http.get(
        NOTES_URL,
        () => HttpResponse.json({ detail: 'Notes unavailable' }, { status: 500 }),
        {
          once: true,
        },
      ),
    )
    renderNotes()

    expect(await screen.findByRole('alert')).toHaveTextContent('Notes unavailable')
    await user.click(screen.getByRole('button', { name: 'Retry' }))
    expect(await screen.findByText('Initial consult.')).toBeInTheDocument()
  })

  describe('adding', () => {
    it('defaults the time to now and counts characters', async () => {
      const user = userEvent.setup()
      serveNotes([])
      renderNotes()

      const time = screen.getByLabelText('Time') as HTMLInputElement
      const shown = new Date(time.value).getTime()
      expect(Math.abs(shown - Date.now())).toBeLessThan(2 * 60 * 1000)

      expect(screen.getByText('0/5000')).toBeInTheDocument()
      await user.type(textarea(), 'Hello')
      expect(screen.getByText('5/5000')).toBeInTheDocument()
    })

    it('posts content with an ISO timestamp, clears the form and shows the new note', async () => {
      const user = userEvent.setup()
      serveNotes([older])
      const { writes } = renderNotes()
      await screen.findByText('Initial consult.')

      const when = new Date(2026, 2, 15, 14, 30)
      await user.type(textarea(), 'Patient reports improved sleep.')
      const time = screen.getByLabelText('Time')
      await user.clear(time)
      await user.type(time, toLocalInputValue(when))
      await addNote(user)

      expect(await screen.findByText('Patient reports improved sleep.')).toBeInTheDocument()
      expect(writes('POST')).toHaveLength(1)
      expect(writes('POST')[0].body).toEqual({
        content: 'Patient reports improved sleep.',
        timestamp: when.toISOString(),
      })
      expect(textarea()).toHaveValue('')
      expect(screen.getAllByRole('listitem')).toHaveLength(2)
    })

    it('stamps an untouched time at submit, not when the page was opened', async () => {
      vi.useFakeTimers({ toFake: ['Date'], now: new Date(2026, 2, 15, 9, 0) })
      try {
        const user = userEvent.setup()
        serveNotes([])
        const { writes } = renderNotes()
        await user.type(textarea(), 'Written later.')

        vi.setSystemTime(new Date(2026, 2, 15, 9, 40))
        await addNote(user)

        await waitFor(() => expect(writes('POST')).toHaveLength(1))
        expect(writes('POST')[0].body).toEqual({
          content: 'Written later.',
          timestamp: new Date(2026, 2, 15, 9, 40).toISOString(),
        })
      } finally {
        vi.useRealTimers()
      }
    })

    it('empty or whitespace-only submit shows a message and sends nothing', async () => {
      const user = userEvent.setup()
      serveNotes([])
      const { writes } = renderNotes()

      await user.type(textarea(), '   ')
      await addNote(user)

      expect(await screen.findByText("Note can't be empty")).toBeInTheDocument()
      expect(writes('POST')).toHaveLength(0)
    })

    it('rejects a time in the future', async () => {
      const user = userEvent.setup()
      serveNotes([])
      const { writes } = renderNotes()

      await user.type(textarea(), 'From the future')
      const time = screen.getByLabelText('Time')
      await user.clear(time)
      await user.type(time, `${new Date().getFullYear() + 1}-01-01T09:00`)
      await addNote(user)

      expect(await screen.findByText("Time can't be in the future")).toBeInTheDocument()
      expect(writes('POST')).toHaveLength(0)
    })

    it('shows a server 422 on the content field', async () => {
      const user = userEvent.setup()
      serveNotes([])
      server.use(
        http.post(NOTES_URL, () =>
          HttpResponse.json(
            { detail: [{ loc: ['body', 'content'], msg: 'Content is not allowed' }] },
            { status: 422 },
          ),
        ),
      )
      renderNotes()

      await user.type(textarea(), 'Something')
      await addNote(user)

      expect(await screen.findByText('Content is not allowed')).toBeInTheDocument()
      expect(textarea()).toHaveValue('Something')
      expect(textarea()).toBeInvalid()
    })

    it('shows a connection message on network failure and keeps the text', async () => {
      const user = userEvent.setup()
      serveNotes([])
      server.use(http.post(NOTES_URL, () => HttpResponse.error()))
      renderNotes()

      await user.type(textarea(), 'Keep me')
      await addNote(user)

      expect(await screen.findByText(NETWORK_MESSAGE)).toBeInTheDocument()
      expect(textarea()).toHaveValue('Keep me')
    })
  })

  describe('deleting', () => {
    it('Cancel on the confirm step does nothing', async () => {
      const user = userEvent.setup()
      serveNotes([older])
      const { writes } = renderNotes()

      await user.click(await screen.findByRole('button', { name: DELETE_NOTE }))
      await user.click(screen.getByRole('button', { name: 'Cancel' }))

      expect(screen.getByText('Initial consult.')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: DELETE_NOTE })).toBeInTheDocument()
      expect(writes('DELETE')).toHaveLength(0)
    })

    it('confirm sends DELETE and removes the note', async () => {
      const user = userEvent.setup()
      serveNotes([older, newer])
      const { writes } = renderNotes()

      await user.click(
        await screen.findByRole('button', { name: /^Delete\s*note from 1 Mar 2026, 08:05$/ }),
      )
      await user.click(screen.getByRole('button', { name: 'Confirm delete' }))

      await waitFor(() => expect(screen.queryByText('Initial consult.')).not.toBeInTheDocument())
      expect(writes('DELETE')).toHaveLength(1)
      expect(writes('DELETE')[0].url.pathname).toBe(`/patients/${PATIENT_ID}/notes/${older.id}`)
      expect(screen.getByText(/BP 132\/84/)).toBeInTheDocument()
    })

    it('shows the error when delete fails and keeps the note', async () => {
      const user = userEvent.setup()
      serveNotes([older])
      server.use(
        http.delete(`${NOTES_URL}/:noteId`, () =>
          HttpResponse.json({ detail: 'Note not found' }, { status: 404 }),
        ),
      )
      renderNotes()

      await user.click(await screen.findByRole('button', { name: DELETE_NOTE }))
      await user.click(screen.getByRole('button', { name: 'Confirm delete' }))

      expect(await screen.findByRole('alert')).toHaveTextContent('Note not found')
      expect(screen.getByText('Initial consult.')).toBeInTheDocument()
    })
  })
})
