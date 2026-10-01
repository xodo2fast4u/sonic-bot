import ownerCommands from '../../src/commands/owner/index.js';
import economyCommands from '../../src/commands/economy/index.js';
import {
  addCoins,
  applyRobberyProtectionPenalty,
  getInventory,
  getUser,
  setBalance,
  setBank,
} from '../../src/database/database.js';
import { setOwner } from '../../src/config/config.js';

let sequence = 0;

const userId = () => {
  sequence += 1;
  return `278200${Date.now().toString().slice(-6)}${sequence}@s.whatsapp.net`;
};

const messageFor = (sender, target) => ({
  key: {
    participant: sender,
    remoteJid: sender,
  },
  message: {
    conversation: 'command',
    extendedTextMessage: {
      contextInfo: {
        mentionedJid: [target],
      },
    },
  },
});

describe('New economy features', () => {
  test('sets a named bank balance without changing cash', async () => {
    const owner = userId();
    const target = userId();
    setOwner(owner, { persist: false });
    setBalance(target, 80);
    setBank(target, 20);

    const text = jest.fn();
    await ownerCommands.setbalance.run(
      { text, sonic: { user: { id: owner } }, msg: messageFor(owner, target) },
      ['@target', 'bank', '450'],
    );

    expect(getUser(target)).toMatchObject({ balance: 80, bank: 450 });
    expect(text).toHaveBeenCalledWith(expect.stringContaining('New bank: 450'));
  });

  test('funds a robbery protection shortfall when the robber is broke', () => {
    const robber = userId();
    const target = userId();
    const protection = applyRobberyProtectionPenalty(robber, target, 125);

    expect(protection).toEqual({ amount: 125, paid: 0, funded: 125 });
    expect(getUser(robber)?.balance).toBe(0);
    expect(getUser(target)?.balance).toBe(125);
  });

  test('floors cash at zero when a debit is larger than the user balance', () => {
    const sender = userId();
    setBalance(sender, 25);

    addCoins(sender, -200);

    expect(getUser(sender)?.balance).toBe(0);
  });

  test('does not allow setting a negative cash balance', () => {
    const sender = userId();

    expect(setBalance(sender, -1)).toBeNull();
    expect(getUser(sender)?.balance).toBe(0);
  });

  test('scavenge awards cash and a crafting material without starting funds', async () => {
    const sender = userId();
    const text = jest.fn();
    const sonic = { user: { id: '9999999999@s.whatsapp.net' } };

    await economyCommands.scavenge.run(
      { text, sonic, msg: { key: { participant: sender, remoteJid: sender } } },
      [],
    );

    expect(getUser(sender)?.balance).toBeGreaterThan(0);
    expect(getInventory(sender).length).toBeGreaterThan(0);
    expect(text).toHaveBeenCalledWith(expect.stringContaining('SCAVENGE'));
  });

  test('deliver rejects unknown routes without requiring cash', async () => {
    const sender = userId();
    const text = jest.fn();
    const sonic = { user: { id: '9999999999@s.whatsapp.net' } };

    await economyCommands.deliver.run(
      { text, sonic, msg: { key: { participant: sender, remoteJid: sender } } },
      ['unknown'],
    );

    expect(getUser(sender)?.balance).toBe(0);
    expect(text).toHaveBeenCalledWith(expect.stringContaining('local, express, or overnight'));
  });

  test('craft explains the free-material path when materials are missing', async () => {
    const sender = userId();
    const text = jest.fn();
    const sonic = { user: { id: '9999999999@s.whatsapp.net' } };
    addCoins(sender, 0);

    await economyCommands.craft.run(
      { text, sonic, msg: { key: { participant: sender, remoteJid: sender } } },
      ['circuit'],
    );

    expect(text).toHaveBeenCalledWith(expect.stringContaining('Scavenge for materials first'));
  });
});
