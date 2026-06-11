import { auth } from '@/lib/auth'
import { queryContextFiles } from '@/lib/notion'
import DashboardClient from '@/components/DashboardClient'

export default async function DashboardPage() {
  const session = await auth()
  const email = session?.user?.email!

  const myFiles = await queryContextFiles({ assigned_to: email })
  const allFiles = await queryContextFiles()

  const summary = allFiles.reduce(
    (acc, f) => { acc[f.status] = (acc[f.status] ?? 0) + 1; return acc },
    {} as Record<string, number>
  )

  return (
    <div className="p-8 max-w-3xl">
      <h1 className="text-2xl font-semibold text-gray-900 mb-1">Dashboard</h1>
      <p className="text-sm text-gray-500 mb-8">Welcome back, {email.split('@')[0]}</p>

      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-3 mb-10">
        {[
          { label: 'Requested',  key: 'requested',       color: 'text-gray-700' },
          { label: 'In Progress',key: 'in_progress',      color: 'text-blue-700' },
          { label: 'In Review',  key: 'draft_submitted',  color: 'text-yellow-700' },
          { label: 'Published',  key: 'published',        color: 'text-green-700' },
        ].map((s) => (
          <div key={s.label} className="bg-white border border-gray-200 rounded-xl p-4">
            <p className={`text-2xl font-semibold ${s.color}`}>{summary[s.key] ?? 0}</p>
            <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* My files */}
      <div>
        <h2 className="text-sm font-semibold text-gray-700 mb-3">
          Your assigned files {myFiles.length ? `(${myFiles.length})` : ''}
        </h2>

        {!myFiles.length ? (
          <div className="text-sm text-gray-400 bg-white border border-gray-200 rounded-xl p-6 text-center">
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
