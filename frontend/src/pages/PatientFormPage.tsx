import { useParams } from 'react-router-dom'
import { usePatient } from '@/api'
import { PageHeader } from '@/components/PageHeader'
import { QueryError } from '@/components/QueryError'
import { Skeleton } from '@/components/ui/skeleton'
import { PatientForm } from '@/features/patients/PatientForm'
import { isNotFound } from '@/lib/errors'
import { PatientNotFound } from './PatientDetailPage'

export default function PatientFormPage() {
  const { id } = useParams()
  const { data: patient, isPending, isError, error, refetch } = usePatient(id)

  if (!id) {
    return (
      <>
        <PageHeader title="New patient" />
        <PatientForm />
      </>
    )
  }
  if (isPending) return <Skeleton data-testid="form-skeleton" className="h-96 w-full" />
  if (isError) {
    return isNotFound(error) ? (
      <PatientNotFound />
    ) : (
      <QueryError error={error} onRetry={() => refetch()} />
    )
  }
  return (
    <>
      <PageHeader title="Edit patient" />
      {/* Keyed so the form re-initialises if a different patient loads. */}
      <PatientForm key={patient.id} patient={patient} />
    </>
  )
}
