import type { Note, Patient, PatientPage, PatientSummary } from '@/api/types'

// Fake data only. Names are obviously synthetic so they can never be mistaken for PHI.

let seq = 0
const nextId = () => `00000000-0000-4000-8000-${String(++seq).padStart(12, '0')}`

export function makePatient(overrides: Partial<Patient> = {}): Patient {
  const id = overrides.id ?? nextId()
  return {
    id,
    first_name: 'Testy',
    last_name: `Patient${seq}`,
    date_of_birth: '1980-04-12',
    age: 46,
    email: 'testy@example.test',
    phone: '+1 555 0100',
    address_line1: '1 Fixture Way',
    address_line2: null,
    city: 'Mocksville',
    state: 'MS',
    postal_code: '00001',
    blood_type: 'O+',
    allergies: ['Penicillin'],
    conditions: ['Hypertension'],
    status: 'active',
    last_visit: '2026-03-05',
    created_at: '2026-01-01T09:00:00Z',
    updated_at: '2026-01-01T09:00:00Z',
    ...overrides,
  }
}

export function makePatients(count: number, overrides: Partial<Patient> = {}): Patient[] {
  return Array.from({ length: count }, (_, i) =>
    makePatient({ first_name: 'Row', last_name: `Number${i + 1}`, ...overrides }),
  )
}

/** Builds a GET /patients response: items are cut down to the list fields, like the API does. */
export function makePage(
  items: Patient[],
  { total = items.length, page = 1, page_size = 20 }: Partial<Omit<PatientPage, 'items'>> = {},
): PatientPage {
  return {
    items: items.map(({ id, first_name, last_name, age, status, last_visit }) => ({
      id,
      first_name,
      last_name,
      age,
      status,
      last_visit,
    })),
    total,
    page,
    page_size,
  }
}

export function makeNote(overrides: Partial<Note> = {}): Note {
  return {
    id: nextId(),
    patient_id: '00000000-0000-4000-8000-000000000000',
    timestamp: '2026-09-01T10:00:00Z',
    content: 'Routine follow-up, no concerns.',
    created_at: '2026-09-01T10:00:00Z',
    ...overrides,
  }
}

export function makeSummary(overrides: Partial<PatientSummary> = {}): PatientSummary {
  return {
    patient_id: '00000000-0000-4000-8000-000000000000',
    name: 'Testy Patient',
    age: 46,
    blood_type: 'O+',
    conditions: ['Hypertension'],
    allergies: ['Penicillin'],
    narrative: 'Testy Patient is a 46-year-old patient with blood type O+.',
    note_count: 0,
    source: 'template',
    generated_at: '2026-09-30T12:00:00Z',
    ...overrides,
  }
}
