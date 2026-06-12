import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import PersonalMdSidebar from '@/components/PersonalMdSidebar'
import NavLink from '@/components/NavLink'
import Logo from '@/components/Logo'
import { isApprover } from '@/lib/notion'
import { Plus } from 'lucide-react'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session?.user) redirect('/login')
  const email = session.user.email!
  const admin = isApprover(email)

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Left nav */}
      <nav className="w-48 shrink-0 bg-white border-r border-black flex flex-col py-5 px-4">
        <Link href="/tree" className="flex items-center gap-2.5 mb-8">
          <Logo size={28} />
          <span className="font-semibold text-sm text-black tracking-tight">Context Lab</span>
        </Link>

        <div className="flex flex-col border-l border-[#E1E1E1] flex-1 gap-0">
          <NavLink href="/dashboard" exact>Dashboard</NavLink>
          <NavLink href="/tree">Context</NavLink>
          {admin && <NavLink href="/manage">Manage</NavLink>}
        </div>

        {/* Add Context button — persistent */}
        <Link
          href="/new"
          className="flex items-center justify-center gap-1.5 py-2.5 bg-black text-white text-xs rounded-full hover:bg-[#00A3FF] transition-colors mt-4 mb-3"
        >
          <Plus size={13} /> Add Context
        </Link>

        <div className="border-t border-[#E1E1E1] pt-3">
          <p className="text-xs text-[#999] truncate font-mono">{email}</p>
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
