/**
 * @param {string[]} args
 * @returns {Record<string, unknown>}
 */
export const parseKeyValueArgs = (args) => {
  /** @type {Record<string, unknown>} */
  const result = {};
  const websites = [];

  for (const arg of args) {
    const [key, ...rest] = arg.split('=');
    const value = rest.join('=').trim();
    if (!key || value === '') continue;

    if (key === 'website') {
      websites.push(value);
      continue;
    }

    if (key === 'hours') {
      try {
        result['hours'] = JSON.parse(value);
      } catch {
        // ignore invalid hours payload
      }
      continue;
    }

    result[key] = value;
  }

  if (websites.length) result['websites'] = websites;
  return result;
};

/**
 * @param {string} text
 * @returns {unknown}
 */
export const parseJsonArg = (text) => {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
};
