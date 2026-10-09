import { useCallback, useLayoutEffect } from 'react'
import { useLocation, useNavigate, type NavigateOptions, type To } from 'react-router'

/** forward: next page slides in from the right; back: current page slides away to the right; tab: quick crossfade */
export type NavDirection = 'forward' | 'back' | 'tab'

export function prefersReducedMotion() {
  return matchMedia('(prefers-reduced-motion: reduce)').matches
}

// Resolves the running transition's update once the new route has been committed to the DOM
let finishUpdate: (() => void) | null = null

/**
 * Runs a route change inside a View Transition so pages move like a native navigation stack
 * (animations in index.css). Older WebViews without the API, or reduced motion, just navigate.
 */
export function transitionTo(direction: NavDirection, go: () => void) {
  if (!document.startViewTransition || prefersReducedMotion()) return go()
  const root = document.documentElement
  root.dataset.nav = direction
  const transition = document.startViewTransition(
    () =>
      new Promise<void>((resolve) => {
        finishUpdate = resolve
        go()
        // back navigations commit after popstate; never keep the screen frozen if nothing changes
        setTimeout(resolve, 500)
      }),
  )
  transition.ready.catch(() => {}) // skipped when another navigation starts first
  transition.finished.finally(() => {
    if (root.dataset.nav === direction) delete root.dataset.nav
  })
}

/** Mount once inside the router: lets a pending transition take its "after" snapshot. */
export function usePageTransitionCommit() {
  const { key } = useLocation()
  useLayoutEffect(() => {
    finishUpdate?.()
    finishUpdate = null
  }, [key])
}

/** useNavigate with page transitions. Going back (negative delta) slides back unless told otherwise. */
export function useAppNavigate() {
  const navigate = useNavigate()
  return useCallback(
    (to: To | number, { direction, ...options }: NavigateOptions & { direction?: NavDirection } = {}) =>
      transitionTo(direction ?? (typeof to === 'number' && to < 0 ? 'back' : 'forward'), () => {
        if (typeof to === 'number') navigate(to)
        else navigate(to, options)
      }),
    [navigate],
  )
}
