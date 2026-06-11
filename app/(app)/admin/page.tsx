import { auth } from '@/lib/auth'
import { queryContextFiles, isApprover } from '@/lib/notion'
import { redirect } from 'next/navigation'
import AdminClient from '@/components/AdminClient'

export default async function AdminPage() {
  const session = await auth()
  const email = session?.user?.email!

  if (!isApprover(email)) redirect('/dashboard')

  const pending = await queryContextFiles({ status: 'draft_submitted' })

  return <AdminClient pending={pending} reviewerEmail={email} />
}
