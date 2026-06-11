'use client'

import { useState, useEffect } from 'react'

export default function NotionPageViewer({ notionPageId }: { notionPageId: string | null }) {
  const [content, setContent] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!notionPageId) return
    setLoading(true)
    fetch(`/api/notion/page/${notionPageId}`)
      .then((r) => r.json())
      .then((d) => setContent(d.content))
      .catch(() => setContent('Failed to load content'))
      .finally(() => setLoading(false))
  }, [notionPageId])

  if (!notionPageId) return <p className="text-sm text-gray-400">No Notion page linked.</p>
  if (loading) return <p className="text-sm text-gray-400">Loading content…</p>
  if (!content) return null

  return (
    <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans leading-relaxed">
      {content}
    </pre>
  )
}
