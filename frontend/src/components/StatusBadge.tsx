import type { PatientStatus } from '@/api/types'
import { Badge } from '@/components/ui/badge'
import { capitalize } from '@/lib/format'
import { cn } from '@/lib/utils'

const STYLES: Record<PatientStatus, { badge: string; dot: string }> = {
  active: {
    badge:
      'bg-emerald-50 text-emerald-800 ring-emerald-600/15 dark:bg-emerald-400/10 dark:text-emerald-300',
    dot: 'bg-emerald-500',
  },
  inactive: {
    badge: 'bg-secondary text-muted-foreground ring-foreground/10',
    dot: 'bg-stone-400',
  },
  critical: {
    badge: 'bg-red-50 text-red-800 ring-red-600/15 dark:bg-red-400/10 dark:text-red-300',
    dot: 'bg-red-500',
  },
}

export function StatusBadge({ status }: { status: PatientStatus }) {
  const style = STYLES[status]
  return (
    <Badge className={cn('h-6 gap-1.5 px-2.5 ring-1 ring-inset', style.badge)}>
      <span aria-hidden className={cn('size-1.5 rounded-full', style.dot)} />
      {capitalize(status)}
    </Badge>
  )
}
