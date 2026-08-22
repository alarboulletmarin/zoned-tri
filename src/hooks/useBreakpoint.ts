import { useEffect, useState } from 'react'

export type Breakpoint = 'mobile' | 'tablet' | 'desktop'

/** Points de rupture documentés dans src/styles/tokens.css (--breakpoint-tablet / --breakpoint-desktop). */
const TABLET_QUERY = '(min-width: 768px)'
const DESKTOP_QUERY = '(min-width: 1024px)'

function resolveBreakpoint(isTablet: boolean, isDesktop: boolean): Breakpoint {
  if (isDesktop) return 'desktop'
  if (isTablet) return 'tablet'
  return 'mobile'
}

/** Mobile < 768px ; tablette 768-1023px ; desktop >= 1024px (voir écran S4). */
export function useBreakpoint(): Breakpoint {
  const [breakpoint, setBreakpoint] = useState<Breakpoint>(() => {
    if (typeof window === 'undefined') return 'mobile'
    const tabletMql = window.matchMedia(TABLET_QUERY)
    const desktopMql = window.matchMedia(DESKTOP_QUERY)
    return resolveBreakpoint(tabletMql.matches, desktopMql.matches)
  })

  useEffect(() => {
    const tabletMql = window.matchMedia(TABLET_QUERY)
    const desktopMql = window.matchMedia(DESKTOP_QUERY)

    function update() {
      setBreakpoint(resolveBreakpoint(tabletMql.matches, desktopMql.matches))
    }

    update()
    tabletMql.addEventListener('change', update)
    desktopMql.addEventListener('change', update)
    return () => {
      tabletMql.removeEventListener('change', update)
      desktopMql.removeEventListener('change', update)
    }
  }, [])

  return breakpoint
}
