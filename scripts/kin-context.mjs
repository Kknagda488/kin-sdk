#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const option = (name, fallback = '') => {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] || fallback : fallback;
};
const root = path.resolve(option('--root', process.cwd()));
const output = path.resolve(option('--output', path.join(root, 'FRONTEND_CONTEXT.md')));
const workspace = option('--workspace', process.env.KIN_WORKSPACE || '');
const api = (option('--api', process.env.KIN_API_URL || '')).replace(/\/$/, '');
const token = option('--token', process.env.KIN_API_TOKEN || '');
const repository = option('--repository', process.env.GITHUB_REPOSITORY || path.basename(root));
const maxTotalBytes = 350_000;
const maxFileBytes = 24_000;
const ignored = /(^|\/)(node_modules|\.git|\.next|dist|build|coverage|\.turbo|\.vercel)(\/|$)/;
const sourceFile = /\.(tsx?|jsx?|vue|svelte|html|css|scss)$/i;
const sensitiveLine = /(api[_-]?key|secret|password|token|private[_-]?key|authorization)\s*[:=]\s*['"`]?[^\s'"`]{8,}/i;

function trackedFiles() {
  try {
    return execFileSync('git', ['ls-files', '-co', '--exclude-standard'], { cwd: root, encoding: 'utf8' })
      .split('\n').filter(Boolean);
  } catch {
    throw new Error(`Could not list project files in ${root}. Run this from a Git checkout or initialize Git.`);
  }
}

function shouldInclude(file) {
  if (ignored.test(file) || !sourceFile.test(file)) return false;
  if (/(^|\/)(\.env[^/]*|secrets?[^/]*|credentials?[^/]*|.*\.pem|.*\.key)$/i.test(file)) return false;
  const segments = file.split('/');
  return segments.some((segment) => ['src', 'app', 'pages', 'components', 'routes', 'views'].includes(segment));
}

const chunks = [
  '# Frontend implementation context',
  '',
  `Repository: ${repository}`,
  `Generated: ${new Date().toISOString()}`,
  '',
  'This private engineering context was generated from tracked frontend source files. Review it before sharing outside the workspace.',
  '',
];
let remaining = maxTotalBytes;
let included = 0;
for (const file of trackedFiles().filter(shouldInclude).sort()) {
  if (remaining <= 0) break;
  let content;
  try { content = readFileSync(path.join(root, file), 'utf8'); } catch { continue; }
  if (Buffer.byteLength(content) > maxFileBytes) {
    content = `${content.slice(0, maxFileBytes)}\n\n[File truncated at ${maxFileBytes} bytes]`;
  }
  content = content.split('\n').map((line) => sensitiveLine.test(line) ? '[REDACTED: possible credential]' : line).join('\n');
  const block = `## ${file}\n\n\`\`\`\n${content}\n\`\`\`\n\n`;
  const bytes = Buffer.byteLength(block);
  if (bytes > remaining) break;
  chunks.push(block);
  remaining -= bytes;
  included += 1;
}
if (!included) throw new Error('No frontend source files found. Expected source under src/, app/, pages/, components/, routes/, or views/.');

const markdown = chunks.join('\n');
writeFileSync(output, markdown, { mode: 0o600 });
console.log(`Generated ${output} from ${included} frontend files.`);

if (args.includes('--upload')) {
  if (!api || !workspace || !token) {
    throw new Error('Upload requires --api, --workspace, and --token (or KIN_API_URL, KIN_WORKSPACE, KIN_API_TOKEN).');
  }
  const response = await fetch(`${api}/knowledge/frontend-context`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'X-Organization-Slug': workspace,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ repository, content: markdown }),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(`Kin context upload failed (${response.status}): ${error.detail || 'request rejected'}`);
  }
  const result = await response.json();
  console.log(`Uploaded private frontend context (${result.document_count} indexed sections).`);
}
