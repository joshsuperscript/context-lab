'use client'

import { useState, useEffect, useCallback } from 'react'
import { ChevronRight, ChevronLeft, Save, CheckCircle } from 'lucide-react'
import { toast } from 'sonner'
import dynamic from 'next/dynamic'

const MDEditor = dynamic(() => import('@uiw/react-md-editor'), { ssr: false })

type SyncState = 'idle' | 'saving' | 'saved'

export default function PersonalMdSidebar() {
  const [open, setOpen] = useState(false)
  const [pageId, setPageId] = useState<string | null>(null)
  const [content, setContent] = useState('')
  const [savedContent, setSavedContent] = useState('')
  const [loading, setLoading] = useState(false)
  const [syncState, setSyncState] = useState<SyncState>('idle')

  const isDirty = content !== savedContent

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/personal-md')
      if (!res.ok) return
      const data = await res.json()
      setPageId(data.pageId)
      setContent(data.content)
      setSavedContent(data.content)
    } catch {
      // Staff page not found — show empty editor
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (open && !pageId) load()
  }, [open, pageId, load])

  async function save() {
    if (!pageId || !isDirty) return
    setSyncState('saving')
    try {
      const res = await fetch('/api/personal-md', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pageId, content }),
      })
      if (!res.ok) throw new Error()
      setSavedContent(content)
      setSyncState('saved')
      setTimeout(() => setSyncState('idle'), 2000)
    } catch {
      toast.error('Failed to save — try again')
      setSyncState('idle')
    }
  }

  return (
    <div className={`flex shrink-0 transition-all duration-300 ${open ? 'w-96' : 'w-0'}`}>
      {/* Toggle button */}
      <button
        onClick={() => setOpen(!open)}
        className="absolute right-0 top-1/2 -translate-y-1/2 z-10 flex items-center justify-center w-5 h-12 bg-white border border-gray-200 border-r-0 rounded-l-md text-gray-400 hover:text-gray-700 shadow-sm"
        style={{ right: open ? 384 : 0 }}
        title={open ? 'Close personal.md' : 'Open personal.md'}
      >
        {open ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>

      {open && (
        <div className="w-96 flex flex-col border-l border-gray-200 bg-white overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
            <div>
              <h2 className="text-sm font-medium text-gray-900">personal.md</h2>
              <p className="text-xs text-gray-400">Your staff context file</p>
            </div>
            <button
              onClick={save}
              disabled={!isDirty || syncState === 'saving'}
              className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg bg-[#00A3FF] text-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#0091e6] transition-colors"
            >
              {syncState === 'saved' ? (
                <><CheckCircle size={12} /> Saved</>
              ) : syncState === 'saving' ? (
                'Saving…'
              ) : (
                <><Save size={12} /> {isDirty ? 'Publish' : 'Up to date'}</>
              )}
            </button>
          </div>

          {/* Editor */}
          <div className="flex-1 overflow-hidden" data-color-mode="light">
            {loading ? (
              <div className="p-4 text-sm text-gray-400">Loading your context file…</div>
            ) : (
              <MDEditor
                value={content}
                onChange={(v) => setContent(v ?? '')}
                height="100%"
                preview="edit"
                hideToolbar={false}
                style={{ border: 'none', borderRadius: 0 }}
              />
            )}
          </div>
        </div>
      )}
    </div>
  )
}
