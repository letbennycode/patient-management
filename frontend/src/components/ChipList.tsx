import { Badge } from '@/components/ui/badge'

export function ChipList({ items, empty = 'None recorded' }: { items: string[]; empty?: string }) {
  if (items.length === 0) return <span className="text-muted-foreground">{empty}</span>
  return (
    <ul className="flex flex-wrap gap-1.5">
      {items.map((item) => (
        <li key={item}>
          <Badge variant="outline" className="h-6 bg-card px-2.5 font-normal">
            {item}
          </Badge>
        </li>
      ))}
    </ul>
  )
}
