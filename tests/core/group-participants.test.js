import {
  state,
  getGroupParticipantMessageState,
  setGroupParticipantMessageState,
  setGroupParticipantMessageGroup,
} from '../../src/core/state.js';

describe('Group participant message toggles', () => {
  beforeEach(() => {
    state.groupParticipantMessages = {
      add: true,
      remove: true,
      promote: true,
      demote: true,
    };
  });

  test('should allow toggling add/remove messages independently', () => {
    setGroupParticipantMessageState('add', false);
    setGroupParticipantMessageState('remove', false);

    expect(getGroupParticipantMessageState('add')).toBe(false);
    expect(getGroupParticipantMessageState('remove')).toBe(false);
    expect(getGroupParticipantMessageState('promote')).toBe(true);
  });

  test('should toggle all participant messages together', () => {
    setGroupParticipantMessageGroup('all', false);

    expect(getGroupParticipantMessageState('add')).toBe(false);
    expect(getGroupParticipantMessageState('remove')).toBe(false);
    expect(getGroupParticipantMessageState('promote')).toBe(false);
    expect(getGroupParticipantMessageState('demote')).toBe(false);

    setGroupParticipantMessageGroup('all', true);

    expect(getGroupParticipantMessageState('add')).toBe(true);
    expect(getGroupParticipantMessageState('remove')).toBe(true);
    expect(getGroupParticipantMessageState('promote')).toBe(true);
    expect(getGroupParticipantMessageState('demote')).toBe(true);
  });
});
