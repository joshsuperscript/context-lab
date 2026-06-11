'use client'

import { useState, useRef } from 'react'
import { MessageCircle, X, Plus } from 'lucide-react'
import { toast } from 'sonner'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface InterviewBotProps {
  fileId: string
  onInsert: (text: string) => void
}

export default function InterviewBot({ fileId, onInsert }: InterviewBotProps) {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  async function send(text?: string) {
    const userMessage = text ?? input.trim()
    if (!userMessage && messages.length > 0) return

    const newMessages: Message[] = [...messages, { role: 'user', content: userMessage || '' }]
    setMessages(newMessages)
    setInput('')
    setStreaming(true)

    const controller = new AbortController()
    abortRef.current = controller

    try {
      const res = await fetch('/api/interview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileId,
          message: userMessage,
          history: messages.map((m) => ({ role: m.role, content: m.content })),
        }),
        signal: controller.signal,
      })

      if (!res.ok || !res.body) throw new Error('Request failed')

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let assistantText = ''
      setMessages([...newMessages, { role: 'assistant', content: '' }])

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        assistantText += decoder.decode(value, { stream: true })
        setMessages([...newMessages, { role: 'assistant', content: assistantText }])
      }
    } catch (e: unknown) {
      if ((e as Error).name !== 'AbortError') toast.error('Interview request failed')
    } finally {
      setStreaming(false)
    }
  }

  function extractInsert(text: string): string | null {
    const match = text.match(/<insert>([\s\S]*?)<\/insert>/)
    return match ? match[1].trim() : null
  }

  if (!open) {
    return (
      <button
        onClick={() => { setOpen(true); if (messages.length === 0) send('Start the interview for this document.') }}
        className="fixed bottom-6 right-6 flex items-center gap-2 px-4 py-2.5 bg-[#00A3FF] text-white rounded-full shadow-lg hover:bg-[#0091e6] transition-colors text-sm font-medium"
      >
        <MessageCircle size={16} />
        Interview Bot
      </button>
    )
  }

  return (
    <div className="fixed bottom-6 right-6 w-80 bg-white rounded-2xl shadow-xl border border-gray-200 flex flex-col overflow-hidden" style={{ height: 480 }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-[#00A3FF] text-white">
        <div className="flex items-center gap-2">
          <MessageCircle size={15} />
          <span className="text-sm font-medium">Interview Bot</span>
        </div>
        <button onClick={() => setOpen(false)}><X size={15} /></button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.length === 0 && (
          <p className="text-xs text-gray-400 text-center mt-8">Starting your interview…</p>
        )}
        {messages.map((msg, i) => {
          const insertText = msg.role === 'assistant' ? extractInsert(msg.content) : null
          const displayText = msg.content.replace(/<insert>[\s\S]*?<\/insert>/g, '').trim()

          return (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] text-xs rounded-xl px-3 py-2 ${msg.role === 'user' ? 'bg-[#00A3FF] text-white' : 'bg-gray-100 text-gray-800'}`}>
                {displayText && <p className="whitespace-pre-wrap">{displayText}</p>}
                {insertText && (
                  <div className="mt-2 border-t border-gray-200 pt-2">
                    <div className="bg-white rounded-lg p-2 font-mono text-xs text-gray-700 whitespace-pre-wrap border border-gray-200">{insertText}</div>
                    <button
                      onClick={() => { onInsert(insertText); toast.success('Inserted into doc') }}
                      className="mt-1.5 flex items-center gap-1 text-[#00A3FF] hover:underline text-xs"
                    >
                      <Plus size={11} /> Insert into doc
                    </button>
                  </div>
                )}
              </div>
            </div>
          )
        })}
        {streaming && messages[messages.length - 1]?.role === 'user' && (
          <div className="flex justify-start">
            <div className="bg-gray-100 rounded-xl px-3 py-2 text-xs text-gray-400">Thinking…</div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-3 border-t border-gray-200 flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && send()}
          placeholder="Answer or ask a question…"
          disabled={streaming}
          className="flex-1 text-xs border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#00A3FF] disabled:opacity-50"
        />
        <button
          onClick={() => send()}
          disabled={streaming || !input.trim()}
          className="px-3 py-2 bg-[#00A3FF] text-white rounded-lg text-xs disabled:opacity-40"
        >
          Send
        </button>
      </div>
    </div>
  )
}
