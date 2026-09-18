import {
  OPERATING_MODES,
  _resetModeStateForTests,
  clearGroupAdminModes,
  formatModeStatus,
  getMode,
  getModeState,
  isGroupAdminOnly,
  isValidMode,
  loadModeState,
  setGroupAdminMode,
  setMode,
  shouldProcessCommand,
  shouldSendGroupParticipantMessages,
} from '../../src/services/mode-service.js';
import {
  clearAdminOnlyGroups,
  setBotSetting,
  setGroupAdminOnly,
} from '../../src/database/database.js';

const OWNER = '15551234567';
const OWNER_JID = `${OWNER}@s.whatsapp.net`;
const MEMBER_JID = '15559876543@s.whatsapp.net';
const GROUP_A = '120363000000000001@g.us';
const GROUP_B = '120363000000000002@g.us';
const DM_JID = '15551112233@s.whatsapp.net';

describe('Mode Service', () => {
  const previousOwner = process.env['OWNER_NUMBER'];
  /** @type {{ mode: string, adminGroups: string[] } | null} */
  let previousState = null;

  beforeEach(() => {
    process.env['OWNER_NUMBER'] = OWNER;
    if (!previousState) {
      loadModeState();
      previousState = getModeState();
    }
    clearAdminOnlyGroups();
    setBotSetting('operating_mode', 'public');
    _resetModeStateForTests();
    loadModeState();
  });

  afterEach(() => {
    clearAdminOnlyGroups();
    if (previousState) {
      setBotSetting('operating_mode', previousState.mode);
      for (const groupJid of previousState.adminGroups) {
        setGroupAdminOnly(groupJid, true);
      }
    } else {
      setBotSetting('operating_mode', 'public');
    }
    _resetModeStateForTests();
    if (previousOwner === undefined) {
      delete process.env['OWNER_NUMBER'];
    } else {
      process.env['OWNER_NUMBER'] = previousOwner;
    }
  });

  test('defaults to public and validates modes', () => {
    expect(getMode()).toBe('public');
    expect(isValidMode('public')).toBe(true);
    expect(isValidMode('nope')).toBe(false);
    expect(OPERATING_MODES).toEqual(['public', 'private', 'self', 'admin']);
  });

  test('persists global mode changes', () => {
    setMode('private');
    expect(getMode()).toBe('private');

    _resetModeStateForTests();
    loadModeState();
    expect(getMode()).toBe('private');

    setMode('public');
  });

  test('public allows everyone everywhere', () => {
    expect(shouldProcessCommand({ user: MEMBER_JID, chatJid: GROUP_A }).allowed).toBe(true);
    expect(shouldProcessCommand({ user: MEMBER_JID, chatJid: DM_JID }).allowed).toBe(true);
  });

  test('private blocks groups but allows DMs', () => {
    setMode('private');
    expect(shouldProcessCommand({ user: MEMBER_JID, chatJid: GROUP_A }).allowed).toBe(false);
    expect(shouldProcessCommand({ user: MEMBER_JID, chatJid: DM_JID }).allowed).toBe(true);
    expect(shouldProcessCommand({ user: OWNER_JID, chatJid: GROUP_A }).allowed).toBe(true);
  });

  test('self allows only owners', () => {
    setMode('self');
    expect(shouldProcessCommand({ user: MEMBER_JID, chatJid: GROUP_A }).allowed).toBe(false);
    expect(shouldProcessCommand({ user: MEMBER_JID, chatJid: DM_JID }).allowed).toBe(false);
    expect(shouldProcessCommand({ user: OWNER_JID, chatJid: GROUP_A }).allowed).toBe(true);
    expect(shouldProcessCommand({ user: OWNER_JID, chatJid: DM_JID }).allowed).toBe(true);
  });

  test('admin all requires group admin in groups, allows DMs', () => {
    setMode('admin');
    expect(
      shouldProcessCommand({ user: MEMBER_JID, chatJid: GROUP_A, isGroupAdmin: false }).allowed,
    ).toBe(false);
    expect(
      shouldProcessCommand({ user: MEMBER_JID, chatJid: GROUP_A, isGroupAdmin: true }).allowed,
    ).toBe(true);
    expect(shouldProcessCommand({ user: MEMBER_JID, chatJid: DM_JID }).allowed).toBe(true);
    expect(shouldProcessCommand({ user: OWNER_JID, chatJid: GROUP_A }).allowed).toBe(true);
  });

  test('per-group admin-only leaves other chats public', () => {
    setMode('public');
    setGroupAdminMode(GROUP_A, true);

    expect(isGroupAdminOnly(GROUP_A)).toBe(true);
    expect(isGroupAdminOnly(GROUP_B)).toBe(false);

    expect(
      shouldProcessCommand({ user: MEMBER_JID, chatJid: GROUP_A, isGroupAdmin: false }).allowed,
    ).toBe(false);
    expect(
      shouldProcessCommand({ user: MEMBER_JID, chatJid: GROUP_A, isGroupAdmin: true }).allowed,
    ).toBe(true);
    expect(shouldProcessCommand({ user: MEMBER_JID, chatJid: GROUP_B }).allowed).toBe(true);
    expect(shouldProcessCommand({ user: MEMBER_JID, chatJid: DM_JID }).allowed).toBe(true);

    setGroupAdminMode(GROUP_A, false);
    expect(isGroupAdminOnly(GROUP_A)).toBe(false);
  });

  test('clearGroupAdminModes removes overrides', () => {
    setGroupAdminMode(GROUP_A, true);
    setGroupAdminMode(GROUP_B, true);
    expect(getModeState().adminGroups).toHaveLength(2);

    clearGroupAdminModes();
    expect(getModeState().adminGroups).toHaveLength(0);
  });

  test('participant messages suppressed in private and self', () => {
    setMode('public');
    expect(shouldSendGroupParticipantMessages(GROUP_A)).toBe(true);

    setMode('admin');
    expect(shouldSendGroupParticipantMessages(GROUP_A)).toBe(true);

    setMode('private');
    expect(shouldSendGroupParticipantMessages(GROUP_A)).toBe(false);

    setMode('self');
    expect(shouldSendGroupParticipantMessages(GROUP_A)).toBe(false);
  });

  test('formatModeStatus includes mode name', () => {
    setMode('self');
    expect(formatModeStatus()).toContain('self');
  });

  test('persists per-group admin across reload', () => {
    setGroupAdminOnly(GROUP_A, true);
    _resetModeStateForTests();
    loadModeState();
    expect(isGroupAdminOnly(GROUP_A)).toBe(true);
  });
});
