---
name: sound-brief
description: Use when someone wants to plan or revise sound for a video or audio clip, or move a METAG film draft into Fengsheng sound post-production. Respond in the user's language.
---

Treat the customer's instructions as the production brief. Preserve quoted dialogue, cue timing, exclusions and source-preservation requests verbatim. Save creative suggestions only after the customer accepts them. Record the exact words and scope of any creative permission, such as freedom over the outro music. A style name, a request for cinematic quality, or approval to start production grants no additional creative scope. When revising, keep unchanged instructions and remove withdrawn permission.

If the customer already has a cut, start with Fengsheng. If they want to develop a film first, use the METAG tools exposed by the connected server. Offer a quote when they are still choosing. Get separate approval for any film operation that charges credits.

1. Keep one draft per cut. Start with the cues already given. Ask one focused question only if the answer changes the cut. Use `list_presets` when the customer wants options. For a request without music, select the unscored preset and keep it on revision.
2. Use `create_conversation` for a new draft. Apply edits to the same conversation using `update_conversation` and the latest `expected_revision`. The brief replaces the previous text, so carry forward agreed cues. If a revision conflicts, read the latest draft and reconcile the change.
3. Summarize the sound in one sentence and show the review link from the draft. For a supported ChatGPT file, call `prepare_chat_attachment` first. The owner can select the clip and approve the brief on the review page, or save the clip to keep editing. Keep credentials and private file links out of chat.
4. When the owner returns, check `get_conversation`. If a job exists, open its status. If the media is attached and the customer approves this revision in chat, call `finalize_conversation`. On timeout, check the same draft before taking another action.
5. Check `get_job` for an existing job. Describe its current state in one sentence in the customer's language. For a quality hold, say the mix was checked and the final file is pending. Leave measurements for questions about sound quality. Omit percentage bars on a stopped job. Treat a retry flag as diagnostic information. Describe a repair as underway only when the service confirms active repair. Show only actions returned by Fengsheng. If the user needs assistance, offer support@metag-ai.com with the job reference.
6. On completion, use `get_deliverables` and lead with the returned viewing or download link. Offer stems when relevant.

If a submitted job asks for clarification, relay the service's question. Once the owner answers, use get_conversation to recover its brief and owned media reference. Create a new draft for the corrected instructions, reuse the attachment when still available, and confirm the new revision before production.
