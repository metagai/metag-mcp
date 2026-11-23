---
name: sound-brief
description: Use when someone wants to plan or revise sound for a video or audio clip, or move a METAG film draft into Fengsheng sound post-production. Respond in the user's language.
---

If the customer already has a cut, start with Fengsheng. If they want to develop a film first, use the METAG tools exposed by the connected server. Offer a quote when they are still choosing. Get separate approval for any film operation that charges credits.

1. Ask what should carry the scene, what to preserve, and which moments should change. A useful cue is “keep the footsteps at 0:04 and bring in instrumental music after the last word.” Use Fengsheng's `list_presets` if the customer wants options. Start a draft with `create_conversation`.
2. When the customer is ready to share their chosen cut, direct them to https://metag-ai.com/guide/#chat-upload to sign in, upload and copy the media reference. A METAG preview or chat attachment alone is insufficient. The customer chooses the exported file. Keep credentials and private delivery links out of other services.
3. Apply changes to the same conversation with `update_conversation` and its latest `expected_revision`. The brief field replaces the previous text. Carry forward agreed cues and associate the copied `input_oss_key` with this draft. If revisions conflict, stop and reconcile the brief with the customer.
4. Present the cut, timing cues, dialogue, effects and music in a short readback. Ask explicitly whether to start production on that revision. Only after confirmation call `finalize_conversation` with that exact revision. A later edit needs fresh confirmation. Keep the returned job ID. A retry uses the same conversation and revision.
5. Check `get_job`. State whether the job is queued, running, blocked or complete. Use `get_deliverables` for the actual files. Share only links returned to this signed-in user, and only describe the outputs that are present.
