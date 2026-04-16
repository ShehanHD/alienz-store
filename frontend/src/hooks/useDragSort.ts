import { useCallback, useRef, useState } from 'react'

export function useDragSort<T extends { id: string }>(
  initial: T[],
  onReordered: (items: T[]) => void,
) {
  const [items, setItems] = useState<T[]>(initial)
  const dragIndexRef = useRef<number | null>(null)
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [overId, setOverId] = useState<string | null>(null)

  // Sync when the parent list changes (e.g. after add/delete)
  const sync = useCallback((next: T[]) => setItems(next), [])

  const onDragStart = (index: number) => {
    dragIndexRef.current = index
    setDraggingId(items[index].id)
  }

  const onDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    const from = dragIndexRef.current
    if (from === null || from === index) {
      setOverId(items[index].id)
      return
    }
    const next = [...items]
    const [moved] = next.splice(from, 1)
    next.splice(index, 0, moved)
    dragIndexRef.current = index
    setItems(next)
    setOverId(items[index]?.id ?? null)
  }

  const onDragEnd = () => {
    setDraggingId(null)
    setOverId(null)
    dragIndexRef.current = null
    onReordered(items)
  }

  return { items, sync, draggingId, overId, onDragStart, onDragOver, onDragEnd }
}
