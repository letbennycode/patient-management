import type { ComponentProps } from 'react'
import { cn } from '@/lib/utils'

/** Styled native <select>: accessible, mobile-friendly and easy to test. */
export function NativeSelect({ className, ...props }: ComponentProps<'select'>) {
  return (
    <select
      className={cn(
        'h-9 w-full rounded-lg border border-input bg-card px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50 aria-invalid:border-destructive dark:bg-input/30',
        className,
      )}
      {...props}
    />
  )
}
