import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useBreakpoint } from './useBreakpoint'

type Listener = (event: MediaQueryListEvent) => void

/**
 * Mock minimal de matchMedia : chaque requête garde ses propres listeners,
 * `setMatches` permet de simuler un changement de largeur depuis le test.
 */
function mockMatchMedia(initialWidth: number) {
  let width = initialWidth
  const listenersByQuery = new Map<string, Set<Listener>>()

  function evaluate(query: string): boolean {
    const minWidthMatch = query.match(/min-width:\s*(\d+)px/)
    if (!minWidthMatch) return false
    return width >= Number(minWidthMatch[1])
  }

  window.matchMedia = vi.fn().mockImplementation((query: string) => {
    if (!listenersByQuery.has(query)) listenersByQuery.set(query, new Set())
    const mql = {
      get matches() {
        return evaluate(query)
      },
      media: query,
      addEventListener: (_: 'change', listener: Listener) => {
        listenersByQuery.get(query)!.add(listener)
      },
      removeEventListener: (_: 'change', listener: Listener) => {
        listenersByQuery.get(query)!.delete(listener)
      },
    } as unknown as MediaQueryList
    return mql
  })

  return {
    setWidth(nextWidth: number) {
      width = nextWidth
      for (const listeners of listenersByQuery.values()) {
        for (const listener of listeners) {
          listener({ matches: true } as MediaQueryListEvent)
        }
      }
    },
  }
}

describe('useBreakpoint', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns "mobile" below the tablet breakpoint (768px)', () => {
    mockMatchMedia(500)
    const { result } = renderHook(() => useBreakpoint())
    expect(result.current).toBe('mobile')
  })

  it('returns "tablet" between the tablet and desktop breakpoints', () => {
    mockMatchMedia(800)
    const { result } = renderHook(() => useBreakpoint())
    expect(result.current).toBe('tablet')
  })

  it('returns "desktop" at or above the desktop breakpoint (1024px)', () => {
    mockMatchMedia(1200)
    const { result } = renderHook(() => useBreakpoint())
    expect(result.current).toBe('desktop')
  })

  it('updates when the viewport crosses a breakpoint', () => {
    const media = mockMatchMedia(500)
    const { result } = renderHook(() => useBreakpoint())
    expect(result.current).toBe('mobile')

    act(() => {
      media.setWidth(1200)
    })
    expect(result.current).toBe('desktop')
  })
})
