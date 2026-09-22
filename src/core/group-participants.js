import { readFileSync } from 'fs';
import logger from '../utils/logger.js';
import { getErrorMessage } from '../utils/error-message.js';
import { getGroupParticipantMessageState } from './state.js';
import { shouldSendGroupParticipantMessages } from '../services/mode-service.js';

const participantImages = {
  add: readFileSync(new URL('../assets/sonic-welcome.png', import.meta.url)),
  remove: readFileSync(new URL('../assets/sonic-left.png', import.meta.url)),
  promote: readFileSync(new URL('../assets/sonic-promoted.png', import.meta.url)),
  demote: readFileSync(new URL('../assets/sonic-demoted.png', import.meta.url)),
};

/**
 * @param {'add'|'remove'|'promote'|'demote'} action
 * @param {string[]} usernames
 * @param {string} groupName
 * @returns {string}
 */
const buildBatchMessage = (action, usernames, groupName) => {
  const names = usernames.map((u) => `@${u}`).join('\n');

  switch (action) {
    case 'add':
      return `Welcome to *${groupName}*, ${names}! 👋`;
    case 'remove':
      return `Goodbye ${names}! 👋`;
    case 'promote':
      return `Congratulations ${names}! You have been promoted to Admin in *${groupName}* 🛡️`;
    case 'demote':
      return `${names} has been demoted from Admin in *${groupName}* 📉`;
    default:
      return '';
  }
};

/**
 * Handle group participant updates (add, remove, promote, demote)
 * @param {any} sonic The Baileys socket instance
 * @param {{ id: string, participants: import('baileys').GroupParticipant[], action: import('baileys').ParticipantAction }} update
 */
export const handleGroupParticipantsUpdate = async (sonic, update) => {
  const { id, participants, action } = update;

  try {
    /** @type {'add'|'remove'|'promote'|'demote'|null} */
    const actionKey =
      action === 'add' || action === 'remove' || action === 'promote' || action === 'demote'
        ? action
        : null;

    if (!actionKey) {
      return;
    }

    if (!shouldSendGroupParticipantMessages(id)) {
      return;
    }

    const isEnabled = getGroupParticipantMessageState(actionKey);

    if (!isEnabled) {
      return;
    }

    /** @type {string[]} */
    const participantJids = [];
    /** @type {string[]} */
    const usernames = [];

    for (const participantObj of participants) {
      const participantJid =
        typeof participantObj === 'string' ? participantObj : participantObj.id;
      if (typeof participantJid !== 'string' || participantJid.length === 0) continue;
      participantJids.push(participantJid);
      const username = participantJid.split('@')[0];
      if (typeof username !== 'string') continue;
      usernames.push(username);
    }

    if (participantJids.length === 0) {
      return;
    }

    let groupName = 'this group';
    try {
      const groupMetadata = await sonic.groupMetadata(id);
      if (groupMetadata && groupMetadata.subject) {
        groupName = groupMetadata.subject;
      }
    } catch (metadataError) {
      logger.warn(`Could not fetch group metadata for ${id}: ${getErrorMessage(metadataError)}`);
    }

    const caption = buildBatchMessage(actionKey, usernames, groupName);
    if (!caption) {
      return;
    }

    await sonic.sendMessage(id, {
      image: participantImages[actionKey],
      caption,
      mentions: participantJids,
    });
  } catch (err) {
    logger.error(`Error handling group participants update: ${getErrorMessage(err)}`);
  }
};
