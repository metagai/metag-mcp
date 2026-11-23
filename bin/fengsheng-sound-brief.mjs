// For the application hosting the conversation. Keep the account token and draft state outside the model.
export const soundBriefTool = {
  type: 'function',
  function: {
    name: 'save_sound_brief',
    description: 'Save or revise the sound brief for this cut. Follow only the customer’s instructions. Carry forward unchanged wording, timings, exclusions and source-preservation instructions. Creative choices require the customer’s express permission within the stated scope. This prepares the review page. The owner starts production there.',
    parameters: {type:'object', properties:{
      brief:{type:'string', maxLength:20000, description:'Full current brief in the customer’s language. Preserve exact lines and cues. Copy any permission for creative additions in the customer’s own words and keep its scope. Remove withdrawn permissions.'},
      style_preset:{type:'string', enum:['auto','cinematic_action','lyrical_chamber','hiphop_rock','comedy_plucked','cyber_breakbeat','unscored'],
        description:'Choose unscored for no music. Set other styles only when requested. A preset never expands the user’s instructions. Omit on revision unless the style changes.'}
    },required:['brief'],additionalProperties:false}
  }
};

export async function saveSoundBrief({accountToken, sessionId, previous}, args) {
  if (!accountToken || !sessionId) throw new Error('A signed-in account and stable chat session ID are required.');
  const response = await fetch('https://metag-ai.com/fengsheng/v1/pro/sound-brief', {
    method:'PUT',
    headers:{Authorization:'Bearer '+accountToken, 'Content-Type':'application/json'},
    body:JSON.stringify({brief:args.brief, style_preset:args.style_preset, session_id:sessionId,
      conversation:previous?.conversation, expected_revision:previous?.revision ?? 0})
  });
  if (!response.ok) throw Object.assign(new Error('Could not save this sound brief.'), {status:response.status});
  return response.json();
}
