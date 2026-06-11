import { auth } from '@/lib/auth'
import { queryContextFiles } from '@/lib/notion'
import DashboardClient from '@/components/DashboardClient'

export default async function DashboardPage() {
  const session = await auth()
  const email = session?.user?.email!

  let myFiles: Awaited<ReturnType<typeof queryContextFiles>> = []
  let allFiles: Awaited<ReturnType<typeof queryContextFiles>> = []

  try {
    ;[myFiles, allFiles] = await Promise.all([
      queryContextFiles({ assigned_to: email }),
      queryContextFiles(),
    ])
  } catch (e) {
    console.error('Notion query failed:', e)
  }

  const summary = allFiles.reduce(
    (acc, f) => { acc[f.status] = (acc[f.status] ?? 0) + 1; return acc },
    {} as Record<string, number>
  )

  return (
    <div className="p-8 max-w-3xl">
      <h1 className="text-xl font-semibold text-black mb-0.5 tracking-tight">Dashboard</h1>
      <p className="text-xs text-[#999] mb-8 font-mono">Welcome back, {email.split('@')[0]}</p>

      {/* Summary cards — sharp, design system */}
      <div className="grid grid-cols-4 gap-px border border-black mb-10">
        {[
          { label: 'Requested',   key: 'requested',      color: 'text-black' },
          { label: 'In Progress', key: 'in_progress',     color: 'text-[#00A3FF]' },
          { label: 'In Review',   key: 'draft_submitted', color: 'text-[#FF8B4A]' },
          { label: 'Published',   key: 'published',       color: 'text-[#01CE91]' },
        ].map((s) => (
          <div key={s.label} className="bg-white p-5">
            <p className={`text-3xl font-semibold tracking-tight ${s.color}`}>{summary[s.key] ?? 0}</p>
            <p className="text-xs text-[#999] mt-1 font-mono uppercase tracking-widest">{s.label}</p>
          </div>
        ))}
      </div>

      {/* My files */}
      <div>
        <h2 className="text-xs font-mono uppercase tracking-widest text-[#999] mb-3">
          Your assigned files {myFiles.length ? `(${myFiles.length})` : ''}
        </h2>

        {!myFiles.length ? (
          <div className="text-sm text-[#666] bg-white border border-[#E1E1E1] p-6 text-center">
            No files assigned yet.{' '}
            <a href="/library" className="text-[#00A3FF] hover:underline">Browse the library</a>{' '}
            to claim one.
          </div>
        ) : (
          <div className="space-y-2">
            {myFiles.map((f) => (
              <DashboardClient key={f.id} file={f} email={email} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
