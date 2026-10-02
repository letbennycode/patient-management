import { LayoutDashboardIcon, UsersIcon } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboardIcon, end: true },
  { to: '/patients', label: 'Patients', icon: UsersIcon, end: false },
]

interface NavLinksProps {
  label: string
  onNavigate?: () => void
}

export function NavLinks({ label, onNavigate }: NavLinksProps) {
  return (
    <nav aria-label={label} className="flex flex-col gap-0.5">
      {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          onClick={onNavigate}
          className={({ isActive }) =>
            cn(
              'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors',
              isActive
                ? 'bg-sidebar-accent font-medium text-sidebar-accent-foreground shadow-xs ring-1 ring-sidebar-border'
                : 'text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground',
            )
          }
        >
          {({ isActive }) => (
            <>
              <Icon className={cn('size-4', isActive && 'text-brand')} />
              {label}
            </>
          )}
        </NavLink>
      ))}
    </nav>
  )
}
