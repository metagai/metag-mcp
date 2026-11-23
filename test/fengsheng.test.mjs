import { test } from 'node:test';
import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';

const json = async file => JSON.parse(await readFile(new URL('../' + file, import.meta.url), 'utf8'));

test('the catalog, plugin and registry expose the shipped connections', async () => {
  const [catalog, plugin, registry, config] = await Promise.all([
    '.claude-plugin/marketplace.json', '.claude-plugin/plugin.json', 'server.json', '.mcp.json'
  ].map(json));
  assert.equal(catalog.plugins[0].name, plugin.name);
  assert.equal(plugin.version, registry.version);
  assert.equal(registry.remotes[0].url, config.mcpServers.fengsheng.url);
  assert.equal(config.mcpServers.fengsheng.type, 'http');
  const script = config.mcpServers.metag.args[0].replace('${CLAUDE_PLUGIN_ROOT}/', '');
  await access(new URL('../' + script, import.meta.url));
  await access(new URL('../skills/sound-brief/SKILL.md', import.meta.url));
});

test('a revision keeps account and draft authority in the host', async t => {
  const {saveSoundBrief, soundBriefTool} = await import('../bin/fengsheng-sound-brief.mjs');
  assert.deepEqual(Object.keys(soundBriefTool.function.parameters.properties).sort(), ['brief', 'style_preset']);
  const previous = {conversation: 'conv-previous', revision: 2};
  const receipt = {...previous, revision: 3, action: {label: '查看方案', url: 'https://metag-ai.com/guide/?draft=conv-previous'}};
  t.mock.method(globalThis, 'fetch', async (url, request) => {
    assert.equal(url, 'https://metag-ai.com/fengsheng/v1/pro/sound-brief');
    assert.equal(request.method, 'PUT');
    assert.equal(request.headers.Authorization, 'Bearer host-account');
    assert.deepEqual(JSON.parse(request.body), {
      session_id: 'host-session', conversation: 'conv-previous', expected_revision: 2, brief: '保留拍板，去掉脚步声'
    });
    return Response.json(receipt);
  });
  const result = await saveSoundBrief({accountToken: 'host-account', sessionId: 'host-session', previous}, {
    brief: '保留拍板，去掉脚步声', conversation: 'from-model', expected_revision: 0,
    accountToken: 'from-model', session_id: 'from-model', start_production: true
  });
  assert.deepEqual(result, receipt);
});

test('draft conflicts reach the host without an automatic retry', async t => {
  const {saveSoundBrief} = await import('../bin/fengsheng-sound-brief.mjs');
  const call = t.mock.method(globalThis, 'fetch', async () => new Response(null, {status: 409}));
  await assert.rejects(saveSoundBrief({accountToken: 'host-account', sessionId: 'host-session'}, {brief: 'Keep the claps'}), {status: 409});
  assert.equal(call.mock.callCount(), 1);
});
