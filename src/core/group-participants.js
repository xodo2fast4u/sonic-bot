import logger from '../utils/logger.js';
import { getErrorMessage } from '../utils/error-message.js';
import { getGroupParticipantMessageState } from './state.js';

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

    const isEnabled = getGroupParticipantMessageState(actionKey);

    if (!isEnabled) {
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

    for (const participantObj of participants) {
      const participantJid =
        typeof participantObj === 'string' ? participantObj : participantObj.id;
      if (!participantJid) continue;

      let messageText = '';

      switch (action) {
        case 'add':
          messageText = `Welcome to *${groupName}*, @${participantJid.split('@')[0]}! 👋`;
          break;
        case 'remove':
          messageText = `Goodbye @${participantJid.split('@')[0]}! 👋`;
          break;
        case 'promote':
          messageText = `Congratulations @${participantJid.split('@')[0]}! You have been promoted to Admin in *${groupName}* 🛡️`;
          break;
        case 'demote':
          messageText = `@${participantJid.split('@')[0]} has been demoted from Admin in *${groupName}* 📉`;
          break;
        default:
          return;
      }

      await sonic.sendMessage(id, {
        text: messageText,
        mentions: [participantJid],
      });
    }
  } catch (err) {
    logger.error(`Error handling group participants update: ${getErrorMessage(err)}`);
  }
};
