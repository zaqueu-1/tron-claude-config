#!/usr/bin/env node
// postinstall.js — installs Claude enforcement harness into consumer repo
// Runs automatically on: npm install @tron/claude-config
// Idempotent: safe to run multiple times

'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync, execFileSync } = require('child_process');
const { installTronRules } = require('./lib/install-tron-rules');
const { installTronKitPlugin, removeLegacyEcc, disablePlugin } = require('./lib/install-tron-kit');
const { ensureTronGraph } = require('./lib/ensure-tron-graph');
const { ensureTronDocs } = require('./lib/ensure-tron-docs');
const { installTronAgents } = require('./lib/install-tron-agents');

const DRY = process.env.DRY === '1';
const IS_CI = !!(process.env.CI || process.env.CONTINUOUS_INTEGRATION || process.env.GITHUB_ACTIONS);
const PACKAGE_ROOT = path.resolve(__dirname, '..');
const CONSUMER_ROOT = process.env.INIT_CWD || process.cwd();

// Files that lived under node_modules/.../managed/ → consumer dest
// Each entry: [src relative to PACKAGE_ROOT, dest relative to CONSUMER_ROOT]
const MANAGED_FILES = [
  ['managed/claude/settings.json',                    '.claude/settings.json'],
  ['managed/claude/PR-TEMPLATE.md',                   '.claude/PR-TEMPLATE.md'],
  ['managed/claude/hooks/bypass-check.sh',            '.claude/hooks/bypass-check.sh'],
  ['managed/claude/hooks/bootstrap-check.sh',         '.claude/hooks/bootstrap-check.sh'],
  ['managed/claude/hooks/lib/pr-template-validate.cjs','.claude/hooks/lib/pr-template-validate.cjs'],
  ['managed/claude/hooks/lib/validate-pr-body.cjs',    '.claude/hooks/lib/validate-pr-body.cjs'],
  ['managed/claude/hooks/lib/pr-create-gate.cjs',      '.claude/hooks/lib/pr-create-gate.cjs'],
  ['managed/setup-claude-harness.sh',                 'scripts/setup-claude-harness.sh'],
  ['managed/AGENTS.md',                               'AGENTS.md'],
];

// Each entry: [src relative to PACKAGE_ROOT, hook name]. The destination
// directory is resolved at runtime — see installGitHooks().
const GIT_HOOKS = [
  ['managed/git-hooks/pre-commit', 'pre-commit'],
  ['managed/git-hooks/pre-push',   'pre-push'],
];

// Entries to add to .gitignore if not already present
const GITIGNORE_ENTRIES = [
  '.claude/.commit-authorized',
  '.claude/.pr-authorized',
  '.claude/.pr-body-draft.md',
  '.claude/.harness-last-update',
  '.cursor/',
  '.omc/',
];

function log(msg) {
  process.stdout.write(`[claude-config] ${msg}\n`);
}

function ensureDir(filePath) {
  const dir = path.dirname(filePath);
  if (!DRY) fs.mkdirSync(dir, { recursive: true });
}

function copyFile(src, destRel) {
  const srcAbs = path.join(PACKAGE_ROOT, src);
  const destAbs = path.join(CONSUMER_ROOT, destRel);
  if (!fs.existsSync(srcAbs)) {
    log(`WARN: source not found: ${src}`);
    return;
  }
  ensureDir(destAbs);
  if (DRY) {
    log(`DRY: would copy ${src} → ${destRel}`);
    return;
  }
  fs.copyFileSync(srcAbs, destAbs);
  // Make shell scripts executable
  if (destAbs.endsWith('.sh')) {
    fs.chmodSync(destAbs, 0o755);
  }
}

