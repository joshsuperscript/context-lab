import { auth } from '@/lib/auth'
import { queryContextFiles, isApprover, getStaffList } from '@/lib/notion'
import { redirect } from 'next/navigation'
import ManageClient from '@/components/ManageClient'

export default async function ManagePage() {
  const session = await auth()
  const email = session?.user?.email!
  if (!isApprover(email)) redirect('/tree')

  let unassigned: Awaited<ReturnType<typeof queryContextFiles>> = []
  let staff: { name: string; email: string }[] = []
  try {
    const all = await queryContextFiles()
    unassigned = all.filter((f) => !f.assigned_to && f.status !== 'published')
    staff = await getStaffList()
  } catch { /* ok */ }

  return (
    <div>
      <div className="px-8 py-5 border-b border-[#E1E1E1] bg-white">
        <h1 className="text-xl font-semibold text-black tracking-tight">Manage</h1>
        <p className="text-xs text-[#999] mt-0.5 font-mono">Add, assign, and sync context files</p>
      </div>
      <ManageClient unassigned={unassigned} staff={staff} />
    </div>
  )
}
