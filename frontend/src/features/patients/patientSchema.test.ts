import { makePatient } from '@/test/fixtures'
import {
  EMPTY_PATIENT_FORM,
  type PatientFormValues,
  patientSchema,
  toFormValues,
  toPayload,
} from './patientSchema'

const valid: PatientFormValues = {
  ...EMPTY_PATIENT_FORM,
  first_name: 'India',
  last_name: 'Sample',
  date_of_birth: '1990-05-01',
}

/** Field path → first error message, or {} when valid. */
function errorsFor(overrides: Partial<PatientFormValues>) {
  const result = patientSchema.safeParse({ ...valid, ...overrides })
  if (result.success) return {}
  const errors: Record<string, string> = {}
  for (const issue of result.error.issues) errors[issue.path.join('.')] ??= issue.message
  return errors
}

const nextYear = `${new Date().getUTCFullYear() + 1}-01-01`
const long = (n: number) => 'x'.repeat(n)

describe('patientSchema', () => {
  it('accepts a minimal valid patient', () => {
    expect(errorsFor({})).toEqual({})
  })

  it('requires names, rejecting whitespace-only', () => {
    expect(errorsFor({ first_name: '', last_name: '   ' })).toEqual({
      first_name: 'First name is required',
      last_name: 'Last name is required',
    })
  })

  it('limits names to 100 characters', () => {
    expect(errorsFor({ first_name: long(100) })).toEqual({})
    expect(errorsFor({ first_name: long(101) })).toEqual({
      first_name: 'Must be 100 characters or fewer',
    })
  })

  it.each([
    ['', 'Date of birth is required'],
    [nextYear, 'Date of birth cannot be in the future'],
    ['1899-12-31', 'Date of birth must be after 1900'],
  ])('date_of_birth %j → %s', (date_of_birth, message) => {
    expect(errorsFor({ date_of_birth })).toEqual({ date_of_birth: message })
  })

  it('accepts 1900-01-01 as the earliest date of birth', () => {
    expect(errorsFor({ date_of_birth: '1900-01-01' })).toEqual({})
  })

  it.each([
    ['', true],
    ['  kilo@example.test  ', true],
    ['not-an-email', false],
    ['kilo@', false],
  ])('email %j valid=%s', (email, ok) => {
    expect(errorsFor({ email })).toEqual(ok ? {} : { email: 'Enter a valid email address' })
  })

  it('limits email to 254 characters', () => {
    expect(errorsFor({ email: `${long(250)}@x.io` }).email).toBe('Must be 254 characters or fewer')
  })

  it.each([
    ['', true],
    ['+1 (555) 010-0000', true],
    ['555.0100', true],
    ['12345', false], // shorter than 7
    ['call me', false],
    [long(33).replace(/x/g, '1'), false], // longer than 32
  ])('phone %j valid=%s', (phone, ok) => {
    expect(errorsFor({ phone })).toEqual(ok ? {} : { phone: 'Enter a valid phone number' })
  })

  it('limits optional text fields to the backend lengths', () => {
    expect(
      errorsFor({
        address_line1: long(201),
        address_line2: long(200),
        city: long(101),
        state: long(100),
        postal_code: long(21),
      }),
    ).toEqual({
      address_line1: 'Must be 200 characters or fewer',
      city: 'Must be 100 characters or fewer',
      postal_code: 'Must be 20 characters or fewer',
    })
  })

  it('accepts only known blood types and statuses', () => {
    expect(errorsFor({ blood_type: 'AB-' })).toEqual({})
    expect(Object.keys(errorsFor({ blood_type: 'C+' as never }))).toEqual(['blood_type'])
    expect(Object.keys(errorsFor({ status: 'deceased' as never }))).toEqual(['status'])
  })

  it('limits allergies/conditions to 50 entries of up to 100 characters', () => {
    expect(errorsFor({ allergies: Array.from({ length: 50 }, (_, i) => `a${i}`) })).toEqual({})
    expect(errorsFor({ allergies: Array.from({ length: 51 }, (_, i) => `a${i}`) })).toEqual({
      allergies: 'Up to 50 entries',
    })
    expect(errorsFor({ conditions: ['ok', long(101)] })).toEqual({
      'conditions.1': 'Each entry must be 100 characters or fewer',
    })
  })

  it.each([
    ['', {}],
    ['2020-01-01', {}],
    [nextYear, { last_visit: 'Last visit cannot be in the future' }],
    ['1989-12-31', { last_visit: 'Last visit cannot be before date of birth' }],
  ])('last_visit %j', (last_visit, expected) => {
    expect(errorsFor({ last_visit })).toEqual(expected)
  })
})

describe('toPayload', () => {
  it('trims text, sends empty optionals as null and keeps arrays', () => {
    expect(
      toPayload({
        ...valid,
        first_name: '  India ',
        email: '   ',
        city: ' Mocksville ',
        allergies: ['Latex'],
      }),
    ).toEqual({
      first_name: 'India',
      last_name: 'Sample',
      date_of_birth: '1990-05-01',
      email: null,
      phone: null,
      address_line1: null,
      address_line2: null,
      city: 'Mocksville',
      state: null,
      postal_code: null,
      blood_type: null,
      status: 'active',
      allergies: ['Latex'],
      conditions: [],
      last_visit: null,
    })
  })
})

describe('toFormValues', () => {
  it('turns nulls into empty strings and round-trips through toPayload', () => {
    const patient = makePatient({ email: null, blood_type: null, last_visit: null })
    const values = toFormValues(patient)
    expect(values.email).toBe('')
    expect(values.blood_type).toBe('')
    expect(values.last_visit).toBe('')

    const payload = toPayload(values)
    expect(payload.email).toBeNull()
    expect(payload.blood_type).toBeNull()
    expect(payload.first_name).toBe(patient.first_name)
    expect(payload.allergies).toEqual(patient.allergies)
  })
})
