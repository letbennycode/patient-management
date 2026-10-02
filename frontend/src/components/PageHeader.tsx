import type { ReactNode } from 'react'
import { usePageTitle } from '@/lib/usePageTitle'

interface PageHeaderProps {
  title: string
  /** Tab title when it differs from `title` (e.g. to keep a patient name out of history). */
  documentTitle?: string
  description?: ReactNode
  actions?: ReactNode
}

export function PageHeader({ title, documentTitle, description, actions }: PageHeaderProps) {
  usePageTitle(documentTitle ?? title)
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0 space-y-2">
        <h1 className="text-4xl leading-tight font-light tracking-tight text-balance md:text-5xl">
          {title}
        </h1>
        {description && <div className="text-muted-foreground">{description}</div>}
      </div>
      {actions}
    </div>
  )
}
