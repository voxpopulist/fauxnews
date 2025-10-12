import assert from 'assert';
import { promises as fs } from 'fs';
import path from 'path';
import { test } from 'uvu';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const indexPath = path.resolve('public/index/index.json');

test('should build a valid index file', async () => {
  // Build the index first
  await execAsync('node scripts/build-index.mjs');
  
  const raw = await fs.readFile(indexPath, 'utf8');
  const idx = JSON.parse(raw);
  assert(Array.isArray(idx.docs), 'docs should be an array');
  assert(typeof idx.terms === 'object', 'terms should be an object');
  assert(idx.docs.length > 0, 'should have at least one doc');
  const firstDoc = idx.docs[0];
  assert('id' in firstDoc, 'doc should have id');
  assert('speaker' in firstDoc, 'doc should have speaker');
});

test.run();
