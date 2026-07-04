# Prospect Share-Link — Loops email templates

Copy for the Loops automation triggered by the **`prospect_doc_shared`** event.
That event fires from the "Email the link to the prospect" toggle on
`/admin/share-documents` (see `apps/web/app/api/admin/share-documents/create/route.ts`
→ `onProspectDocShared` in `apps/web/lib/loops.ts`).

Until this automation is built **and published** in the Loops dashboard, the
event fires and logs but no email is delivered. `emailSent: true` in the UI just
means Loops accepted the event.

## Automation shape

One automation, triggered by event `prospect_doc_shared`, branching on the
`category` property:

```
Trigger: event  prospect_doc_shared
  ├─ category is "proposal"   → Proposal email       (#1)
  ├─ category is "alignment"  → Alignment Doc email   (#2)
  ├─ category is "scope"      → Scope email           (#3)
  └─ else (any custom label)  → Default / fallback    (#4)
```

## Event properties (Loops data variables)

Insert each in the email as a data variable matching the property name:

| Variable | Meaning |
|---|---|
| `shareUrl` | The private `/d/<token>` link — set every CTA button URL to this |
| `docTitle` | Document title, e.g. "Huemor — Alignment Doc" |
| `category` | Branch key: `proposal` \| `alignment` \| `scope` \| a custom label |
| `categoryLabel` | Human-friendly label for display copy (used in the fallback email) |
| `prospectName` | Full name as entered |
| `firstName` | First token of the name — **set a Loops fallback of "there"** |
| `requiresApproval` | Whether the doc shows an Approve button |

## Approval line

Each email has an optional *"approve at the bottom"* sentence (italic below).
Only include it when the doc requires approval. Simplest: keep **Require
approval ON** for proposal/alignment/scope (the default) so the line is always
valid — or add a `requiresApproval is true` condition in Loops to show/hide it.

---

## 1. Proposal — branch `category is "proposal"`

**Subject:** Your proposal, {{firstName}}
**Preview:** The plan we talked through — all in one place.

Hi {{firstName}},

Here's the proposal I put together for you — **{{docTitle}}**. It lays out
exactly what we'd do together, how it works, and what it costs. No surprises, no
fine print you need a lawyer to decode.

Take a few minutes with it whenever you're ready:

**[ Review the proposal → ]**  *(button → {{shareUrl}})*

If anything's unclear or you want to push on a piece of it, just reply to this
email — I'd rather sort it out now than have you wondering.

*When it lands right, hit **Approve** at the bottom and we'll get moving.*

— Tim

---

## 2. Alignment Doc — branch `category is "alignment"`

**Subject:** Making sure we're aligned, {{firstName}}
**Preview:** Here's what I heard — tell me if I got it right.

Hi {{firstName}},

Before we go further, I put our shared understanding in writing —
**{{docTitle}}**. It's what I heard from you, where I think the real opportunity
is, and what working together would actually look like.

Give it a read and make sure it matches what's in your head:

**[ Review the alignment doc → ]**  *(button → {{shareUrl}})*

If I've missed something or got a detail wrong, reply and set me straight.
Getting this right up front is what makes everything after it easy.

*If it's on the money, **approve** it at the bottom and we'll take the next step.*

— Tim

---

## 3. Scope — branch `category is "scope"`

**Subject:** The scope of work, {{firstName}}
**Preview:** Exactly what's included — line by line.

Hi {{firstName}},

Here's the detailed scope for what we discussed — **{{docTitle}}**. It spells
out what's in, what's out, and how we'll work, so there's zero ambiguity once we
start.

Have a look:

**[ Review the scope → ]**  *(button → {{shareUrl}})*

Questions on any line item? Reply here and I'll walk you through it.

*Happy with it? **Approve** at the bottom and we're off.*

— Tim

---

## 4. Default / fallback — the `else` branch (any custom label)

Uses `{{categoryLabel}}` so it adapts to whatever was typed (e.g. "Partnership
Memo," "Retainer Options").

**Subject:** {{categoryLabel}} for you, {{firstName}}
**Preview:** The {{categoryLabel}} we talked about — ready for you.

Hi {{firstName}},

I put together the {{categoryLabel}} we talked about — **{{docTitle}}**.
Everything's in one place for you to review whenever you've got a few minutes.

**[ Take a look → ]**  *(button → {{shareUrl}})*

If anything needs a tweak or you want to talk it through, just reply.

*If it looks right, **approve** it at the bottom and we'll keep things moving.*

— Tim