function copyTree(srcAbs, destAbs, { exclude = ['__pycache__', '.DS_Store'] } = {}) {
  if (!fs.existsSync(srcAbs)) {
    log(`WARN: copyTree source not found: ${srcAbs}`);
    return;
  }
  if (DRY) {
    log(`DRY: would copyTree ${srcAbs} → ${destAbs}`);
    return;
  }
  fs.mkdirSync(destAbs, { recursive: true });
  for (const entry of fs.readdirSync(srcAbs, { withFileTypes: true })) {
    if (exclude.includes(entry.name)) continue;
    const srcPath = path.join(srcAbs, entry.name);
    const destPath = path.join(destAbs, entry.name);
    if (entry.isDirectory()) {
      copyTree(srcPath, destPath, { exclude });
    } else if (entry.isFile()) {
      fs.mkdirSync(path.dirname(destPath), { recursive: true });
      fs.copyFileSync(srcPath, destPath);
      const ext = path.extname(entry.name);
      if (!ext || ext === '.sh' || ext === '.cmd') {
        try {
          fs.chmodSync(destPath, 0o755);
        } catch {
          // chmod may fail on some platforms/files — non-fatal
        }
      }
    }
  }
}

const TRON_DESIGN_SKILLS = ['tron-design', 'tron-motion', 'tron-native', 'tron-imagery'];
const TRON_DESIGN_BIN = path.join(os.homedir(), '.agents', 'skills', 'tron-design', 'scripts', 'tron-design');

function ensureSymlinkOrCopy(targetAbs, linkAbs) {
  if (fs.existsSync(linkAbs)) {
    try {
      const stat = fs.lstatSync(linkAbs);
      if (stat.isSymbolicLink()) {
        const resolved = fs.realpathSync(linkAbs);
        if (resolved === fs.realpathSync(targetAbs)) return;
      } else if (stat.isDirectory()) {
        return;
      }
    } catch {
      // fall through to recreate
    }
  }
  if (DRY) {
    log(`DRY: would symlink ${linkAbs} → ${targetAbs}`);
    return;
  }
  fs.mkdirSync(path.dirname(linkAbs), { recursive: true });
  try {
    if (fs.existsSync(linkAbs)) fs.rmSync(linkAbs, { recursive: true, force: true });
    fs.symlinkSync(targetAbs, linkAbs, 'dir');
  } catch {
    copyTree(targetAbs, linkAbs);
  }
}

function installTronDesignStack() {
  const home = os.homedir();
  for (const name of TRON_DESIGN_SKILLS) {
    const src = path.join(PACKAGE_ROOT, 'managed', 'skills', name);
    const agentsDest = path.join(home, '.agents', 'skills', name);
    if (!DRY) fs.rmSync(agentsDest, { recursive: true, force: true });
    copyTree(src, agentsDest);
    for (const base of ['.claude', '.cursor', '.github']) {
      const link = path.join(home, base, 'skills', name);
      if (!DRY && fs.existsSync(link) && !fs.lstatSync(link).isSymbolicLink()) {
        fs.rmSync(link, { recursive: true, force: true });
      }
      ensureSymlinkOrCopy(agentsDest, link);
    }
  }
  log(`design stack ${DRY ? 'would be ' : ''}synced → ~/.agents/skills/{${TRON_DESIGN_SKILLS.join(',')}} (+ symlinks in ~/.claude, ~/.cursor, ~/.github)`);
}

