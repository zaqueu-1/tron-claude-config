'use strict';

// Installs the 12 tron agents and enforces them as the only roster (Claude Code + Cursor).
// Agents → ~/.claude/agents, ~/.cursor/agents · guard + roster + role briefs → ~/.claude/tron/
// Any other agent file is moved to ~/.claude/tron/agent-roles/ by the guard's sweep.

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const PACKAGE_ROOT = path.resolve(__dirname, '..', '..');
const SRC = path.join(PACKAGE_ROOT, 'managed', 'agents');
const GUARD = 'agent-roster-guard.js';

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const from = path.join(src, entry.name);
    const to = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDir(from, to);
    else fs.copyFileSync(from, to);
  }
}

// Cursor resolves models itself; Claude-only fields would pin a model Cursor may not offer.
function toCursorAgent(content) {
  return content.replace(/^model: .*$/m, 'model: inherit');
}

function readJson(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (err) {
    if (err.code === 'ENOENT') return fallback;
    throw new Error(`${file} is not valid JSON — fix it before reinstalling (${err.message})`);
  }
}

function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.tron-${process.pid}.tmp`;
  fs.writeFileSync(tmp, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
  fs.renameSync(tmp, file);
}

function withoutGuard(entries = []) {
  return entries.filter((entry) => !JSON.stringify(entry).includes(GUARD));
}

function registerClaudeHooks(settingsPath, command) {
  const settings = readJson(settingsPath, {});
  const hooks = settings.hooks || {};
  hooks.PreToolUse = [...withoutGuard(hooks.PreToolUse), { matcher: 'Task|Agent', hooks: [{ type: 'command', command }] }];
  hooks.SessionStart = [...withoutGuard(hooks.SessionStart), { hooks: [{ type: 'command', command }] }];
  settings.hooks = hooks;
  writeJson(settingsPath, settings);
}

function registerCursorHooks(hooksPath, command) {
  const config = readJson(hooksPath, { version: 1, hooks: {} });
  const hooks = config.hooks || {};
  hooks.preToolUse = [...withoutGuard(hooks.preToolUse), { command, matcher: 'Task' }];
  hooks.subagentStart = [...withoutGuard(hooks.subagentStart), { command }];
  hooks.sessionStart = [...withoutGuard(hooks.sessionStart), { command }];
  config.version = config.version || 1;
  config.hooks = hooks;
  writeJson(hooksPath, config);
}

function installTronAgents({ dryRun = false, log = () => {} } = {}) {
  const home = os.homedir();
  const tronDir = path.join(home, '.claude', 'tron');
  const guardPath = path.join(tronDir, GUARD);
  const agentFiles = fs.readdirSync(path.join(SRC, 'tron')).filter((f) => f.endsWith('.md'));
  const cursorDir = path.join(home, '.cursor');
  const hasCursor = fs.existsSync(cursorDir);

  if (dryRun) {
    log(`DRY: would install ${agentFiles.length} tron agents, roster guard and role briefs → ~/.claude/tron/`);
    return;
  }

  fs.mkdirSync(tronDir, { recursive: true });
  fs.copyFileSync(path.join(SRC, GUARD), guardPath);
  fs.copyFileSync(path.join(SRC, 'roster.json'), path.join(tronDir, 'roster.json'));

  // Sweep before copying so stale copies of shipped role briefs are replaced by ours.
  execFileSync(process.execPath, [guardPath, 'claude'], { input: '{"hook_event_name":"SessionStart"}', stdio: ['pipe', 'ignore', 'pipe'] });
  copyDir(path.join(SRC, 'roles'), path.join(tronDir, 'agent-roles'));

  for (const file of agentFiles) {
    const content = fs.readFileSync(path.join(SRC, 'tron', file), 'utf8');
    const claudeDir = path.join(home, '.claude', 'agents');
    fs.mkdirSync(claudeDir, { recursive: true });
    fs.writeFileSync(path.join(claudeDir, file), content, 'utf8');
    if (hasCursor) {
      fs.mkdirSync(path.join(cursorDir, 'agents'), { recursive: true });
      fs.writeFileSync(path.join(cursorDir, 'agents', file), toCursorAgent(content), 'utf8');
    }
  }

  const rule = fs.readFileSync(path.join(PACKAGE_ROOT, 'managed', 'claude', 'rules', 'agent-roster.md'), 'utf8');
  fs.mkdirSync(path.join(home, '.claude', 'rules'), { recursive: true });
  fs.writeFileSync(path.join(home, '.claude', 'rules', 'agent-roster.md'), rule, 'utf8');

  registerClaudeHooks(path.join(home, '.claude', 'settings.json'), `node "$HOME/.claude/tron/${GUARD}" claude`);
  if (hasCursor) {
    fs.mkdirSync(path.join(cursorDir, 'rules'), { recursive: true });
    fs.writeFileSync(
      path.join(cursorDir, 'rules', 'agent-roster.mdc'),
      `---\ndescription: Tron agent roster and orchestration (enforced)\nalwaysApply: true\n---\n\n${rule}`,
      'utf8',
    );
    registerCursorHooks(path.join(cursorDir, 'hooks.json'), `"${process.execPath}" "${guardPath}" cursor`);
  }
  log(`tron agents (${agentFiles.length}) installed and enforced → ~/.claude/agents${hasCursor ? ', ~/.cursor/agents' : ''}`);
}

module.exports = { installTronAgents };
