/** @type {Array<'add'|'remove'|'promote'|'demote'>} */
export const groupParticipantMessageTypes = ['add', 'remove', 'promote', 'demote'];

export const state = {
  startTime: Date.now(),
  /** @type {Record<'add'|'remove'|'promote'|'demote', boolean>} */
  groupParticipantMessages: {
    add: true,
    remove: true,
    promote: true,
    demote: true,
  },
};

/** @param {'add'|'remove'|'promote'|'demote'} type */
export const getGroupParticipantMessageState = (type) => {
  return Boolean(state.groupParticipantMessages?.[type]);
};

/** @param {'add'|'remove'|'promote'|'demote'} type @param {boolean} enabled */
export const setGroupParticipantMessageState = (type, enabled) => {
  if (!state.groupParticipantMessages) {
    state.groupParticipantMessages = { add: true, remove: true, promote: true, demote: true };
  }

  state.groupParticipantMessages[type] = Boolean(enabled);
};

/** @param {'all'|'add'|'remove'|'promote'|'demote'} type @param {boolean} enabled */
export const setGroupParticipantMessageGroup = (type, enabled) => {
  if (type === 'all') {
    for (const key of groupParticipantMessageTypes) {
      state.groupParticipantMessages[key] = Boolean(enabled);
    }
    return;
  }

  setGroupParticipantMessageState(type, enabled);
};
