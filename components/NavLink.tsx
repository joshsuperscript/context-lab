'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

interface NavLinkProps {
  href: string
  children: React.ReactNode
  exact?: boolean
}

export default function NavLink({ href, children, exact }: NavLinkProps) {
  const pathname = usePathname()
  const active = exact ? pathname === href : pathname.startsWith(href)

  return (
    <Link
      href={href}
      className={cn(
        'px-3 py-1.5 text-sm transition-colors block',
        active
          ? 'text-[#00A3FF] font-medium border-l-2 border-[#00A3FF] -ml-px pl-[calc(0.75rem-2px)]'
          : 'text-[#666] hover:text-black'
      )}
    >
      {children}
    </Link>
  )
}
