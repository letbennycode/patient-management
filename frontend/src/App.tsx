import { lazy } from 'react'
import { Route, Routes } from 'react-router-dom'
import { AppLayout } from '@/components/layout/AppLayout'
import NotFoundPage from '@/pages/NotFoundPage'

// Route-level code splitting; the 404 page stays eager so it renders instantly.
const DashboardPage = lazy(() => import('@/pages/DashboardPage'))
const PatientDetailPage = lazy(() => import('@/pages/PatientDetailPage'))
const PatientFormPage = lazy(() => import('@/pages/PatientFormPage'))
const PatientsPage = lazy(() => import('@/pages/PatientsPage'))

export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<DashboardPage />} />
        <Route path="patients" element={<PatientsPage />} />
        <Route path="patients/new" element={<PatientFormPage />} />
        <Route path="patients/:id" element={<PatientDetailPage />} />
        <Route path="patients/:id/edit" element={<PatientFormPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}
