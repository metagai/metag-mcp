# Fengsheng support

Email support@metag-ai.com for sign-in, production or delivery help. Include your job ID if a job was created. Keep passwords, access tokens and private download links out of support messages.

To start from a film made with METAG, export the cut you want to use. In the Fengsheng upload guide, sign in with the same account you use for your chat connection. Open the media link from your saved brief and choose the clip there. Review the sound brief and choose **按此方案开始制作** to upload and start. The progress page opens automatically. Choose **仅保存素材** to keep editing in chat. The general upload page also offers a reference you can paste into chat. You choose when the sound brief goes into production. [Upload guide](https://metag-ai.com/guide/#chat-upload)

If a queue request times out, ask about the same conversation before starting another one. The job page shows the current stage. If a mix is held in quality review, use the same page to check its status. For help, send the job reference to support@metag-ai.com. On completion, open the same page to play or download the output. You can contact support for a deletion request. [Privacy policy](https://metag-ai.com/privacy.html)

### Try it in ChatGPT

In ChatGPT on the web, open Plugins, select the plus button and choose **Add custom MCP server**. Enter the name Fengsheng and the server URL `https://metag-ai.com/fengsheng/mcp`. Select OAuth and create the plugin. Install it in your workspace and authorize the Fengsheng account used for your uploads. Workspace permissions apply. Start with “Which sound styles are available?” [OpenAI connection guide](https://developers.openai.com/plugins/deploy/connect-chatgpt)

If a brief is waiting for a clip, ask Fengsheng to reopen the saved draft and show its media link. On that page, confirm the shared ChatGPT file when available, or choose the original on your device. The same draft link reopens the job after production starts. If your client still lists the previous tools, refresh the connection.

For a repeatable example, download the four-second clapper cut and upload it in the guide. Ask to preserve the two impacts, select the unscored style, and review the brief before starting. After you approve it, ask for the job status and the delivered files. The walkthrough shows the source and the resulting mix from a production run with an internal test account. [Sample clip](./review/clapper.mp4) · [Service walkthrough](./review/fengsheng-walkthrough.mp4)

### Directing the sound

Put the sounds you want to keep, change or remove in the brief. Quote any fixed dialogue and include its cue time. If you want Fengsheng to choose something, name that part explicitly, for example “Choose the music for the last two seconds. Keep the footsteps and dialogue as recorded.” Review the current wording before starting. You can revise or withdraw that permission while the cut is a draft.

### Use another chat model

If your chat app has no Fengsheng connection, open the review page, paste the agreed sound brief and choose your clip. **按此方案开始制作** opens the same production and delivery workflow. [Bring a brief from any chat](https://metag-ai.com/guide/?new=1#chat-upload)

For an application using an OpenAI-compatible Chat Completions endpoint, register the exported `soundBriefTool` in the model's tools list. When the model requests `save_sound_brief`, validate the tool name and dispatch its JSON arguments to `saveSoundBrief`. Pass the customer's Fengsheng OAuth token, a stable UUID for their chat, and the previous receipt for that chat and account. Keep these in the host application. Show the returned `action.label` and `action.url` directly as one button. A draft write creates no production job. On a revision conflict, read the latest draft and reconcile changes with the customer. [JavaScript adapter](../bin/fengsheng-sound-brief.mjs)

```js
const receipt = await saveSoundBrief({
  accountToken, sessionId, previous: savedReceipt
}, JSON.parse(toolCall.function.arguments));
await storeReceiptForThisAccountAndChat(receipt);
showAction(receipt.action.label, receipt.action.url);
```
