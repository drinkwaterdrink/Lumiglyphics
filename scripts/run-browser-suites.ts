// Runs the browser suites (package.json test:* scripts that drive Playwright) for one CI shard.
// Shards are assigned round-robin by sorted name, so each shard gets a similar mix.
// Environment: SHARD (1-based, default 1), SHARDS (default 1).
import {spawnSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';

const root = join(import.meta.dir, '..');
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as {scripts: Record<string, string>};
const shards = Math.max(1, Number(process.env.SHARDS ?? 1));
const shard = Math.min(shards, Math.max(1, Number(process.env.SHARD ?? 1)));

const suites = Object.entries(pkg.scripts)
  .filter(([name, command]) => name.startsWith('test:') && /browser|test-[a-z-]+\.ts/.test(command))
  .map(([name]) => name)
  .sort();

const mine = suites.filter((_, index) => index % shards === shard - 1);
console.log(`Shard ${shard}/${shards}: ${mine.length} of ${suites.length} browser suites`);

const failures: string[] = [];
for (const name of mine) {
  console.log(`\n::group::${name}`);
  const result = spawnSync('bun', ['run', name], {cwd: root, stdio: 'inherit', timeout: 15 * 60 * 1000});
  console.log('::endgroup::');
  if (result.status !== 0) failures.push(name);
}

if (failures.length) {
  console.error(`\nFailed suites: ${failures.join(', ')}`);
  process.exit(1);
}
console.log('\nAll suites in this shard passed.');
