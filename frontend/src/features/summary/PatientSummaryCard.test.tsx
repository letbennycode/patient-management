import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import type { PatientSummary } from '@/api/types'
import { makeSummary } from '@/test/fixtures'
import { API } from '@/test/handlers'
import { renderWithProviders } from '@/test/render'
import { recordRequests, server } from '@/test/server'
import { PatientSummaryCard } from './PatientSummaryCard'

const PATIENT_ID = '00000000-0000-4000-8000-0000000000bb'
const SUMMARY_URL = `${API}/patients/${PATIENT_ID}/summary`

function serveSummary(...summaries: PatientSummary[]) {
  let call = 0
  server.use(
    http.get(SUMMARY_URL, () =>
      HttpResponse.json(summaries[Math.min(call++, summaries.length - 1)]),
    ),
  )
}

const valueOf = (label: string) =>
  screen.getByText(label, { selector: 'dt' }).nextElementSibling as HTMLElement

describe('PatientSummaryCard', () => {
  it('shows a skeleton, then name, age, blood type, chips and the narrative', async () => {
    serveSummary(
      makeSummary({
        name: 'Hotel Sample',
        age: 52,
        blood_type: 'B-',
        conditions: ['Asthma', 'Gout'],
        allergies: [],
        narrative: 'Hotel Sample is a 52-year-old patient. No clinical notes have been recorded.',
        generated_at: new Date(2026, 2, 30, 12, 0).toISOString(),
      }),
    )
    renderWithProviders(<PatientSummaryCard patientId={PATIENT_ID} />)

    expect(screen.getByTestId('summary-skeleton')).toBeInTheDocument()
    expect(await screen.findByText(/No clinical notes have been recorded/)).toBeInTheDocument()
    expect(valueOf('Patient')).toHaveTextContent('Hotel Sample, 52')
    expect(valueOf('Blood type')).toHaveTextContent('B-')
    expect(
      within(valueOf('Conditions'))
        .getAllByRole('listitem')
        .map((li) => li.textContent),
    ).toEqual(['Asthma', 'Gout'])
    expect(valueOf('Allergies')).toHaveTextContent('None recorded')
    expect(screen.getByText('Generated 30 Mar 2026, 12:00 · template')).toBeInTheDocument()
  })

  it('shows "Unknown" blood type and labels LLM output as AI-generated', async () => {
    serveSummary(makeSummary({ blood_type: null, source: 'llm' }))
    renderWithProviders(<PatientSummaryCard patientId={PATIENT_ID} />)

    expect(await screen.findByText(/· AI-generated$/)).toBeInTheDocument()
    expect(valueOf('Blood type')).toHaveTextContent('Unknown')
  })

  it('renders the narrative as text, never as HTML', async () => {
    serveSummary(makeSummary({ narrative: '<script>alert(1)</script><em>hi</em>' }))
    renderWithProviders(<PatientSummaryCard patientId={PATIENT_ID} />)

    expect(await screen.findByText('<script>alert(1)</script><em>hi</em>')).toBeInTheDocument()
    expect(document.querySelector('em')).toBeNull()
  })

  it('Regenerate refetches and shows the new summary', async () => {
    const user = userEvent.setup()
    serveSummary(
      makeSummary({ narrative: 'First version.' }),
      makeSummary({ narrative: 'Second version.' }),
    )
    const requests = recordRequests()
    renderWithProviders(<PatientSummaryCard patientId={PATIENT_ID} />)
    await screen.findByText('First version.')

    await user.click(screen.getByRole('button', { name: 'Regenerate' }))

    expect(await screen.findByText('Second version.')).toBeInTheDocument()
    expect(requests.filter((r) => r.url.pathname.endsWith('/summary'))).toHaveLength(2)
    await waitFor(() => expect(screen.getByRole('button', { name: 'Regenerate' })).toBeEnabled())
  })

  it('shows an error with Retry on 500, and Retry recovers', async () => {
    const user = userEvent.setup()
    serveSummary(makeSummary({ narrative: 'Recovered.' }))
    server.use(
      http.get(
        SUMMARY_URL,
        () => HttpResponse.json({ detail: 'Summary failed' }, { status: 500 }),
        {
          once: true,
        },
      ),
    )
    renderWithProviders(<PatientSummaryCard patientId={PATIENT_ID} />)

    expect(await screen.findByRole('alert')).toHaveTextContent('Summary failed')
    await user.click(screen.getByRole('button', { name: 'Retry' }))
    expect(await screen.findByText('Recovered.')).toBeInTheDocument()
  })

  it('keeps the previous summary and shows the error when Regenerate fails', async () => {
    const user = userEvent.setup()
    serveSummary(makeSummary({ narrative: 'First version.' }))
    renderWithProviders(<PatientSummaryCard patientId={PATIENT_ID} />)
    await screen.findByText('First version.')
    server.use(
      http.get(SUMMARY_URL, () => HttpResponse.json({ detail: 'Summary failed' }, { status: 500 })),
    )

    await user.click(screen.getByRole('button', { name: 'Regenerate' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Summary failed')
    expect(screen.getByText('First version.')).toBeInTheDocument()
  })
})
