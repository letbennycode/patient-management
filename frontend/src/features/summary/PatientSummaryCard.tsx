import { RefreshCwIcon, SparklesIcon } from 'lucide-react'
import { usePatientSummary } from '@/api'
import { ChipList } from '@/components/ChipList'
import { QueryError } from '@/components/QueryError'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { formatDateTime } from '@/lib/format'

export function PatientSummaryCard({ patientId }: { patientId: string }) {
  const { data, isPending, isError, error, refetch, isFetching } = usePatientSummary(patientId)

  return (
    <Card className="relative ring-brand/20">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-brand-soft/70 to-transparent"
      />
      <CardHeader className="relative flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <SparklesIcon aria-hidden className="size-4 text-brand" />
          Summary
        </CardTitle>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCwIcon className={isFetching ? 'animate-spin' : undefined} />
          Regenerate
        </Button>
      </CardHeader>
      <CardContent className="relative space-y-4">
        {isPending ? (
          <div data-testid="summary-skeleton" className="space-y-2">
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : isError && !data ? (
          <QueryError error={error} onRetry={() => refetch()} />
        ) : (
          <>
            {isError && <QueryError error={error} onRetry={() => refetch()} />}
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
              <dt className="text-muted-foreground">Patient</dt>
              <dd>
                {data.name}, {data.age}
              </dd>
              <dt className="text-muted-foreground">Blood type</dt>
              <dd>{data.blood_type ?? 'Unknown'}</dd>
              <dt className="text-muted-foreground">Conditions</dt>
              <dd>
                <ChipList items={data.conditions} />
              </dd>
              <dt className="text-muted-foreground">Allergies</dt>
              <dd>
                <ChipList items={data.allergies} />
              </dd>
            </dl>
            <p className="font-heading text-[1.05rem] leading-relaxed">{data.narrative}</p>
            <p className="text-xs text-muted-foreground">
              Generated {formatDateTime(data.generated_at)} ·{' '}
              {data.source === 'llm' ? 'AI-generated' : 'template'}
            </p>
          </>
        )}
      </CardContent>
    </Card>
  )
}
