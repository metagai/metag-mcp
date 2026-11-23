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
