import { auth } from '@/lib/auth'
import { queryContextFiles, getStaffList } from '@/lib/notion'
import ContextTree from '@/components/ContextTree'

export default async function TreePage() {
  const session = await auth()
  const email = session?.user?.email!

  let files: Awaited<ReturnType<typeof queryContextFiles>> = []
  let staff: { name: string; email: string }[] = []

  try {
    ;[files, staff] = await Promise.all([
      queryContextFiles(),
      getStaffList(),
    ])
  } catch (e) {
    console.error('Tree data load failed:', e)
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-5 py-4 border-b border-[#E1E1E1] bg-white shrink-0">
        <h1 className="text-lg font-semibold text-black tracking-tight">Context Library</h1>
        <p className="text-xs text-[#999] mt-0.5 font-mono">{files.length} pages tracked</p>
      </div>
      <div className="flex-1 overflow-hidden">
        <ContextTree files={files} currentUserEmail={email} staff={staff} />
      </div>
    </div>
  )
}
