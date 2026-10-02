import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2Icon } from 'lucide-react'
import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { ApiError, useCreatePatient, useUpdatePatient } from '@/api'
import { BLOOD_TYPES, PATIENT_STATUSES, type Patient } from '@/api/types'
import { FormField } from '@/components/FormField'
import { TagInput } from '@/components/TagInput'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { NativeSelect } from '@/components/ui/native-select'
import { capitalize } from '@/lib/format'
import { applyServerErrors } from '@/lib/formErrors'
import {
  EMPTY_PATIENT_FORM,
  PATIENT_FORM_FIELDS,
  type PatientFormValues,
  patientSchema,
  toFormValues,
  toPayload,
} from './patientSchema'

type FormAlert = { message: string; gone?: boolean }

/** Create (no `patient`) or edit (with `patient`) form. */
export function PatientForm({ patient }: { patient?: Patient }) {
  const navigate = useNavigate()
  const createPatient = useCreatePatient()
  const updatePatient = useUpdatePatient(patient?.id ?? '')
  const mutation = patient ? updatePatient : createPatient
  const [alert, setAlert] = useState<FormAlert | null>(null)

  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<PatientFormValues>({
    resolver: zodResolver(patientSchema),
    defaultValues: patient ? toFormValues(patient) : EMPTY_PATIENT_FORM,
    mode: 'onBlur',
  })

  const onSubmit = handleSubmit((values) => {
    setAlert(null)
    mutation.mutate(toPayload(values), {
      onSuccess: (saved) => {
        toast.success(patient ? 'Patient updated' : 'Patient created')
        navigate(`/patients/${saved.id}`)
      },
      onError: (error) => {
        if (patient && error instanceof ApiError && error.status === 404) {
          setAlert({ message: 'This patient no longer exists', gone: true })
          return
        }
        const message = applyServerErrors(error, setError, PATIENT_FORM_FIELDS)
        if (message) setAlert({ message })
      },
    })
  })

  const field = (name: keyof PatientFormValues) => ({
    ...register(name),
    id: name,
    'aria-invalid': Boolean(errors[name]),
    'aria-describedby': errors[name] ? `${name}-error` : undefined,
  })
  const err = (name: keyof PatientFormValues) => errors[name]?.message as string | undefined

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      {alert && (
        <Alert variant="destructive">
          <AlertDescription>
            {alert.message}
            {alert.gone && (
              <>
                {' '}
                <Link to="/patients" className="underline">
                  Back to patients
                </Link>
              </>
            )}
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Personal information</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <FormField id="first_name" label="First name" required error={err('first_name')}>
            <Input autoComplete="off" {...field('first_name')} />
          </FormField>
          <FormField id="last_name" label="Last name" required error={err('last_name')}>
            <Input autoComplete="off" {...field('last_name')} />
          </FormField>
          <FormField id="date_of_birth" label="Date of birth" required error={err('date_of_birth')}>
            <Input type="date" {...field('date_of_birth')} />
          </FormField>
          <div className="hidden sm:block" />
          <FormField id="email" label="Email" error={err('email')}>
            <Input type="email" autoComplete="off" {...field('email')} />
          </FormField>
          <FormField id="phone" label="Phone" error={err('phone')}>
            <Input type="tel" autoComplete="off" {...field('phone')} />
          </FormField>
          <FormField id="address_line1" label="Address line 1" error={err('address_line1')}>
            <Input autoComplete="off" {...field('address_line1')} />
          </FormField>
          <FormField id="address_line2" label="Address line 2" error={err('address_line2')}>
            <Input autoComplete="off" {...field('address_line2')} />
          </FormField>
          <FormField id="city" label="City" error={err('city')}>
            <Input autoComplete="off" {...field('city')} />
          </FormField>
          <FormField id="state" label="State" error={err('state')}>
            <Input autoComplete="off" {...field('state')} />
          </FormField>
          <FormField id="postal_code" label="Postal code" error={err('postal_code')}>
            <Input autoComplete="off" {...field('postal_code')} />
          </FormField>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Medical information</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <FormField id="blood_type" label="Blood type" error={err('blood_type')}>
            <NativeSelect {...field('blood_type')}>
              <option value="">Unknown</option>
              {BLOOD_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </NativeSelect>
          </FormField>
          <FormField id="status" label="Status" required error={err('status')}>
            <NativeSelect {...field('status')}>
              {PATIENT_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {capitalize(s)}
                </option>
              ))}
            </NativeSelect>
          </FormField>
          <FormField id="allergies" label="Allergies" error={err('allergies')}>
            <Controller
              control={control}
              name="allergies"
              render={({ field: { value, onChange, onBlur, ref } }) => (
                <TagInput
                  ref={ref}
                  id="allergies"
                  value={value}
                  onChange={onChange}
                  onBlur={onBlur}
                  invalid={Boolean(errors.allergies)}
                />
              )}
            />
          </FormField>
          <FormField id="conditions" label="Conditions" error={err('conditions')}>
            <Controller
              control={control}
              name="conditions"
              render={({ field: { value, onChange, onBlur, ref } }) => (
                <TagInput
                  ref={ref}
                  id="conditions"
                  value={value}
                  onChange={onChange}
                  onBlur={onBlur}
                  invalid={Boolean(errors.conditions)}
                />
              )}
            />
          </FormField>
          <FormField id="last_visit" label="Last visit" error={err('last_visit')}>
            <Input type="date" {...field('last_visit')} />
          </FormField>
        </CardContent>
      </Card>

      <div className="flex gap-2">
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending && <Loader2Icon className="animate-spin" />}
          {mutation.isPending ? 'Saving…' : 'Save'}
        </Button>
        <Link
          to={patient ? `/patients/${patient.id}` : '/patients'}
          className={buttonVariants({ variant: 'outline' })}
        >
          Cancel
        </Link>
      </div>
    </form>
  )
}
