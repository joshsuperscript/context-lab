const SLACK_API = 'https://slack.com/api'

async function slackPost(method: string, body: Record<string, unknown>) {
  const token = process.env.SLACK_BOT_TOKEN
  if (!token) return null
  const res = await fetch(`${SLACK_API}/${method}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
  return res.json()
}

async function lookupSlackUser(email: string): Promise<string | null> {
  try {
    const res = await fetch(`${SLACK_API}/users.lookupByEmail?email=${encodeURIComponent(email)}`, {
      headers: { Authorization: `Bearer ${process.env.SLACK_BOT_TOKEN}` },
    })
    const data = await res.json()
    return data.ok ? data.user.id : null
  } catch {
    return null
  }
}

export async function notifyAssignment(params: {
  assigneeEmail: string
  fileTitle: string
  fileId: string
  appUrl: string
}): Promise<void> {
  const channelId = process.env.SLACK_CONTEXT_CHANNEL_ID
  if (!channelId || !process.env.SLACK_BOT_TOKEN) return

  const userId = await lookupSlackUser(params.assigneeEmail)
  const mention = userId ? `<@${userId}>` : params.assigneeEmail.split('@')[0]
  const link = `${params.appUrl}/write/${params.fileId}`

  await slackPost('chat.postMessage', {
    channel: channelId,
    text: `:pencil2: ${mention} you've been assigned to write *${params.fileTitle}* — <${link}|Start writing →>`,
  })
}

export async function notifyNewRequest(params: {
  title: string
  fileId: string
  requestedBy: string
  appUrl: string
}): Promise<void> {
  const channelId = process.env.SLACK_CONTEXT_CHANNEL_ID
  if (!channelId || !process.env.SLACK_BOT_TOKEN) return

  const link = `${params.appUrl}/library`
  await slackPost('chat.postMessage', {
    channel: channelId,
    text: `:new: *${params.requestedBy}* requested a new context file: *${params.title}* — <${link}|View in library →>`,
  })
}

// Verify Slack slash command requests using signing secret
export function verifySlackSignature(
  signingSecret: string,
  signature: string,
  timestamp: string,
  body: string
): boolean {
  // Simple timestamp check — reject requests older than 5 minutes
  const fiveMinutesAgo = Math.floor(Date.now() / 1000) - 60 * 5
  if (parseInt(timestamp) < fiveMinutesAgo) return false

  // In production, compute HMAC-SHA256 of `v0:${timestamp}:${body}` and compare
  // For now, return true if signing secret isn't configured (dev mode)
  if (!signingSecret) return true

  // Node.js crypto (available in Next.js API routes, not Edge)
  const crypto = require('crypto')
  const sigBase = `v0:${timestamp}:${body}`
  const computedSig = `v0=${crypto.createHmac('sha256', signingSecret).update(sigBase).digest('hex')}`
  return crypto.timingSafeEqual(Buffer.from(computedSig), Buffer.from(signature))
}
