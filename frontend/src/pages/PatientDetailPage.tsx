import { ArrowLeftIcon, PencilIcon, Trash2Icon } from 'lucide-react'
import { useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { usePatient } from '@/api'
import { PageHeader } from '@/components/PageHeader'
import { QueryError } from '@/components/QueryError'
import { StatusBadge } from '@/components/StatusBadge'
import { Button, buttonVariants } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { DeletePatientDialog } from '@/features/patients/DeletePatientDialog'
import { PatientProfile } from '@/features/patients/PatientProfile'
import { PatientNotes } from '@/features/notes/PatientNotes'
import { PatientSummaryCard } from '@/features/summary/PatientSummaryCard'
import { formatDate, fullName } from '@/lib/format'
import { isNotFound } from '@/lib/errors'

export function PatientNotFound() {
  return (
    <>
      <PageHeader title="Patient not found" />
      <p className="mb-4 text-muted-foreground">This patient doesn't exist or was deleted.</p>
      <Link to="/patients" className="text-primary underline underline-offset-4">
        Back to patients
      </Link>
    </>
  )
}

export default function PatientDetailPage() {
  const { id } = useParams()
  const location = useLocation()
  const [deleteOpen, setDeleteOpen] = useState(false)
  const { data: patient, isPending, isError, error, refetch } = usePatient(id)
  const backTo = `/patients${(location.state as { from?: string } | null)?.from ?? ''}`

  if (isPending) {
    return (
      <div data-testid="detail-skeleton" className="space-y-4">
        <Skeleton className="h-12 w-72" />
        <Skeleton className="h-48 w-full rounded-2xl" />
        <Skeleton className="h-48 w-full rounded-2xl" />
      </div>
    )
  }
  if (isError) {
    return isNotFound(error) ? (
      <PatientNotFound />
    ) : (
      <QueryError error={error} onRetry={() => refetch()} />
    )
  }

  const name = fullName(patient)
  return (
    <>
      <Link
        to={backTo}
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeftIcon className="size-4" />
        Back to patients
      </Link>
      <PageHeader
        title={name}
        documentTitle="Patient details"
        description={
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
            <StatusBadge status={patient.status} />
            <span>{patient.age} years old</span>
            <span aria-hidden>·</span>
            <span>Born {formatDate(patient.date_of_birth)}</span>
          </div>
        }
        actions={
          <div className="flex gap-2">
            <Link
              to={`/patients/${patient.id}/edit`}
              className={buttonVariants({ variant: 'outline' })}
            >
              <PencilIcon />
              Edit
            </Link>
            <Button variant="destructive" onClick={() => setDeleteOpen(true)}>
              <Trash2Icon />
              Delete
            </Button>
          </div>
        }
      />
      <div className="grid gap-5 lg:grid-cols-2">
        <PatientProfile patient={patient} />
        <div className="space-y-5">
          <PatientSummaryCard patientId={patient.id} />
          <PatientNotes patientId={patient.id} />
        </div>
      </div>
      <DeletePatientDialog
        patientId={patient.id}
        name={name}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
      />
    </>
  )
}
