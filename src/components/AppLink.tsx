import { Link, type LinkProps } from 'react-router'
import { useAppNavigate } from '../state/pageTransition'

/** Link that slides the next page in like a native push. */
export function AppLink({ to, onClick, ...props }: LinkProps) {
  const navigate = useAppNavigate()
  return (
    <Link
      to={to}
      {...props}
      onClick={(e) => {
        onClick?.(e)
        if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
        e.preventDefault()
        navigate(to)
      }}
    />
  )
}
