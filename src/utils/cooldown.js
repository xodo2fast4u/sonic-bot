const cooldowns = new Map();

export const COOLDOWN = {
  GLOBAL: 5 * 1000,
  WORK: 60 * 1000,
  DAILY: 24 * 60 * 60 * 1000,
  PAY: 10 * 1000,
};

/** @param {any} userId @returns {{lastCmd:number,spamAttempts:number,commands:Record<string,number>}} */
const getUserCooldown = (userId) => {
  if (!cooldowns.has(userId)) {
    cooldowns.set(userId, {
      lastCmd: 0,
      spamAttempts: 0,
      commands: {},
    });
  }
  return cooldowns.get(userId);
};

/** @param {any} userId */
export const checkGlobalCooldown = (userId) => {
  const data = getUserCooldown(userId);
  const now = Date.now();
  const elapsed = now - data.lastCmd;
  const remaining = Math.ceil((COOLDOWN.GLOBAL - elapsed) / 1000);

  if (elapsed >= COOLDOWN.GLOBAL) {
    data.spamAttempts = 0;
    data.lastCmd = now;
    return { allowed: true, remaining: 0, action: 'allow' };
  }

  data.spamAttempts++;

  if (data.spamAttempts === 1) {
    return { allowed: false, remaining, action: 'warn' };
  } else if (data.spamAttempts === 2) {
    return { allowed: false, remaining, action: 'react' };
  } else {
    return { allowed: false, remaining, action: 'ignore' };
  }
};

/** @param {any} userId @param {string} command @param {number} duration */
export const checkCommandCooldown = (userId, command, duration) => {
  const data = getUserCooldown(userId);
  const now = Date.now();
  const lastUse = data.commands[command] || 0;
  const elapsed = now - lastUse;

  if (elapsed >= duration) {
    data.commands[command] = now;
    return { allowed: true, remaining: 0 };
  }

  const remaining = Math.ceil((duration - elapsed) / 1000);
  return { allowed: false, remaining };
};

/** @param {number} seconds @returns {string} */
export const formatCooldown = (seconds) => {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  return `${hours}h ${mins}m`;
};

/** @param {any} userId @param {string|null} [command] */
export const resetCooldown = (userId, command = null) => {
  const data = getUserCooldown(userId);
  if (command) {
    delete data.commands[command];
  } else {
    cooldowns.delete(userId);
  }
};
