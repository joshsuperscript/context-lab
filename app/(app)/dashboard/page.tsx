import { auth } from '@/lib/auth'
import { queryContextFiles, displayStatus, pathToBreadcrumb } from '@/lib/notion'
import Link from 'next/link'
import { StatusBadge } from '@/components/StatusBadge'

function FileRow({ file, email }: { file: Awaited<ReturnType<typeof queryContextFiles>>[0]; email: string }) {
  const breadcrumb = pathToBreadcrumb(file.path)
  const ds = displayStatus(file)
  return (
    <Link
      href={ds === 'published' || ds === 'stale' ? `/view/${file.id}` : `/write/${file.id}`}
      className="flex items-center gap-3 px-4 py-3 bg-white border border-[#E1E1E1] hover:border-black transition-colors"
    >
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-black truncate">{file.title}</p>
        <p className="text-xs text-[#999] font-mono truncate mt-0.5">{breadcrumb.join(' / ')}</p>
        {file.review_note && ds === 'stale' && (
          <p className="text-xs text-[#FF8B4A] mt-1 truncate">"{file.review_note}"</p>
        )}
      </div>
      <StatusBadge status={file.status} />
      <span className="text-xs text-[#00A3FF] shrink-0">
        {ds === 'published' || ds === 'stale' ? 'View →' : 'Write →'}
      </span>
    </Link>
  )
}

function Section({ title, subtitle, files, email, emptyText }: {
  title: string
  subtitle: string
  files: Awaited<ReturnType<typeof queryContextFiles>>
  email: string
  emptyText?: string
}) {
  return (
    <div className="mb-8">
      <div className="mb-3">
        <h2 className="text-xs font-mono uppercase tracking-widest text-[#999]">{title}</h2>
        <p className="text-xs text-[#999] mt-0.5">{subtitle}</p>
      </div>
      {files.length === 0 ? (
        <p className="text-sm text-[#999] border border-dashed border-[#E1E1E1] px-4 py-6 text-center">{emptyText}</p>
      ) : (
        <div className="space-y-px border border-[#E1E1E1]">
          {files.map((f) => <FileRow key={f.id} file={f} email={email} />)}
        </div>
      )}
    </div>
  )
}

export default async function DashboardPage() {
  const session = await auth()
  const email = session?.user?.email!

  let myFiles: Awaited<ReturnType<typeof queryContextFiles>> = []
  try {
    myFiles = await queryContextFiles({ assigned_to: email })
  } catch (e) {
    console.error('Dashboard load failed:', e)
  }

  const toWrite    = myFiles.filter((f) => { const ds = displayStatus(f); return ds === 'assigned' || ds === 'unassigned' })
  const needsUpdate = myFiles.filter((f) => displayStatus(f) === 'stale')
  const published  = myFiles.filter((f) => displayStatus(f) === 'published')

  const name = email.split('@')[0]

  return (
    <div className="p-8 max-w-2xl">
      <h1 className="text-xl font-semibold text-black tracking-tight mb-0.5">Hi, {name}</h1>
      <p className="text-xs text-[#999] font-mono mb-8">
        {toWrite.length} to write · {needsUpdate.length} stale · {published.length} published
      </p>

      <Section
        title="To write"
        subtitle="Your assigned context files that haven't been published yet."
        files={toWrite}
        email={email}
        emptyText="Nothing assigned — head to the library to claim something."
      />

      <Section
        title="Needs update"
        subtitle="You published these but they've been flagged as stale."
        files={needsUpdate}
        email={email}
        emptyText="All your published content is up to date."
      />

      <Section
        title="Published"
        subtitle="Context you've contributed."
        files={published}
        email={email}
        emptyText="Nothing published yet."
      />
    </div>
  )
}
