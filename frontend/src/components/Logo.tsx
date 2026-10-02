import { useId } from 'react'
import { cn } from '@/lib/utils'

/** Violet gradient tile with a heartbeat line. Same artwork as public/favicon.svg. */
export function LogoMark({ className }: { className?: string }) {
  // Gradient ids must be unique per instance, or a second logo on the page reuses the first's.
  const id = useId()
  return (
    <svg viewBox="0 0 32 32" aria-hidden className={cn('size-8 shrink-0', className)}>
      <defs>
        <linearGradient id={`${id}fill`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#a47bff" />
          <stop offset="0.55" stopColor="#6c37ee" />
          <stop offset="1" stopColor="#3f17a8" />
        </linearGradient>
        <radialGradient id={`${id}shine`} cx="0.2" cy="0.1" r="0.8">
          <stop offset="0" stopColor="#fff" stopOpacity="0.45" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="32" height="32" rx="9" fill={`url(#${id}fill)`} />
      <rect width="32" height="32" rx="9" fill={`url(#${id}shine)`} />
      <path
        d="M6 17.5h4.5l2.5-6 4.5 11 3-7.5 1.75 2.5H26"
        fill="none"
        stroke="#fff"
        strokeWidth="2.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn('flex items-center gap-2.5', className)}>
      <LogoMark />
      <span className="font-heading text-[1.15rem] leading-none tracking-tight">
        Patient Management
      </span>
    </span>
  )
}
