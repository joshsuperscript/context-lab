// Linear GraphQL API — adapted from repos/hex-monitor/lib/triage/linear.ts

const LINEAR_API = 'https://api.linear.app/graphql'

async function linearQuery(query: string, variables?: Record<string, unknown>) {
  const res = await fetch(LINEAR_API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: process.env.LINEAR_API_KEY!,
    },
    body: JSON.stringify({ query, variables }),
  })
  const json = await res.json()
  if (json.errors) throw new Error(json.errors[0].message)
  return json.data
}

const STATUS_LABELS: Record<string, string> = {
  requested: 'Todo',
  in_progress: 'In Progress',
  draft_submitted: 'In Review',
  approved: 'Done',
  published: 'Done',
}

export async function getOrCreateContextProject(): Promise<string> {
  const teamId = process.env.LINEAR_TEAM_ID
  if (!teamId) throw new Error('LINEAR_TEAM_ID not set')

  const data = await linearQuery(
    `query($teamId: String!) {
      team(id: $teamId) {
        projects { nodes { id name } }
      }
    }`,
    { teamId }
  )

  const projects = data.team.projects.nodes as { id: string; name: string }[]
  const existing = projects.find((p) => p.name === 'Context Library')
  if (existing) return existing.id

  const created = await linearQuery(
    `mutation($teamId: String!, $name: String!) {
      projectCreate(input: { teamIds: [$teamId], name: $name }) {
        project { id }
      }
    }`,
    { teamId, name: 'Context Library' }
  )
  return created.projectCreate.project.id
}

export async function createLinearTicket(params: {
  title: string
  description: string
  priority: string
  appUrl: string
}): Promise<string | null> {
  if (!process.env.LINEAR_API_KEY || !process.env.LINEAR_TEAM_ID) return null

  try {
    const projectId = await getOrCreateContextProject()
    const priorityMap: Record<string, number> = { high: 1, medium: 2, low: 3 }

    const data = await linearQuery(
      `mutation($input: IssueCreateInput!) {
        issueCreate(input: $input) { issue { id identifier } }
      }`,
      {
        input: {
          teamId: process.env.LINEAR_TEAM_ID,
          projectId,
          title: `[Context] ${params.title}`,
          description: `${params.description}\n\n[Open in Context Hub](${params.appUrl})`,
          priority: priorityMap[params.priority] ?? 2,
        },
      }
    )
    return data.issueCreate.issue.id
  } catch (e) {
    console.error('Linear ticket creation failed:', e)
    return null
  }
}

export async function updateLinearTicketStatus(ticketId: string, status: string): Promise<void> {
  if (!process.env.LINEAR_API_KEY || !process.env.LINEAR_TEAM_ID) return

  try {
    const stateName = STATUS_LABELS[status] ?? 'Todo'
    const teamData = await linearQuery(
      `query($teamId: String!) {
        team(id: $teamId) { states { nodes { id name } } }
      }`,
      { teamId: process.env.LINEAR_TEAM_ID }
    )
    const states = teamData.team.states.nodes as { id: string; name: string }[]
    const state = states.find((s) => s.name === stateName)
    if (!state) return

    await linearQuery(
      `mutation($id: String!, $stateId: String!) {
        issueUpdate(id: $id, input: { stateId: $stateId }) { success }
      }`,
      { id: ticketId, stateId: state.id }
    )
  } catch (e) {
    console.error('Linear status update failed:', e)
  }
}

export async function updateLinearAssignee(ticketId: string, email: string): Promise<void> {
  if (!process.env.LINEAR_API_KEY) return

  try {
    const userData = await linearQuery(
      `query($email: String!) { users(filter: { email: { eq: $email } }) { nodes { id } } }`,
      { email }
    )
    const userId = userData.users.nodes[0]?.id
    if (!userId) return

    await linearQuery(
      `mutation($id: String!, $userId: String!) {
        issueUpdate(id: $id, input: { assigneeId: $userId }) { success }
      }`,
      { id: ticketId, userId }
    )
  } catch (e) {
    console.error('Linear assignee update failed:', e)
  }
}
