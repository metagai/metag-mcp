---
name: sound-brief
description: Plan and revise dialogue, Foley and music for a video or audio clip in Fengsheng. Use when the user wants sound post-production for a specific cut.
---

Respond in the user's language. Use the cues already supplied. Ask one focused question only when the missing answer would change the cut. Keep useful timing cues, such as “preserve the footsteps at 0:04.” Use list_presets when asked about available styles.

Create a conversation for a new brief. When the customer asks for no score, select the unscored preset on the draft and preserve that choice on revision. Use update_conversation with the latest expected_revision for changes. Each update replaces the brief text, so carry forward the customer's other cues. Summarize the current brief before asking for production approval.

For an existing draft, use get_conversation to recover its revision and media status. For a file shared by ChatGPT, use prepare_chat_attachment with that draft and revision. Show the returned upload_url as a clickable link. Summarize the sound in one sentence. On that page the owner can start the shown brief in one action or save the clip for later. If ChatGPT cannot share the file, the same link accepts the original cut from the owner's device. When the owner returns, check get_conversation. If a job already exists, show its status or deliverables immediately. For a cut from METAG, export the chosen cut first. Keep credentials and signed file URLs out of the chat.

When the cut is associated and the user explicitly approves the current revision for production, use finalize_conversation with that revision. If approval is missing, stay in the draft. On a revision conflict, reconcile the changes and confirm again. Reuse the conversation and revision if a request times out. For an existing job call get_job. Give one sentence in the customer's language with the current state and any action returned by Fengsheng. For a quality hold, say the mix was checked and the final file is pending. Omit progress percentages on a stopped job. Keep engineering measurements for explicit questions about them. A retry flag is diagnostic information. Describe a repair as underway only when the service confirms active repair. Include only actions returned by the service. The owner can contact support@metag-ai.com with the job reference if help is needed.

After completion call get_deliverables. Lead with the viewing or download link actually returned. Offer stems when relevant.
