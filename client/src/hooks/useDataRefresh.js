import { useEffect, useRef } from 'react'

export const REFRESH_EVENT = 'dataRefresh'

// Foregrounding the app refetches only if the data is at least this old, so
// flicking between apps doesn't fire a request every time.
const STALE_AFTER_MS = 30000

export function triggerRefresh() {
  window.dispatchEvent(new CustomEvent(REFRESH_EVENT))
}

// Re-runs a page's loader when the user taps Refresh, or when the app returns
// to the foreground after the data has gone stale.
//
// Saved to the home screen the app runs without browser chrome, so there is no
// reload button and no pull-to-refresh. React state also survives in the
// background, so without this the data silently goes stale.
export function useDataRefresh(load) {
  const loadRef = useRef(load)
  loadRef.current = load

  useEffect(() => {
    const lastLoadedAt = { current: Date.now() }

    const run = () => {
      lastLoadedAt.current = Date.now()
      loadRef.current()
    }

    const onVisibilityChange = () => {
      if (document.visibilityState !== 'visible') return
      if (Date.now() - lastLoadedAt.current < STALE_AFTER_MS) return
      run()
    }

    window.addEventListener(REFRESH_EVENT, run)
    document.addEventListener('visibilitychange', onVisibilityChange)

    return () => {
      window.removeEventListener(REFRESH_EVENT, run)
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [])
}
