import { http, HttpResponse } from 'msw'
import { makePage, makePatient, makeSummary } from './fixtures'

export const API = 'http://localhost:8000'

/** A small fixed data set served by the default handlers. */
export const defaultPatients = [
  makePatient({ first_name: 'Alpha', last_name: 'Tester', status: 'active' }),
  makePatient({ first_name: 'Bravo', last_name: 'Tester', status: 'critical', last_visit: null }),
  makePatient({ first_name: 'Charlie', last_name: 'Tester', status: 'inactive' }),
]

/**
 * Happy-path defaults so components render without per-test setup.
 * Override per test with `server.use(...)`; overrides are reset after each test.
 */
export const handlers = [
  http.get(`${API}/patients`, () => HttpResponse.json(makePage(defaultPatients))),
  http.get(`${API}/patients/:id`, ({ params }) => {
    const patient = defaultPatients.find((p) => p.id === params.id)
    return patient
      ? HttpResponse.json(patient)
      : HttpResponse.json({ detail: 'Patient not found' }, { status: 404 })
  }),
  http.get(`${API}/patients/:id/notes`, () => HttpResponse.json({ items: [], total: 0 })),
  http.get(`${API}/patients/:id/summary`, ({ params }) =>
    HttpResponse.json(makeSummary({ patient_id: String(params.id) })),
  ),
]
