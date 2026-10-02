export const PATIENT_STATUSES = ['active', 'inactive', 'critical'] as const
export type PatientStatus = (typeof PATIENT_STATUSES)[number]

export const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] as const
export type BloodType = (typeof BLOOD_TYPES)[number]

export interface Patient {
  id: string
  first_name: string
  last_name: string
  date_of_birth: string
  age: number
  email: string | null
  phone: string | null
  address_line1: string | null
  address_line2: string | null
  city: string | null
  state: string | null
  postal_code: string | null
  blood_type: BloodType | null
  allergies: string[]
  conditions: string[]
  status: PatientStatus
  last_visit: string | null
  created_at: string
  updated_at: string
}

/** Body for POST/PUT /patients. */
export interface PatientInput {
  first_name: string
  last_name: string
  date_of_birth: string
  email: string | null
  phone: string | null
  address_line1: string | null
  address_line2: string | null
  city: string | null
  state: string | null
  postal_code: string | null
  blood_type: BloodType | null
  allergies: string[]
  conditions: string[]
  status: PatientStatus
  last_visit: string | null
}

export const SORT_FIELDS = ['name', 'age', 'last_visit', 'status', 'created_at'] as const
export type SortField = (typeof SORT_FIELDS)[number]
export type SortOrder = 'asc' | 'desc'

export interface PatientListParams {
  page?: number
  page_size?: number
  search?: string
  status?: PatientStatus
  sort?: SortField
  order?: SortOrder
}

/** Row of GET /patients: only what the list shows (the full record has contact and clinical data). */
export type PatientListItem = Pick<
  Patient,
  'id' | 'first_name' | 'last_name' | 'age' | 'status' | 'last_visit'
>

export interface PatientPage {
  items: PatientListItem[]
  total: number
  page: number
  page_size: number
}

export interface Note {
  id: string
  patient_id: string
  timestamp: string
  content: string
  created_at: string
}

export interface NoteList {
  items: Note[]
  total: number
}

export interface NoteInput {
  timestamp: string
  content: string
}

export interface PatientSummary {
  patient_id: string
  name: string
  age: number
  blood_type: BloodType | null
  conditions: string[]
  allergies: string[]
  narrative: string
  note_count: number
  source: 'template' | 'llm'
  generated_at: string
}
