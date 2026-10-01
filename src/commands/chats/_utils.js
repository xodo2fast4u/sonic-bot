/** @param {string} [value] */
export const parseJid = (value) =>
  value?.replace(/[^0-9]/g, '') ? `${value.replace(/[^0-9]/g, '')}@s.whatsapp.net` : undefined;

/** @param {string} text */
export const parseJson = (text) => {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
};
