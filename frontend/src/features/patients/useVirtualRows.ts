import { useVirtualizer } from '@tanstack/react-virtual'
import { useRef } from 'react'

/** Rendering at most this many rows is cheap, so virtualization only kicks in above it. */
export const VIRTUALIZE_ABOVE = 50

/**
 * Windowing for the list. When disabled it returns every index with no padding, so small
 * pages render as plain rows. Padding rows above/below keep the scroll height correct.
 */
export function useVirtualRows(count: number, estimateSize: number) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const enabled = count > VIRTUALIZE_ABOVE
  // The virtualizer's functions aren't memoizable by React Compiler; we don't pass them to memoized children.
  // oxlint-disable-next-line react/incompatible-library
  const virtualizer = useVirtualizer({
    count: enabled ? count : 0,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => estimateSize,
    overscan: 6,
  })

  if (!enabled) {
    return {
      enabled,
      scrollRef,
      indexes: Array.from({ length: count }, (_, i) => i),
      padTop: 0,
      padBottom: 0,
      measureElement: undefined,
    }
  }
  const items = virtualizer.getVirtualItems()
  return {
    enabled,
    scrollRef,
    indexes: items.map((item) => item.index),
    padTop: items[0]?.start ?? 0,
    padBottom: items.length ? virtualizer.getTotalSize() - items[items.length - 1].end : 0,
    measureElement: virtualizer.measureElement,
  }
}
