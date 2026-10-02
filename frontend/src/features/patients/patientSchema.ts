import { z } from 'zod'
import { BLOOD_TYPES, PATIENT_STATUSES, type Patient, type PatientInput } from '@/api/types'

// These rules mirror the Pydantic validation in backend/app/schemas/patient.py.
const MIN_DOB = '1900-01-01'
const PHONE_RE = /^[\d\s+\-().]{7,32}$/
// The user's local date; the server allows one day of slack so any timezone works.
const today = () => {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

const optionalText = (max: number) =>
  z.string().trim().max(max, `Must be ${max} characters or fewer`)

const nameField = (label: string) =>
  z.string().trim().min(1, `${label} is required`).max(100, 'Must be 100 characters or fewer')

const listField = z
  .array(z.string().max(100, 'Each entry must be 100 characters or fewer'))
  .max(50, 'Up to 50 entries')

export const patientSchema = z
  .object({
    first_name: nameField('First name'),
    last_name: nameField('Last name'),
    date_of_birth: z
      .string()
      .min(1, 'Date of birth is required')
      .refine((v) => v <= today(), 'Date of birth cannot be in the future')
      .refine((v) => v >= MIN_DOB, 'Date of birth must be after 1900'),
    email: z
      .string()
      .trim()
      .max(254, 'Must be 254 characters or fewer')
      .refine((v) => v === '' || z.email().safeParse(v).success, 'Enter a valid email address'),
    phone: z
      .string()
      .trim()
      .refine((v) => v === '' || PHONE_RE.test(v), 'Enter a valid phone number'),
    address_line1: optionalText(200),
    address_line2: optionalText(200),
    city: optionalText(100),
    state: optionalText(100),
    postal_code: optionalText(20),
    blood_type: z.enum([...BLOOD_TYPES, '']),
    status: z.enum(PATIENT_STATUSES),
    allergies: listField,
    conditions: listField,
    last_visit: z.string().refine((v) => v <= today(), 'Last visit cannot be in the future'),
  })
  .superRefine((values, ctx) => {
    if (values.last_visit && values.date_of_birth && values.last_visit < values.date_of_birth) {
      ctx.addIssue({
        code: 'custom',
        path: ['last_visit'],
        message: 'Last visit cannot be before date of birth',
      })
    }
  })

export type PatientFormValues = z.infer<typeof patientSchema>

export const PATIENT_FORM_FIELDS = [
  'first_name',
  'last_name',
  'date_of_birth',
  'email',
  'phone',
  'address_line1',
  'address_line2',
  'city',
  'state',
  'postal_code',
  'blood_type',
  'status',
  'allergies',
  'conditions',
  'last_visit',
] as const satisfies readonly (keyof PatientFormValues)[]

export const EMPTY_PATIENT_FORM: PatientFormValues = {
  first_name: '',
  last_name: '',
  date_of_birth: '',
  email: '',
  phone: '',
  address_line1: '',
  address_line2: '',
  city: '',
  state: '',
  postal_code: '',
  blood_type: '',
  status: 'active',
  allergies: [],
  conditions: [],
  last_visit: '',
}

export function toFormValues(patient: Patient): PatientFormValues {
  return {
    first_name: patient.first_name,
    last_name: patient.last_name,
    date_of_birth: patient.date_of_birth,
    email: patient.email ?? '',
    phone: patient.phone ?? '',
    address_line1: patient.address_line1 ?? '',
    address_line2: patient.address_line2 ?? '',
    city: patient.city ?? '',
    state: patient.state ?? '',
    postal_code: patient.postal_code ?? '',
    blood_type: patient.blood_type ?? '',
    status: patient.status,
    allergies: patient.allergies,
    conditions: patient.conditions,
    last_visit: patient.last_visit ?? '',
  }
}

const orNull = (value: string) => value.trim() || null

/** Empty optional inputs are sent as null, never as empty strings. */
export function toPayload(values: PatientFormValues): PatientInput {
  return {
    first_name: values.first_name.trim(),
    last_name: values.last_name.trim(),
    date_of_birth: values.date_of_birth,
    email: orNull(values.email),
    phone: orNull(values.phone),
    address_line1: orNull(values.address_line1),
    address_line2: orNull(values.address_line2),
    city: orNull(values.city),
    state: orNull(values.state),
    postal_code: orNull(values.postal_code),
    blood_type: values.blood_type || null,
    status: values.status,
    allergies: values.allergies,
    conditions: values.conditions,
    last_visit: orNull(values.last_visit),
  }
}
