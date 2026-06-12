import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import AddContextFlow from '@/components/AddContextFlow'

export default async function NewPage() {
  const session = await auth()
  if (!session?.user?.email) redirect('/login')
  return <AddContextFlow currentUserEmail={session.user.email} />
}
