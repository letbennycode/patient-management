import { Component, type ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { QueryError } from '@/components/QueryError'

type Props = { children: ReactNode }
type State = { error: unknown; failed: boolean }

class Boundary extends Component<Props, State> {
  state: State = { error: null, failed: false }

  static getDerivedStateFromError(error: unknown): State {
    return { error, failed: true }
  }

  render() {
    if (!this.state.failed) return this.props.children
    // A lazy chunk can fail to load (network blip, stale hashes); reloading fetches it again.
    return <QueryError error={this.state.error} onRetry={() => window.location.reload()} />
  }
}

/** Catches render and lazy-chunk errors for a route. Keyed on the path so navigating away resets it. */
export function RouteErrorBoundary({ children }: Props) {
  const { pathname } = useLocation()
  return <Boundary key={pathname}>{children}</Boundary>
}
