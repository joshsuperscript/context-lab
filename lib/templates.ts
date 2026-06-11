export const SECTION_TEMPLATES: Record<string, string> = {
  pricing: `# {title}

## What this service does

One-sentence summary of the service's purpose.

## Inputs

What goes in — data sources, upstream services, API parameters.

## Outputs

What comes out — data shape, downstream consumers.

## How it works

The core logic. Step-by-step flow for the most common path.

## Failure modes

What breaks, how it fails, what it affects downstream.

## Where to find it

Repo name(s), key file paths, Datadog dashboard links.

## Who to ask

Primary: {author}
`,

  technology: `# {title}

## What this is

One-paragraph description for someone who hasn't used this system.

## How we use it

What we send to / receive from this system. Integration points.

## Key configuration

Non-obvious settings, credentials locations, environment differences (dev vs prod).

## Common operations

Runbook-style: how to do the 2-3 things people most often need to do.

## Known quirks

Undocumented behavior, gotchas, things that bit us before.

## Who owns it

Primary: {author}
`,

  customers: `# {customer}

## What they do

Their business in 2-3 sentences.

## Why they bought Superscript

The specific pain point we solve for them.

## Products deployed

Which Superscript products they use and configuration notes.

## Key contacts

| Name | Role | Email | Notes |
|---|---|---|---|

## Known quirks

IT restrictions, EHR configuration oddities, workflow exceptions we built for them.

## Deployment notes

When deployed, any non-standard setup, hardware installed.
`,

  products: `# {title}

## What it does

One-paragraph description for a new hire.

## Who uses it

User persona: which staff at a practice, what they do with it.

## How it works

Key flows: the 2-3 most important things a user does and how the system handles them.

## Integration points

What it reads from / writes to: EHR, payments, other Superscript products.

## Configuration

How practices configure this product. Key settings.

## Known issues / limitations

Current constraints or known bugs worth documenting.
`,

  healthcare: `# {title}

## What this is

Define the concept for someone outside healthcare.

## How it works in practice

The real-world workflow — what a practice staff member does, what happens in the system.

## How Superscript interacts with it

Where we fit in, what data we consume or produce.

## Common questions

The top 3-5 things people ask about this topic.

## Key terms

Glossary of healthcare-specific terms used in this context.
`,

  company: `# {title}

## Summary

2-3 sentence overview.

## Details

The full context.

## Who owns this

Primary: {author}
`,

  design: `# {title}

## Overview

What this covers.

## Guidelines

Specific rules or patterns to follow.

## Examples

Where to see this applied.
`,

  'go-to-market': `# {title}

## Overview

2-3 sentence summary.

## Details

Full context.

## Who owns this

Primary: {author}
`,
}

export function getTemplate(section: string, title: string, author?: string): string {
  const template = SECTION_TEMPLATES[section] ?? SECTION_TEMPLATES['company']
  return template
    .replace(/\{title\}/g, title)
    .replace(/\{author\}/g, author ?? 'TBD')
    .replace(/\{customer\}/g, title)
}
