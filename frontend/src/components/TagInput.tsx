import { XIcon } from 'lucide-react'
import { type KeyboardEvent, type Ref, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'

interface TagInputProps {
  id: string
  value: string[]
  onChange: (value: string[]) => void
  onBlur?: () => void
  invalid?: boolean
  ref?: Ref<HTMLInputElement>
  placeholder?: string
}

/** Type and press Enter or comma to add; click × to remove. Ignores blanks and duplicates. */
export function TagInput({
  id,
  value,
  onChange,
  onBlur,
  invalid,
  placeholder,
  ref,
}: TagInputProps) {
  const [text, setText] = useState('')

  const add = () => {
    const tag = text.trim()
    setText('')
    if (!tag || value.some((v) => v.toLowerCase() === tag.toLowerCase())) return
    onChange([...value, tag])
  }

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      add()
    } else if (e.key === 'Backspace' && !text && value.length) {
      onChange(value.slice(0, -1))
    }
  }

  return (
    <div className="space-y-2">
      <Input
        ref={ref}
        id={id}
        value={text}
        placeholder={placeholder ?? 'Type and press Enter'}
        aria-invalid={invalid}
        aria-describedby={invalid ? `${id}-error` : undefined}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={onKeyDown}
        onBlur={() => {
          add()
          onBlur?.()
        }}
      />
      {value.length > 0 && (
        <ul className="flex flex-wrap gap-1.5">
          {value.map((tag) => (
            <li key={tag}>
              <Badge variant="secondary" className="h-6 gap-1 pr-1">
                {tag}
                <button
                  type="button"
                  aria-label={`Remove ${tag}`}
                  className="rounded-full p-0.5 hover:bg-foreground/10"
                  onClick={() => onChange(value.filter((v) => v !== tag))}
                >
                  <XIcon className="size-3" />
                </button>
              </Badge>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
