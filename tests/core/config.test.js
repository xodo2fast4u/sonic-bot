import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { setOwner } from '../../src/config/config.js';
import { ConfigManager } from '../../src/config/config-manager.js';
import { container } from '../../src/core/container.js';

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

test('ConfigManager validates single and comma-separated owner numbers successfully', async () => {
  container.register('logger', () => ({
    info: () => {},
    warn: () => {},
    error: () => {},
    debug: () => {},
  }));

  const tempDir = mkdtempSync(join(tmpdir(), 'sonic-bot-'));
  const envPath = join(tempDir, '.env');
  writeFileSync(envPath, 'OWNER_NUMBER=2763565244,27710962925\nSONIC_PREFIX=!\n');

  const previousDir = process.cwd();
  process.chdir(tempDir);

  const cm = new ConfigManager();
  await expect(cm.initialize()).resolves.toBeUndefined();
  expect(cm.get('ownerNumber')).toBe('2763565244,27710962925');

  process.chdir(previousDir);
  rmSync(tempDir, { recursive: true, force: true });
});
