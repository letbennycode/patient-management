import { PageHeader } from '@/components/PageHeader'
import { PatientList } from '@/features/patients/PatientList'

export default function PatientsPage() {
  return (
    <>
      <PageHeader title="Patients" description="Search, filter and open patient records." />
      <PatientList />
    </>
  )
}
