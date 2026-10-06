#!/usr/bin/env node
// upstream/watch.js — MAINTAINER ONLY: report upstream changes relevant to what this package interprets
// Usage: npm run upstream:watch [-- <id>...] [-- --accept <id> [--ref <sha>]] [-- --json]
// Reads pins from upstream/sources.json; writes reports to upstream/reports/<date>-<id>.md

'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { UPSTREAM_ROOT, loadSources, getSource, setSourceRef } = require('./lib/sources');

const CACHE_ROOT = path.join(UPSTREAM_ROOT, '.cache');
const REPORTS_ROOT = path.join(UPSTREAM_ROOT, 'reports');
const PACKAGE_ROOT = path.resolve(UPSTREAM_ROOT, '..');
const LOG_LIMIT = 60;

function log(msg) {
  process.stdout.write(`[upstream-watch] ${msg}\n`);
}

function parseArgs(argv) {
  const args = { ids: [], accept: null, ref: null, json: false };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--json') args.json = true;
    else if (arg === '--accept') args.accept = argv[++i];
    else if (arg === '--ref') args.ref = argv[++i];
    else if (arg.startsWith('--')) throw new Error(`Unknown argument: ${arg}`);
    else args.ids.push(arg);
  }
  if (args.accept === undefined) throw new Error('--accept requires a source id');
  if (args.ref === undefined) throw new Error('--ref requires a sha');
  if (args.ref && !args.accept) throw new Error('--ref is only valid with --accept');
  return args;
}

function git(cwd, ...args) {
  return execFileSync('git', args, {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    timeout: 300000,
    maxBuffer: 64 * 1024 * 1024,
  }).trim();
}

function mirror(source) {
  const dir = path.join(CACHE_ROOT, `${source.id}.git`);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(CACHE_ROOT, { recursive: true });
    git(CACHE_ROOT, 'clone', '--bare', '--filter=blob:none', '--quiet', source.repo, dir);
  }
  git(dir, 'fetch', '--quiet', '--filter=blob:none', 'origin', 'HEAD');
  const latest = git(dir, 'rev-parse', 'FETCH_HEAD');
  if (source.ref && source.ref !== 'HEAD') {
    try {
      git(dir, 'cat-file', '-e', `${source.ref}^{commit}`);
    } catch {
      git(dir, 'fetch', '--quiet', '--filter=blob:none', 'origin', source.ref);
    }
  }
  return { dir, latest };
}

function listFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? listFiles(full) : [full];
  });
}

function watchPatterns(source) {
  const patterns = [...(source.watch || [])];
  for (const upstreamPath of Object.keys(source.map || {})) patterns.push(upstreamPath, `${upstreamPath}/**`);
  if (source.watchFromConfig && source.config) {
    const config = JSON.parse(fs.readFileSync(path.join(PACKAGE_ROOT, source.config), 'utf8'));
    for (const name of config.allow?.skills || []) patterns.push(`skills/${name}/**`);
    for (const name of config.allow?.commands || []) patterns.push(`commands/${name}.md`);
  }
  for (const dir of source.watchSnapshot || []) {
    const snapshotRoot = path.join(PACKAGE_ROOT, source.tron);
    for (const file of listFiles(path.join(snapshotRoot, dir))) patterns.push(path.relative(snapshotRoot, file));
  }
  return patterns;
}

function consumedNames(source, dir) {
  const names = new Set();
  const patterns = watchPatterns(source);
  if (patterns.includes(`${dir}/**`)) return null;
  for (const pattern of patterns) {
    const rel = pattern.startsWith(`${dir}/`) ? pattern.slice(dir.length + 1) : null;
    if (rel) names.add(rel.split('/')[0].replace(/\.md$/, ''));
  }
  return names;
}

function parseNameStatus(raw) {
  return raw
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      const [status, ...files] = line.split('\t');
      return { status: status[0], files };
    });
}

