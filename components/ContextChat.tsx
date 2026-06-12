'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'
import { Search, X, ExternalLink } from 'lucide-react'
import { pathToBreadcrumb } from '@/lib/notion'

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  files?: { id: string; title: string; breadcrumb: string; snippet: string }[]
}

export default function ContextChat() {
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const [history, setHistory] = useState<ChatMessage[]>([])
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  async function search() {
    const query = input.trim()
    if (!query) return
    const newHistory = [...history, { role: 'user' as const, content: query }]
    setHistory(newHistory)
    setInput('')
    setLoading(true)

    try {
      const res = await fetch('/api/context-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          history: newHistory.slice(-6).map((m) => ({ role: m.role, content: m.content })),
        }),
      })
      const data = await res.json()
      setHistory([...newHistory, {
        role: 'assistant',
        content: data.answer || '',
        files: data.files || [],
      }])
    } catch {
      setHistory([...newHistory, { role: 'assistant', content: 'Something went wrong. Try again.', files: [] }])
    } finally {
      setLoading(false)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }

  return (
    <div className="border-b border-[#E1E1E1] bg-white shrink-0">
      {/* Search bar */}
      <div className="flex items-center gap-2 px-4 py-2.5">
        <Search size={14} className="text-[#999] shrink-0" />
        <input
          ref={inputRef}
          value={open ? input : ''}
          onChange={(e) => { setInput(e.target.value); if (!open) setOpen(true) }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => e.key === 'Enter' && search()}
          placeholder="Search context… or ask a question"
          className="flex-1 text-sm text-black placeholder:text-[#999] focus:outline-none bg-transparent"
        />
        {open && (
          <button onClick={() => { setOpen(false); setHistory([]); setInput('') }} className="text-[#999] hover:text-black">
            <X size={14} />
          </button>
        )}
      </div>

      {/* Results panel */}
      {open && (
        <div className="border-t border-[#E1E1E1] max-h-80 overflow-y-auto">
          {history.length === 0 && !loading && (
            <p className="text-xs text-[#999] px-4 py-3">Ask a question or describe what you're looking for.</p>
          )}

          {history.map((msg, i) => (
            <div key={i}>
              {msg.role === 'user' && (
                <div className="px-4 py-2 bg-[#F9F9F9] border-t border-[#E1E1E1]">
                  <p className="text-xs text-[#666]">{msg.content}</p>
                </div>
              )}
              {msg.role === 'assistant' && (
                <div className="px-4 py-3 border-t border-[#E1E1E1]">
                  {msg.content && (
                    <p className="text-sm text-black mb-3 leading-relaxed">{msg.content}</p>
                  )}
                  {msg.files && msg.files.length > 0 && (
                    <div className="space-y-2">
                      {msg.files.map((f) => (
                        <div key={f.id} className="border border-[#E1E1E1] p-3 hover:border-black transition-colors">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-xs font-medium text-black truncate">{f.title}</p>
                              <p className="text-xs text-[#999] font-mono truncate">{f.breadcrumb}</p>
                            </div>
                            <Link href={`/view/${f.id}`} className="text-[#00A3FF] hover:text-black shrink-0">
                              <ExternalLink size={12} />
                            </Link>
                          </div>
                          {f.snippet && (
                            <p className="text-xs text-[#666] mt-2 line-clamp-2">{f.snippet}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="px-4 py-3 border-t border-[#E1E1E1]">
              <p className="text-xs text-[#999]">Searching…</p>
            </div>
          )}

          {/* Input row when panel open */}
          {history.length > 0 && (
            <div className="flex items-center gap-2 px-4 py-2 border-t border-[#E1E1E1] bg-[#F9F9F9]">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && search()}
                placeholder="Follow-up question…"
                className="flex-1 text-xs text-black placeholder:text-[#999] focus:outline-none bg-transparent"
              />
              <button
                onClick={search}
                disabled={!input.trim() || loading}
                className="text-xs px-3 py-1 bg-black text-white rounded-full hover:bg-[#00A3FF] disabled:opacity-40 transition-colors"
              >
                Ask
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