const LEGACY_DESIGN_BIN = /(?:\/[^'"\s\\]+)*\/skills\/impeccable\/scripts\/impeccable/g;

function mergeDesignHook(consumerRoot, { template, dest, legacyDest }) {
  const rel = path.relative(consumerRoot, dest);
  const templateAbs = path.join(PACKAGE_ROOT, template);
  if (!fs.existsSync(templateAbs)) {
    log(`WARN: hook template not found: ${template}`);
    return;
  }
  const fresh = JSON.parse(fs.readFileSync(templateAbs, 'utf8').replaceAll('__TRON_DESIGN_BIN__', TRON_DESIGN_BIN));
  const legacyExists = Boolean(legacyDest) && fs.existsSync(legacyDest);
  const sourcePath = fs.existsSync(dest) ? dest : legacyExists ? legacyDest : null;
  const before = sourcePath ? fs.readFileSync(sourcePath, 'utf8') : '';
  let config;
  try {
    config = sourcePath ? JSON.parse(before.replace(LEGACY_DESIGN_BIN, TRON_DESIGN_BIN)) : { version: 1, hooks: {} };
  } catch (err) {
    log(`WARN: design hook not merged, invalid JSON in ${path.relative(consumerRoot, sourcePath)}: ${err.message}`);
    return;
  }
  config.hooks = config.hooks || {};
  for (const [event, entries] of Object.entries(fresh.hooks)) {
    const list = Array.isArray(config.hooks[event]) ? config.hooks[event] : [];
    const present = list.some((entry) => JSON.stringify(entry).includes(TRON_DESIGN_BIN));
    config.hooks[event] = present ? list : [...list, ...entries];
  }
  const after = `${JSON.stringify(config, null, 2)}\n`;
  if (sourcePath === dest && after === before) {
    log(`tron-design hooks already present: ${rel}`);
    return;
  }
  if (DRY) {
    log(`DRY: would write tron-design hooks → ${rel}`);
    return;
  }
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  const tmp = `${dest}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, after, 'utf8');
  fs.renameSync(tmp, dest);
  if (legacyExists && legacyDest !== dest) fs.rmSync(legacyDest, { force: true });
  log(`tron-design hooks installed → ${rel}`);
}

function installTronDesignHooks(consumerRoot) {
  mergeDesignHook(consumerRoot, {
    template: 'managed/hooks/cursor/hooks.json',
    dest: path.join(consumerRoot, '.cursor', 'hooks.json'),
  });
  mergeDesignHook(consumerRoot, {
    template: 'managed/hooks/github/tron-design.json',
    dest: path.join(consumerRoot, '.github', 'hooks', 'tron-design.json'),
    legacyDest: path.join(consumerRoot, '.github', 'hooks', 'impeccable.json'),
  });
}

function installTronDesignFallback() {
  // Always sync — subordinate to tron-design; stale copies must not linger.
  const home = os.homedir();
  const src = path.join(PACKAGE_ROOT, 'managed', 'skills', 'tron-design-fallback');
  for (const dest of [
    path.join(home, '.claude', 'skills', 'tron-design-fallback'),
    path.join(home, '.cursor', 'skills', 'tron-design-fallback'),
  ]) {
    if (!DRY) fs.rmSync(dest, { recursive: true, force: true });
    copyTree(src, dest);
  }
  log(`tron-design-fallback ${DRY ? 'would be ' : ''}synced → ~/.claude/skills/, ~/.cursor/skills/`);
}

const LEGACY_DESIGN_SKILLS = [
  'ui-ux-pro-max',
  'frontend-design',
  'impeccable',
  'animate',
  'animate-expo',
  'animation-vocabulary',
  'apple-design',
  'ask-sonner',
  'emil-design-eng',
  'find-animation-opportunities',
  'improve-animations',
  'mobile-native',
  'pick-ui-library',
  'prototype',
  'review-animations',
  'write-swift',
  'brandkit',
  'design-taste-frontend',
  'design-taste-frontend-v1',
  'full-output-enforcement',
  'gpt-taste',
  'high-end-visual-design',
  'image-to-code',
  'imagegen-frontend-mobile',
  'imagegen-frontend-web',
  'industrial-brutalist-ui',
  'minimalist-ui',
  'redesign-existing-projects',
  'stitch-design-taste',
];
const LEGACY_DESIGN_PLUGIN = 'frontend-design@claude-plugins-official';

// A user's own skill can share a retired name; only links into ~/.agents/skills and trees whose
// SKILL.md declares that exact name are treated as ours.
function isRetiredDesignSkill(target, stat, name) {
  if (stat.isSymbolicLink()) {
    const resolved = path.resolve(path.dirname(target), fs.readlinkSync(target));
    return resolved.startsWith(path.join(os.homedir(), '.agents', 'skills') + path.sep);
  }
  if (!stat.isDirectory()) return false;
  try {
    const skill = fs.readFileSync(path.join(target, 'SKILL.md'), 'utf8');
    const declared = /^---\n[\s\S]*?^name:\s*['"]?([\w.-]+)['"]?\s*$/m.exec(skill);
    return Boolean(declared) && declared[1] === name;
  } catch {
    return false;
  }
}

function removeLegacyDesignSkills() {
  const home = os.homedir();
  for (const base of ['.claude', '.cursor', '.agents', '.github']) {
    for (const name of LEGACY_DESIGN_SKILLS) {
      const target = path.join(home, base, 'skills', name);
      let stat;
      try {
        stat = fs.lstatSync(target);
      } catch {
        continue;
      }
      const rel = `~/${base}/skills/${name}`;
      if (!isRetiredDesignSkill(target, stat, name)) {
        log(`kept ${rel} (not a package-installed copy)`);
        continue;
      }
      if (DRY) {
        log(`DRY: would remove legacy skill ${rel}`);
        continue;
      }
      try {
        if (stat.isSymbolicLink()) fs.unlinkSync(target);
        else fs.rmSync(target, { recursive: true, force: true });
        log(`removed legacy skill ${rel}`);
      } catch (err) {
        log(`WARN: could not remove legacy skill ${rel}: ${err.message}`);
      }
    }
  }
  try {
    disablePlugin(LEGACY_DESIGN_PLUGIN, { dryRun: DRY, log });
  } catch (err) {
    log(`WARN: ${LEGACY_DESIGN_PLUGIN} not disabled: ${err.message}`);
  }
}

function installFrontendSkillsRule() {
  const dest = path.join(os.homedir(), '.cursor', 'rules', 'frontend-skills.mdc');
  const src = path.join(PACKAGE_ROOT, 'managed', 'cursor', 'rules', 'frontend-skills.mdc');
  if (!fs.existsSync(src)) {
    log('WARN: frontend-skills.mdc not found in managed/');
    return;
  }
  if (DRY) {
    log('DRY: would sync frontend-skills.mdc → ~/.cursor/rules/');
    return;
  }
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
  log('frontend-skills rule synced → ~/.cursor/rules/frontend-skills.mdc');
}

function git(...args) {
  return execFileSync('git', args, {
    cwd: CONSUMER_ROOT,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
  }).trim();
}

// Resolve the directory git actually reads hooks from.
//
// `<root>/.git/hooks` is only valid in a primary checkout. In a linked worktree
// `.git` is a file pointing at the real gitdir, so hardcoding that path makes
// mkdir fail with ENOTDIR. `git rev-parse --git-path` returns the correct
// location in both layouts.
//
// Returns null when core.hooksPath is set: hooks are owned by another tool
// (husky, lefthook, ...) and git ignores .git/hooks entirely. Writing there
// would be dead code, and writing into the managed directory would clobber
// that tool's hooks.
function resolveGitHooksDir() {
  try {
    if (git('config', '--get', 'core.hooksPath')) return null;
  } catch {
    // Exit code 1 simply means the key is unset — that is the common case.
  }

  try {
    return path.resolve(CONSUMER_ROOT, git('rev-parse', '--git-path', 'hooks'));
  } catch (err) {
    log(`WARN: could not resolve git hooks directory: ${err.message}`);
    return null;
  }
}

function installGitHooks() {
  const hooksDir = resolveGitHooksDir();
  if (!hooksDir) {
    log('git hooks skipped: core.hooksPath is managed by another tool');
    return;
  }

  for (const [src, name] of GIT_HOOKS) {
    const srcAbs = path.join(PACKAGE_ROOT, src);
    const destAbs = path.join(hooksDir, name);
    if (!fs.existsSync(srcAbs)) {
      log(`WARN: source not found: ${src}`);
      continue;
    }
    if (DRY) {
      log(`DRY: would copy ${src} → ${destAbs}`);
      continue;
    }
    fs.mkdirSync(hooksDir, { recursive: true });
    fs.copyFileSync(srcAbs, destAbs);
    fs.chmodSync(destAbs, 0o755);
  }
}

function installGitIgnoreEntries() {
  const gitignorePath = path.join(CONSUMER_ROOT, '.gitignore');
  if (!fs.existsSync(gitignorePath)) return;
  let content = fs.readFileSync(gitignorePath, 'utf8');
  let changed = false;
  for (const entry of GITIGNORE_ENTRIES) {
    if (!content.includes(entry)) {
      content += `\n${entry}`;
      changed = true;
    }
  }
  if (changed) {
    if (!DRY) fs.writeFileSync(gitignorePath, content, 'utf8');
    else log(`DRY: would add entries to .gitignore`);
  }
}

// ── Machine-level tools (skip in CI — developers-only) ───────────────────────

// GSD is the single workflow engine (plan → execute → verify). `standard` keeps the main loop and
// cuts cold-start skill descriptions from ~12k tokens to ~700; GSD persists it across `gsd update`.
const GSD_PROFILE = 'standard';

function installGsd() {
  const home = os.homedir();
  for (const runtime of ['claude', 'cursor']) {
    const configDir = path.join(home, `.${runtime}`);
    if (runtime === 'cursor' && !fs.existsSync(configDir)) continue;
    const marker = path.join(configDir, '.gsd-profile');
    if (fs.existsSync(marker) && fs.readFileSync(marker, 'utf8').trim() === GSD_PROFILE) continue;

    const cmd = `npx -y @opengsd/gsd-core@latest --${runtime} --global --profile=${GSD_PROFILE}`;
    if (DRY) {
      log(`DRY: would run ${cmd}`);
      continue;
    }
    try {
      execSync(cmd, { stdio: 'ignore', timeout: 180000 });
      log(`gsd (${GSD_PROFILE}) installed for ${runtime}`);
    } catch {
      log(`WARN: gsd install failed for ${runtime} — run manually: ${cmd}`);
    }
  }
}

function installTronGraph() {
  // Required by agent-isolation / AGENTS.md — registered as `tron-graph` in every MCP config.
  // Non-fatal here: a failed MCP install must not block copying hooks into consumer repos
  // (especially on Windows/WSL where PowerShell/curl installers often fail on first run).
  const result = ensureTronGraph({ dryRun: DRY });
  if (result.alreadyReady) {
    log('tron-graph already registered');
    return result;
  }
  if (result.ok) {
    return result;
  }
  log('WARN: tron-graph could not be installed automatically');
  log('WARN: run manually: node node_modules/@tron/claude-config/scripts/lib/ensure-tron-graph.js');
  return result;
}

// Always overwrite — terse mode and engineering principles are harness-enforced, not optional.
const CORE_RULES = ['terse.md', 'engineering-principles.md'];
const RETIRED_RULE_PATHS = [
  ['.claude', 'rules', 'caveman.md'],
  ['.claude', 'skills', 'andrej-karpathy-skills'],
];

function installCoreRules() {
  const home = os.homedir();
  for (const name of CORE_RULES) {
    const dest = path.join(home, '.claude', 'rules', name);
    if (DRY) {
      log(`DRY: would enforce rule → ~/.claude/rules/${name}`);
      continue;
    }
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(path.join(PACKAGE_ROOT, 'managed', 'claude', 'rules', name), dest);
    log(`rule enforced → ~/.claude/rules/${name}`);
  }
  for (const parts of RETIRED_RULE_PATHS) {
    const target = path.join(home, ...parts);
    if (!fs.existsSync(target)) continue;
    if (DRY) log(`DRY: would remove retired → ~/${parts.join('/')}`);
    else {
      fs.rmSync(target, { recursive: true, force: true });
      log(`retired → removed ~/${parts.join('/')}`);
    }
  }
}

function installCommitChangesSkill() {
  const dest = path.join(os.homedir(), '.claude', 'commands', 'commit-changes.md');
  if (fs.existsSync(dest)) return;
  const src = path.join(PACKAGE_ROOT, 'managed', 'skills', 'commit-changes', 'SKILL.md');
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
  log('commit-changes skill installed → ~/.claude/commands/commit-changes.md');
}

function installCodeReviewSkill() {
  const dest = path.join(os.homedir(), '.claude', 'commands', 'code-review.md');
  if (fs.existsSync(dest)) return;
  const src = path.join(PACKAGE_ROOT, 'managed', 'skills', 'code-review', 'SKILL.md');
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
  log('code-review skill installed → ~/.claude/commands/code-review.md');
}

function installSecurityReviewSkill() {
  const dest = path.join(os.homedir(), '.claude', 'commands', 'security-review.md');
  if (fs.existsSync(dest)) return;
  const src = path.join(PACKAGE_ROOT, 'managed', 'skills', 'security-review', 'SKILL.md');
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
  log('security-review skill installed → ~/.claude/commands/security-review.md');
}

function installMakePrSkill() {
  // Always sync — enforcement contract; stale English "Summary" skills were bypassing the PT-BR template.
  const dest = path.join(os.homedir(), '.claude', 'commands', 'make-pr.md');
  const src = path.join(PACKAGE_ROOT, 'managed', 'skills', 'make-pr', 'SKILL.md');
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
  log('make-pr skill synced → ~/.claude/commands/make-pr.md');
}

function installSessionHandoffSkill() {
  // Always sync the code files so fixes reach everyone; never touch config.json,
  // which holds each person's sessions vault path.
  const destDir = path.join(os.homedir(), '.claude', 'skills', 'session-handoff');
  const srcDir = path.join(PACKAGE_ROOT, 'managed', 'skills', 'session-handoff');
  const existing = path.join(destDir, 'SKILL.md');
  if (fs.existsSync(existing) && !/^name: session-handoff\r?$/m.test(fs.readFileSync(existing, 'utf8'))) {
    log('WARN: ~/.claude/skills/session-handoff/ holds a different skill — left untouched');
    return;
  }
  if (DRY) {
    log('DRY: would sync session-handoff skill → ~/.claude/skills/session-handoff/');
    return;
  }
  try {
    fs.mkdirSync(destDir, { recursive: true });
    for (const file of ['SKILL.md', 'config.example.json']) {
      const src = path.join(srcDir, file);
      if (fs.existsSync(src)) {
        fs.copyFileSync(src, path.join(destDir, file));
      }
    }
    log('session-handoff skill synced → ~/.claude/skills/session-handoff/ (vault set in config.json on first use)');
  } catch (err) {
    log(`WARN: session-handoff skill not synced: ${err.message}`);
  }
}

function installSessionHandoffCommand() {
  // Always sync — `/session-handoff` replaces legacy `/save-session` and `/retomar`.
  const dest = path.join(os.homedir(), '.claude', 'commands', 'session-handoff.md');
  const src = path.join(PACKAGE_ROOT, 'managed', 'skills', 'session-handoff', 'SKILL.md');
  if (DRY) {
    log('DRY: would sync session-handoff command → ~/.claude/commands/session-handoff.md');
    return;
  }
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
  log('session-handoff command synced → ~/.claude/commands/session-handoff.md');
}

function installIssueBoardSkill() {
  // Always sync the code files so fixes reach everyone; never touch config.json or data/,
  // which hold each person's board and cached classification.
  const destDir = path.join(os.homedir(), '.claude', 'skills', 'issue-board');
  const srcDir = path.join(PACKAGE_ROOT, 'managed', 'skills', 'issue-board');
  const existing = path.join(destDir, 'SKILL.md');
  if (fs.existsSync(existing) && !/^name: issue-board\r?$/m.test(fs.readFileSync(existing, 'utf8'))) {
    log('WARN: ~/.claude/skills/issue-board/ holds a different skill — left untouched');
    return;
  }
  if (DRY) {
    log('DRY: would sync issue-board skill → ~/.claude/skills/issue-board/');
    return;
  }
  try {
    fs.mkdirSync(destDir, { recursive: true });
    for (const file of ['SKILL.md', 'board.mjs', 'render.py', 'config.example.json']) {
      fs.copyFileSync(path.join(srcDir, file), path.join(destDir, file));
    }
    log('issue-board skill synced → ~/.claude/skills/issue-board/ (board is set in config.json on first use)');
  } catch (err) {
    // Optional tool: a copy failure (locked file on Windows) must not break npm install.
    log(`WARN: issue-board skill not synced: ${err.message}`);
  }
}

function installDocSkill() {
  // Always sync the code files so fixes reach everyone. The skill keeps no per-person state.
  const destDir = path.join(os.homedir(), '.claude', 'skills', 'doc');
  const srcDir = path.join(PACKAGE_ROOT, 'managed', 'skills', 'doc');
  const existing = path.join(destDir, 'SKILL.md');
  if (fs.existsSync(existing) && !/^name: doc\r?$/m.test(fs.readFileSync(existing, 'utf8'))) {
    log('WARN: ~/.claude/skills/doc/ holds a different skill — left untouched');
    return;
  }
  if (DRY) {
    log('DRY: would sync doc skill → ~/.claude/skills/doc/');
    return;
  }
  try {
    fs.mkdirSync(destDir, { recursive: true });
    for (const file of ['SKILL.md', 'doc.mjs']) {
      fs.copyFileSync(path.join(srcDir, file), path.join(destDir, file));
    }
    log('doc skill synced → ~/.claude/skills/doc/');
  } catch (err) {
    // Optional tool: a copy failure (locked file on Windows) must not break npm install.
    log(`WARN: doc skill not synced: ${err.message}`);
  }
}

function installEnforcementRule() {
  const dest = path.join(os.homedir(), '.claude', 'rules', 'harness-enforcement.md');
  const src = path.join(PACKAGE_ROOT, 'managed', 'claude', 'rules', 'harness-enforcement.md');
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
}

function installAgentIsolationRule() {
  const dest = path.join(os.homedir(), '.claude', 'rules', 'agent-isolation.md');
  const src = path.join(PACKAGE_ROOT, 'managed', 'claude', 'rules', 'agent-isolation.md');
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
}

function installHarnessPatterns() {
  const dest = path.join(os.homedir(), '.claude', 'rules', 'harness-patterns.md');
  const src = path.join(PACKAGE_ROOT, 'managed', 'claude', 'rules', 'harness-patterns.md');
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
}

function installTronKit() {
  // Legacy removal runs only after tron-kit is in place, so the user never ends up with neither.
  try {
    installTronKitPlugin({ dryRun: DRY, log });
  } catch (err) {
    log(`WARN: tron-kit plugin not installed: ${err.message}`);
    return;
  }
  try {
    removeLegacyEcc({ dryRun: DRY, log });
  } catch (err) {
    log(`WARN: legacy plugin cleanup incomplete: ${err.message}`);
  }
}

// ── Main ─────────────────────────────────────────────────────────────────────

const isConsumerRepo = fs.existsSync(path.join(CONSUMER_ROOT, '.git'));
const isSelfInstall = path.resolve(CONSUMER_ROOT) === path.resolve(PACKAGE_ROOT);

// Consumer-repo hooks/settings first — must succeed even when global tool installs fail (Windows/WSL).
if (isConsumerRepo && !isSelfInstall) {
  for (const [src, dest] of MANAGED_FILES) {
    copyFile(src, dest);
  }

  if (!IS_CI) {
    installTronRules(CONSUMER_ROOT, { dryRun: DRY, silent: DRY });
  }

  installGitHooks();
  installGitIgnoreEntries();
  installTronDesignHooks(CONSUMER_ROOT);
}

// Machine-level tools: install for developers, skip in CI
if (!IS_CI) {
  installGsd();
  installTronGraph();
  try {
    ensureTronDocs({ dryRun: DRY });
  } catch (err) {
    log(`WARN: tron-docs not registered: ${err.message}`);
  }
  installCoreRules();
  installCommitChangesSkill();
  installCodeReviewSkill();
  installSecurityReviewSkill();
  installMakePrSkill();
  installSessionHandoffSkill();
  installTronDesignStack();
  installTronKit();
  try {
    installTronAgents({ dryRun: DRY, log });
  } catch (err) {
    log(`WARN: tron agents not installed: ${err.message}`);
  }
  installTronDesignFallback();
  removeLegacyDesignSkills();
  installIssueBoardSkill();
  installFrontendSkillsRule();
  installEnforcementRule();
  installAgentIsolationRule();
  installHarnessPatterns();
  installDocSkill();
}
