import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { setOwner } from '../../src/config/config.js';

test('setOwner preserves values containing equals signs in the env file', async () => {
  const tempDir = mkdtempSync(join(tmpdir(), 'sonic-bot-'));
  const envPath = join(tempDir, '.env');
  writeFileSync(envPath, 'OWNER_NUMBER=12345\n');

  const previousDir = process.cwd();
  process.chdir(tempDir);
  setOwner('12345');

  const contents = readFileSync(envPath, 'utf-8');
  expect(contents).toMatch(/OWNER_NUMBER=12345/);

  process.chdir(previousDir);
  rmSync(tempDir, { recursive: true, force: true });
});
