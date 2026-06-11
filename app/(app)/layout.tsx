import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import PersonalMdSidebar from '@/components/PersonalMdSidebar'
import NavLink from '@/components/NavLink'
import Logo from '@/components/Logo'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session?.user) redirect('/login')

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Left nav — sharp, clean */}
      <nav className="w-48 shrink-0 bg-white border-r border-black flex flex-col py-5 px-4">
        <Link href="/" className="flex items-center gap-2.5 mb-8">
          <Logo size={22} />
          <span className="font-semibold text-sm text-black tracking-tight">Context Lab</span>
        </Link>

        <div className="flex flex-col border-l border-[#E1E1E1] pl-0 flex-1 gap-0">
          <NavLink href="/dashboard" exact>Dashboard</NavLink>
          <NavLink href="/library">Library</NavLink>
          <NavLink href="/admin">Admin</NavLink>
        </div>

        <div className="pt-4 border-t border-[#E1E1E1]">
          <p className="text-xs text-[#999] truncate font-mono">{session.user.email}</p>
        </div>
      </nav>

      {/* Main + optional sidebar */}
      <div className="flex flex-1 overflow-hidden">
        <main className="flex-1 overflow-y-auto bg-[#F9F9F9]">{children}</main>
        <PersonalMdSidebar />
      </div>
    </div>
  )
}
