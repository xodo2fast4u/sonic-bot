import { container } from '../core/container.js';

/** @type {Map<string, import('../../types/index.js').Command>} */
export const commands = new Map();

export const loadCommands = async () => {
  commands.clear();

  const registry = container.resolve('commandRegistry');
  await registry.initialize?.();

  const loadedCommands = await registry.getAllLoaded();
  for (const [name, command] of loadedCommands.entries()) {
    commands.set(name.toLowerCase(), command);
  }

  return commands;
};
