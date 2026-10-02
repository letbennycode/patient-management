import { MenuIcon, PlusIcon } from 'lucide-react'
import { Suspense, useState } from 'react'
import { Link, Outlet } from 'react-router-dom'
import { Logo, LogoMark } from '@/components/Logo'
import { RouteErrorBoundary } from '@/components/RouteErrorBoundary'
import { ThemeToggle } from '@/components/ThemeToggle'
import { Button, buttonVariants } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Toaster } from '@/components/ui/sonner'
import { NavLinks } from './nav'

export function AppLayout() {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div className="flex h-dvh">
      <aside className="hidden w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar p-4 md:flex">
        <Link
          to="/"
          aria-label="Patient Management"
          className="mb-8 rounded-lg px-1 py-1 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
        >
          <Logo />
        </Link>
        <p className="mb-2 px-3 text-[0.7rem] font-medium tracking-[0.12em] text-muted-foreground uppercase">
          Workspace
        </p>
        <NavLinks label="Primary" />
        <div className="mt-auto flex items-center justify-between border-t border-sidebar-border pt-4">
          <span className="text-xs text-muted-foreground">Appearance</span>
          <ThemeToggle />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 shrink-0 items-center gap-2 border-b bg-background/80 px-4 backdrop-blur md:px-8">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            aria-label="Open menu"
            onClick={() => setMenuOpen(true)}
          >
            <MenuIcon />
          </Button>
          <Link to="/" aria-label="Home" className="md:hidden">
            <LogoMark className="size-7" />
          </Link>
          <div className="ml-auto flex items-center gap-2">
            <Link
              to="/patients/new"
              aria-label="New patient"
              className={buttonVariants({ size: 'lg' })}
            >
              <PlusIcon />
              <span className="hidden sm:inline">New patient</span>
            </Link>
          </div>
        </header>
        <main className="glow min-w-0 flex-1 overflow-y-auto bg-no-repeat">
          <div className="mx-auto w-full max-w-6xl px-4 py-6 md:px-8 md:py-10">
            <RouteErrorBoundary>
              <Suspense fallback={<Skeleton className="h-40 w-full" />}>
                <Outlet />
              </Suspense>
            </RouteErrorBoundary>
          </div>
        </main>
      </div>

      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetContent side="left" className="bg-sidebar p-4">
          <SheetHeader className="mb-4 p-0">
            <Logo />
            <SheetTitle className="sr-only">Menu</SheetTitle>
            <SheetDescription className="sr-only">Site navigation</SheetDescription>
          </SheetHeader>
          <NavLinks label="Mobile" onNavigate={() => setMenuOpen(false)} />
          <div className="mt-auto flex items-center justify-between border-t border-sidebar-border pt-4">
            <span className="text-xs text-muted-foreground">Appearance</span>
            <ThemeToggle />
          </div>
        </SheetContent>
      </Sheet>
      <Toaster />
    </div>
  )
}
