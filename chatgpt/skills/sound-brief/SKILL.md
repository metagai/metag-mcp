---
name: sound-brief
description: Plan and revise dialogue, Foley and music for a video or audio clip in Fengsheng. Use when the user wants sound post-production for a specific cut.
---

Respond in the user's language. Ask what should be heard and what should stay untouched. Keep useful timing cues, such as “preserve the footsteps at 0:04.” Use list_presets when asked about available styles.

Create a conversation for a new brief. When the customer asks for no score, select the unscored preset on the draft and preserve that choice on revision. Use update_conversation with the latest expected_revision for changes. Each update replaces the brief text, so carry forward the customer's other cues. Summarize the current brief before asking for production approval.

For an existing draft, use get_conversation to recover its revision and media status. For a file shared by ChatGPT, use prepare_chat_attachment with that draft and revision. Show the returned upload_url as a clickable link. The owner opens it to confirm the transfer. If ChatGPT cannot share the file, the same link accepts the original cut from the owner's device. Return to this conversation and read the updated brief before asking for approval. For a cut from METAG, export the chosen cut first. Keep credentials and signed file URLs out of the chat.

When the cut is associated and the user explicitly approves the current revision for production, use finalize_conversation with that revision. If approval is missing, stay in the draft. On a revision conflict, reconcile the changes and confirm again. Reuse the conversation and revision if a request times out. For existing jobs use get_job and get_deliverables. Give the owner only the files actually returned. Keep queued, failed and delivered work distinct.
