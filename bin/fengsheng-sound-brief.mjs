// For the application hosting the conversation. Keep the account token and draft state outside the model.
export const soundBriefTool = {
  type: 'function',
  function: {
    name: 'save_sound_brief',
    description: 'Save or revise the sound brief for this cut. Carry forward the cues already agreed. This prepares the review page. The owner starts production there.',
    parameters: {type:'object', properties:{
      brief:{type:'string', description:'Complete sound direction in the customer’s language, including timings to preserve.'},
      style_preset:{type:'string', enum:['auto','cinematic_action','lyrical_chamber','hiphop_rock','comedy_plucked','cyber_breakbeat','unscored'],
        description:'Choose unscored for no music. Omit on revision unless the style changes.'}
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
