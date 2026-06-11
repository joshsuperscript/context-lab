import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import PersonalMdSidebar from '@/components/PersonalMdSidebar'
import NavLink from '@/components/NavLink'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session?.user) redirect('/login')

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Left nav */}
      <nav className="w-52 shrink-0 bg-white border-r border-gray-200 flex flex-col py-5 px-3">
        <Link href="/" className="flex items-center gap-2 px-2 mb-8">
          <div className="w-6 h-6 bg-[#00A3FF] rounded-md" />
          <span className="font-semibold text-sm text-gray-900">Context Hub</span>
        </Link>

        <div className="flex flex-col gap-0.5 flex-1">
          <NavLink href="/dashboard" exact>Dashboard</NavLink>
          <NavLink href="/library">Library</NavLink>
          <NavLink href="/admin">Admin</NavLink>
        </div>

        <div className="px-2 pt-4 border-t border-gray-100">
          <p className="text-xs text-gray-500 truncate">{session.user.email}</p>
        </div>
      </nav>

      {/* Main + optional sidebar */}
      <div className="flex flex-1 overflow-hidden">
        <main className="flex-1 overflow-y-auto">{children}</main>
        <PersonalMdSidebar />
      </div>
    </div>
  )
}
