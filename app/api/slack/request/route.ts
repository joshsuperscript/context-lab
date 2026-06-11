import { createContextFile } from '@/lib/notion'
import { notifyNewRequest, verifySlackSignature } from '@/lib/slack'
import { NextRequest, NextResponse } from 'next/server'

// Parses "[section] title" format, e.g. "[pricing] ALE service overview"
function parseSlashCommand(text: string): { title: string; section: string } {
  const match = text.match(/^\[([^\]]+)\]\s+(.+)/)
  if (match) {
    return { section: match[1].toLowerCase().trim(), title: match[2].trim() }
  }
  return { title: text.trim(), section: 'company' }
}

export async function POST(req: NextRequest) {
  const body = await req.text()
  const timestamp = req.headers.get('x-slack-request-timestamp') ?? ''
  const signature = req.headers.get('x-slack-signature') ?? ''

  const signingSecret = process.env.SLACK_SIGNING_SECRET ?? ''
  if (signingSecret && !verifySlackSignature(signingSecret, signature, timestamp, body)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  const params = new URLSearchParams(body)
  const text = params.get('text')?.trim() ?? ''
  const userName = params.get('user_name') ?? 'someone'
  const userEmail = `${userName}@superscript.nyc`

  if (!text) {
    return NextResponse.json({
      response_type: 'ephemeral',
      text: 'Usage: `/request-context [section] Title of the doc`\nExample: `/request-context [pricing] ALE service overview`',
    })
  }

  const { title, section } = parseSlashCommand(text)

  try {
    const file = await createContextFile({
      path: `context/${section}/${title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}.md`,
      title,
      section,
      status: 'requested',
      priority: 'medium',
      assigned_to: null,
      submitted_by: userEmail,
      submitted_at: null,
      reviewed_by: null,
      reviewed_at: null,
      review_note: null,
      linear_ticket_id: null,
      is_expansion: false,
      author_hints: [userEmail],
      bus_factor: false,
    })

    // Notify the channel (fire-and-forget)
    notifyNewRequest({
      title,
      fileId: file.id,
      requestedBy: userName,
      appUrl: process.env.NEXT_PUBLIC_APP_URL ?? '',
    }).catch(console.error)

    return NextResponse.json({
      response_type: 'ephemeral',
      text: `:white_check_mark: Added *${title}* to the context library as a new request. <${process.env.NEXT_PUBLIC_APP_URL}/library|View in library →>`,
    })
  } catch (e) {
    console.error('Failed to create context file from Slack:', e)
    return NextResponse.json({
      response_type: 'ephemeral',
      text: ':x: Something went wrong. Try again or add it manually in the app.',
    })
  }
}
