import ownerCommands from '../../src/commands/owner/index.js';
import { MessageRouter } from '../../src/core/message-router.js';

describe('Owner commands', () => {
  test('all owner commands declare centralized owner authorization', () => {
    for (const command of Object.values(ownerCommands)) {
      expect(command.ownerOnly).toBe(true);
    }
  });

  test('parses quoted arguments as single tokens', () => {
    const router = new MessageRouter();

    expect(router.parseCommand('!additem @user "Diamond Sword" 5')).toEqual([
      'additem',
      '@user',
      'Diamond Sword',
      '5',
    ]);
  });

  test('resets the owner command cooldown when no target is provided', async () => {
    const text = jest.fn();
    const command = ownerCommands.resetcooldown;
    const msg = {
      key: {
        remoteJid: '1234567890@s.whatsapp.net',
        participant: '1234567890@s.whatsapp.net',
      },
      message: { conversation: '!resetcooldown pay' },
    };

    await command.run({ text, sonic: { user: { id: 'bot' } }, msg }, ['pay']);

    expect(text).toHaveBeenCalledWith(expect.stringContaining('for command: pay'));
  });
});
