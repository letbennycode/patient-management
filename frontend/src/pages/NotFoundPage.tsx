import { Link } from 'react-router-dom'
import { PageHeader } from '@/components/PageHeader'

export default function NotFoundPage() {
  return (
    <>
      <PageHeader title="Page not found" />
      <p className="mb-4 text-muted-foreground">The page you're looking for doesn't exist.</p>
      <Link to="/" className="text-primary underline underline-offset-4">
        Back to dashboard
      </Link>
    </>
  )
}
