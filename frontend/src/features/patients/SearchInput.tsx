import { SearchIcon } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Input } from '@/components/ui/input'
import { useDebouncedValue } from '@/lib/useDebouncedValue'

const DEBOUNCE_MS = 300

interface SearchInputProps {
  value: string
  onSearch: (value: string) => void
}

/** Typing updates local state immediately; the debounced value drives the query. */
export function SearchInput({ value, onSearch }: SearchInputProps) {
  const [text, setText] = useState(value)
  const debounced = useDebouncedValue(text.trim(), DEBOUNCE_MS)

  useEffect(() => {
    if (debounced !== value) onSearch(debounced)
    // Only react to the debounced text changing, not to changes of `value`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced])

  // Keep the box in sync when the term changes elsewhere (back button, "Clear filters").
  useEffect(() => {
    if (value !== debounced) setText(value)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  return (
    <div className="relative">
      <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        type="search"
        aria-label="Search patients"
        placeholder="Search by name"
        className="pl-8"
        value={text}
        onChange={(e) => setText(e.target.value)}
        maxLength={100}
        autoComplete="off"
      />
    </div>
  )
}