function inspect(source) {
  const { dir, latest } = mirror(source);
  const pinned = source.ref === 'HEAD' ? null : source.ref;
  const result = { id: source.id, repo: source.repo, pinned, latest, upToDate: pinned === latest, changes: [], log: [], candidates: [] };
  if (!pinned) return { ...result, upToDate: false, unpinned: true };
  if (result.upToDate) return result;

  const pathspecs = watchPatterns(source).map((p) => `:(glob)${p}`);
  if (pathspecs.length) {
    result.changes = parseNameStatus(git(dir, 'diff', '--name-status', '-M', pinned, latest, '--', ...pathspecs));
    result.log = git(dir, 'log', '--oneline', '--no-merges', `-n${LOG_LIMIT}`, `${pinned}..${latest}`, '--', ...pathspecs)
      .split('\n')
      .filter(Boolean);
  }

  for (const discoverDir of source.discover || []) {
    const consumed = consumedNames(source, discoverDir);
    if (!consumed) continue;
    const existing = new Set(
      git(dir, 'ls-tree', '--name-only', `${pinned}:${discoverDir}`).split('\n').filter(Boolean).map((n) => n.replace(/\.md$/, '')),
    );
    const added = parseNameStatus(git(dir, 'diff', '--name-status', '--diff-filter=A', pinned, latest, '--', discoverDir));
    const names = new Set();
    for (const { files } of added) {
      const name = files[0].slice(discoverDir.length + 1).split('/')[0].replace(/\.md$/, '');
      if (name && !consumed.has(name) && !existing.has(name)) names.add(name);
    }
    for (const name of names) result.candidates.push(`${discoverDir}/${name}`);
  }
  return result;
}

function renderReport(source, result) {
  const lines = [
    `# Upstream report — ${source.id}`,
    '',
    `- Date: ${new Date().toISOString().slice(0, 10)}`,
    `- Repo: ${result.repo}`,
    `- Pinned: \`${result.pinned}\``,
    `- Latest: \`${result.latest}\``,
    `- Tron artifact: ${source.tron}`,
    `- Status: ${source.status} (phase ${source.phase})`,
    '',
    `## Relevant changes (${result.changes.length})`,
    '',
    ...(result.changes.length ? result.changes.map(({ status, files }) => `- \`${status}\` ${files.join(' → ')}`) : ['None in watched paths.']),
    '',
    `## Commits touching watched paths (${result.log.length}${result.log.length === LOG_LIMIT ? '+' : ''})`,
    '',
    ...(result.log.length ? result.log.map((l) => `- ${l}`) : ['None.']),
    '',
    `## New upstream items not adopted (${result.candidates.length})`,
    '',
    ...(result.candidates.length ? result.candidates.map((c) => `- ${c}`) : ['None.']),
    '',
    '## Porting',
    '',
    'Interpret relevant changes into the tron artifact in our own words (no verbatim copies), then run:',
    '',
    source.id === 'tron-kit'
      ? `\`npm run sync:tron-kit -- --ref ${result.latest}\``
      : `\`npm run upstream:watch -- --accept ${source.id} --ref ${result.latest}\``,
    '',
  ];
  return lines.join('\n');
}

function writeReport(source, result) {
  fs.mkdirSync(REPORTS_ROOT, { recursive: true });
  const file = path.join(REPORTS_ROOT, `${new Date().toISOString().slice(0, 10)}-${source.id}.md`);
  fs.writeFileSync(file, renderReport(source, result), 'utf8');
  return path.relative(PACKAGE_ROOT, file);
}

function accept(id, ref) {
  const source = getSource(id);
  if (source.id === 'tron-kit') {
    throw new Error('tron-kit pin moves only through `npm run sync:tron-kit -- --ref <sha>` (it rebuilds the snapshot)');
  }
  const target = ref || mirror(source).latest;
  setSourceRef(id, target, { acceptedAt: new Date().toISOString().slice(0, 10) });
  log(`${id}: pin ${source.ref} → ${target}`);
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.accept) return accept(args.accept, args.ref);

  const sources = loadSources().filter((s) => !args.ids.length || args.ids.includes(s.id));
  if (args.ids.length && sources.length !== args.ids.length) {
    throw new Error(`unknown source id(s): ${args.ids.filter((id) => !sources.some((s) => s.id === id)).join(', ')}`);
  }

  const results = [];
  let failed = 0;
  for (const source of sources) {
    try {
      const result = inspect(source);
      results.push(result);
      if (result.unpinned) log(`${source.id}: UNPINNED — latest ${result.latest}; accept to pin`);
      else if (result.upToDate) log(`${source.id}: up to date`);
      else if (!result.changes.length && !result.candidates.length) {
        log(`${source.id}: upstream moved, nothing relevant — accept to advance pin`);
      } else {
        const report = writeReport(source, result);
        log(`${source.id}: ${result.changes.length} relevant change(s), ${result.candidates.length} candidate(s) → ${report}`);
      }
    } catch (err) {
      failed++;
      log(`${source.id}: ERROR ${err.message.split('\n')[0]}`);
    }
  }
  if (args.json) process.stdout.write(`${JSON.stringify(results, null, 2)}\n`);
  if (failed) process.exitCode = 1;
}

try {
  main();
} catch (err) {
  process.stderr.write(`[upstream-watch] ERROR: ${err.message}\n`);
  process.exit(1);
}
