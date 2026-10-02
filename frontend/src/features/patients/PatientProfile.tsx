import type { ReactNode } from 'react'
import type { Patient } from '@/api/types'
import { ChipList } from '@/components/ChipList'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatDate } from '@/lib/format'

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="min-w-0 break-words">{children}</dd>
    </>
  )
}

const NOT_PROVIDED = <span className="text-muted-foreground">Not provided</span>

export function PatientProfile({ patient }: { patient: Patient }) {
  const cityLine = [patient.city, patient.state, patient.postal_code].filter(Boolean).join(', ')
  const address = [patient.address_line1, patient.address_line2, cityLine].filter(Boolean)

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader>
          <CardTitle>Contact</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-[6.5rem_1fr] gap-x-4 gap-y-3 text-sm">
            <Field label="Email">{patient.email ?? NOT_PROVIDED}</Field>
            <Field label="Phone">{patient.phone ?? NOT_PROVIDED}</Field>
            <Field label="Address">
              {address.length ? address.map((line) => <div key={line}>{line}</div>) : NOT_PROVIDED}
            </Field>
          </dl>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Medical</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-[6.5rem_1fr] gap-x-4 gap-y-3 text-sm">
            <Field label="Blood type">{patient.blood_type ?? 'Unknown'}</Field>
            <Field label="Allergies">
              <ChipList items={patient.allergies} />
            </Field>
            <Field label="Conditions">
              <ChipList items={patient.conditions} />
            </Field>
            <Field label="Last visit">{formatDate(patient.last_visit)}</Field>
          </dl>
        </CardContent>
      </Card>
    </div>
  )
}
