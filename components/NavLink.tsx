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
        'px-2 py-1.5 rounded-lg text-sm transition-colors',
        active
          ? 'bg-[#00A3FF]/10 text-[#00A3FF] font-medium'
          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
      )}
    >
      {children}
    </Link>
  )
}
