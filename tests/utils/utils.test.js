import { jest } from '@jest/globals';
import { state } from '../../src/core/state.js';

process.env.OWNER_NUMBER = '1234567890';

const mockedConfig = {
  getOwner: jest.fn(() => '1234567890'),
  emoji: {
    sonic: '🦔',
    speed: '💨',
    bolt: '⚡',
  },
};

jest.unstable_mockModule('../../src/config/config.js', () => mockedConfig);

const { jid, getText, getTarget, isOwner, resolveSender, format } =
  await import('../../src/utils/utils.js');

describe('Utils', () => {
  describe('jid utilities', () => {
    test('should encode user JID correctly', () => {
      const result = jid.toUser('1234567890');
      expect(result).toBe('1234567890@s.whatsapp.net');
    });

    test('should extract user digits from JID', () => {
      const result = jid.fromUser('1234567890@s.whatsapp.net');
      expect(result).toBe('1234567890');
    });

    test('should identify group JID', () => {
      expect(jid.isGroup('1234567890@g.us')).toBe(true);
      expect(jid.isGroup('1234567890@s.whatsapp.net')).toBe(false);
    });

    test('should get sender from message', () => {
      const msg = {
        key: {
          remoteJid: '1234567890@s.whatsapp.net',
          participant: '1234567890@s.whatsapp.net',
        },
      };

      const result = jid.getSender(msg);
      expect(result).toBe('1234567890@s.whatsapp.net');
    });

    test('should normalize JID', () => {
      const result = jid.normalize('1234567890@S.whatsapp.NET');
      expect(result).toBe('1234567890@s.whatsapp.net');
    });
  });

  describe('text extraction', () => {
    test('should extract conversation text', () => {
      const msg = {
        message: {
          conversation: 'Hello world',
        },
      };

      const result = getText(msg);
      expect(result).toBe('Hello world');
    });

    test('should extract extended text', () => {
      const msg = {
        message: {
          extendedTextMessage: {
            text: 'Extended text',
          },
        },
      };

      const result = getText(msg);
      expect(result).toBe('Extended text');
    });

    test('should extract image caption', () => {
      const msg = {
        message: {
          imageMessage: {
            caption: 'Image caption',
          },
        },
      };

      const result = getText(msg);
      expect(result).toBe('Image caption');
    });

    test('should return empty string for no text', () => {
      const msg = {
        message: {},
      };

      const result = getText(msg);
      expect(result).toBe('');
    });
  });

  describe('target extraction', () => {
    test('should extract mentioned user', async () => {
      const msg = {
        message: {
          extendedTextMessage: {
            contextInfo: {
              mentionedJid: ['1234567890@s.whatsapp.net'],
            },
          },
        },
      };

      const result = await getTarget(msg);
      expect(result).toBe('1234567890@s.whatsapp.net');
    });

    test('should resolve a mentioned LID from PN and LID participant fields', async () => {
      const msg = {
        key: {
          remoteJid: '123456789-987654@g.us',
        },
        message: {
          extendedTextMessage: {
            contextInfo: {
              mentionedJid: ['99887766554433@lid'],
            },
          },
        },
      };
      const sonic = {
        groupMetadata: jest.fn(async () => ({
          participants: [
            {
              id: '1234567890@s.whatsapp.net',
              lid: '99887766554433@lid',
            },
          ],
        })),
      };

      await expect(getTarget(msg, sonic)).resolves.toBe('1234567890@s.whatsapp.net');
    });

    test('should extract quoted participant', async () => {
      const msg = {
        message: {
          extendedTextMessage: {
            contextInfo: {
              participant: '1234567890@s.whatsapp.net',
            },
          },
        },
      };

      const result = await getTarget(msg);
      expect(result).toBe('1234567890@s.whatsapp.net');
    });

    test('should return null for no target', async () => {
      const msg = {
        message: {
          conversation: 'No target',
        },
      };

      const result = await getTarget(msg);
      expect(result).toBeNull();
    });
  });

  describe('owner checking', () => {
    test('should identify owner correctly', () => {
      const result = isOwner('1234567890@s.whatsapp.net');
      expect(result).toBe(true);
    });

    test('should identify owner in comma-separated list', () => {
      process.env.OWNER_NUMBER = '1234567890,9876543210';
      expect(isOwner('9876543210@s.whatsapp.net')).toBe(true);
      expect(isOwner('1234567890@s.whatsapp.net')).toBe(true);
      expect(isOwner('5555555555@s.whatsapp.net')).toBe(false);
      process.env.OWNER_NUMBER = '1234567890';
    });

    test('should identify non-owner correctly', () => {
      const result = isOwner('0987654321@s.whatsapp.net');
      expect(result).toBe(false);
    });

    test('should identify owner via participantAlt in group chats', () => {
      const groupMsg = {
        key: {
          remoteJid: '123456789-987654@g.us',
          participant: '99887766554433@lid',
          participantAlt: '1234567890@s.whatsapp.net',
        },
      };
      expect(isOwner('99887766554433@lid', null, groupMsg)).toBe(true);
    });

    test('should handle invalid JID', () => {
      const result = isOwner('invalid');
      expect(result).toBe(false);
    });
  });

  describe('sender resolution', () => {
    test('should resolve sender from group message', () => {
      const msg = {
        key: {
          remoteJid: '1234567890@g.us',
          participant: '0987654321@s.whatsapp.net',
        },
      };

      const result = resolveSender(msg);
      expect(result).toBe('0987654321@s.whatsapp.net');
    });

    test('should resolve sender from direct message', () => {
      const msg = {
        key: {
          remoteJid: '1234567890@s.whatsapp.net',
        },
      };

      const result = resolveSender(msg);
      expect(result).toBe('1234567890@s.whatsapp.net');
    });

    test('should resolve self-authored group messages to the socket user', () => {
      const msg = {
        key: {
          fromMe: true,
          remoteJid: '123456789-987654@g.us',
        },
      };

      const result = resolveSender(msg, {
        user: { id: '1234567890:3@s.whatsapp.net' },
      });

      expect(result).toBe('1234567890:3@s.whatsapp.net');
      expect(isOwner(result)).toBe(true);
    });

    test('should resolve self-authored groups to the configured owner without a socket', () => {
      const msg = {
        key: {
          fromMe: true,
          remoteJid: '123456789-987654@g.us',
        },
      };

      const result = resolveSender(msg);

      expect(result).toMatch(/^\d+@s\.whatsapp\.net$/);
      expect(jid.isGroup(result)).toBe(false);
    });

    test('should resolve the owner LID when participantAlt is missing', () => {
      const msg = {
        key: {
          remoteJid: '123456789-987654@g.us',
          participant: '99887766554433@lid',
        },
      };
      const sonic = {
        user: {
          id: '1234567890:3@s.whatsapp.net',
          lid: '99887766554433@lid',
        },
      };

      expect(resolveSender(msg, sonic)).toBe('1234567890:3@s.whatsapp.net');
    });

    test('should fallback to remoteJid', () => {
      const msg = {
        key: {
          remoteJid: '1234567890@s.whatsapp.net',
        },
      };

      const result = resolveSender(msg);
      expect(result).toBe('1234567890@s.whatsapp.net');
    });
  });

  describe('format utilities', () => {
    describe('uptime formatting', () => {
      test('should format seconds correctly', () => {
        const result = format.uptime(3661); // 1h 1m 1s
        expect(result).toBe('1h 1m 1s');
      });

      test('should format zero seconds', () => {
        const result = format.uptime(0);
        expect(result).toBe('0s');
      });

      test('should format only hours', () => {
        const result = format.uptime(7200); // 2h
        expect(result).toBe('2h');
      });

      test('should format only minutes', () => {
        const result = format.uptime(300); // 5m
        expect(result).toBe('5m');
      });
    });

    describe('byte formatting', () => {
      test('should format bytes correctly', () => {
        const result = format.bytes(1024);
        expect(result).toBe('1.00 KB');
      });

      test('should format megabytes correctly', () => {
        const result = format.bytes(1048576);
        expect(result).toBe('1.00 MB');
      });

      test('should handle zero bytes', () => {
        const result = format.bytes(0);
        expect(result).toBe('0 B');
      });

      test('should handle null/undefined', () => {
        expect(format.bytes(null)).toBe('0 B');
        expect(format.bytes(undefined)).toBe('0 B');
      });
    });

    describe('getUptime', () => {
      beforeEach(() => {
        state.startTime = Date.now() - 3600000;
      });

      test('should get uptime since start', () => {
        const result = format.getUptime();
        expect(result).toMatch(/1h(?: \d+m)?(?: \d+s)?/);
      });
    });
  });
});
