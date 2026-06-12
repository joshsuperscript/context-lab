import { auth } from '@/lib/auth'
import { getContextFile, getPageMarkdown, pathToBreadcrumb, displayStatus } from '@/lib/notion'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import ReactMarkdown from 'react-markdown'
import { StatusBadge } from '@/components/StatusBadge'
import { ArrowLeft, PenLine, MessageCircle } from 'lucide-react'

export default async function ViewPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  const email = session?.user?.email!
  const { id } = await params

  const file = await getContextFile(id)
  if (!file) notFound()

  const contentPageId = file.source_page_id ?? id
  const content = await getPageMarkdown(contentPageId).catch(() => '')
  const breadcrumb = pathToBreadcrumb(file.path)
  const ds = displayStatus(file)

  const statusMap: Record<string, string> = {
    published: 'published',
    assigned: 'in_progress',
    unassigned: 'requested',
    stale: 'stale',
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3 bg-white border-b border-[#E1E1E1] shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <Link href="/tree" className="text-[#999] hover:text-black shrink-0">
            <ArrowLeft size={16} />
          </Link>
          <div className="min-w-0">
            {/* Breadcrumb */}
            <div className="flex items-center gap-1 text-xs text-[#999] font-mono mb-0.5 flex-wrap">
              {breadcrumb.map((seg, i) => (
                <span key={i} className="flex items-center gap-1">
                  {i > 0 && <span>/</span>}
                  <span className={i === breadcrumb.length - 1 ? 'text-black font-medium' : ''}>{seg}</span>
                </span>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge status={statusMap[ds] || 'requested'} />
              {file.assigned_to && (
                <span className="text-xs text-[#999]">
                  {file.assigned_to === email ? 'You' : file.assigned_to.split('@')[0]}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Link
            href={`/write/${file.id}?mode=interview`}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-[#E1E1E1] hover:border-black text-[#666] hover:text-black rounded-full transition-colors"
          >
            <MessageCircle size={11} /> Interview to update
          </Link>
          <Link
            href={`/write/${file.id}`}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-black text-white rounded-full hover:bg-[#00A3FF] transition-colors"
          >
            <PenLine size={11} /> Edit
          </Link>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-8 py-8 max-w-3xl">
        {content ? (
          <div className="prose prose-sm max-w-none prose-headings:font-semibold prose-headings:text-black prose-p:text-[#333] prose-code:text-[#00A3FF] prose-code:bg-[#F1F1F1] prose-code:px-1">
            <ReactMarkdown>{content}</ReactMarkdown>
          </div>
        ) : (
          <div className="text-center py-16">
            <p className="text-sm text-[#999] mb-4">No content yet.</p>
            <Link
              href={`/write/${file.id}`}
              className="text-sm px-6 py-2.5 bg-black text-white rounded-full hover:bg-[#00A3FF] transition-colors"
            >
              Start writing
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
