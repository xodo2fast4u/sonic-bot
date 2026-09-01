import { emoji as e } from '../../config/config.js';
import { getErrorMessage } from '../../utils/error-message.js';

/**
 * Safely evaluate a simple arithmetic expression without using eval() or Function().
 * Supports +, -, *, /, parentheses, decimal numbers, and whitespace.
 *
 * @param {string} expression
 * @returns {number}
 */
const evaluateSimpleExpression = (expression) => {
  const tokens = expression.match(/\d*\.\d+|\d+|[()+\-*/]/g) ?? [];
  let index = 0;

  /** @returns {number} */
  const parsePrimary = () => {
    const token = tokens[index];
    if (token === '(') {
      index++;
      const value = parseExpression();
      if (tokens[index] !== ')') throw new Error('Missing closing parenthesis');
      index++;
      return value;
    }

    if (token === '-' || token === '+') {
      const sign = token === '-' ? -1 : 1;
      index++;
      return sign * parsePrimary();
    }

    if (!token || !/^\d*(?:\.\d+|\d+)$/.test(token)) {
      throw new Error('Invalid token in expression');
    }

    index++;
    return Number(token);
  };

  /** @returns {number} */
  const parseTerm = () => {
    let value = parsePrimary();
    while (index < tokens.length && (tokens[index] === '*' || tokens[index] === '/')) {
      const op = tokens[index];
      index++;
      const right = parsePrimary();
      value = op === '*' ? value * right : value / right;
    }
    return value;
  };

  /** @returns {number} */
  const parseExpression = () => {
    let value = parseTerm();
    while (index < tokens.length && (tokens[index] === '+' || tokens[index] === '-')) {
      const op = tokens[index];
      index++;
      const right = parseTerm();
      value = op === '+' ? value + right : value - right;
    }
    return value;
  };

  const result = parseExpression();
  if (index !== tokens.length) {
    throw new Error('Invalid expression');
  }

  return result;
};

/** @type {import('../../../types/index.js').Command} */
export default {
  cmd: ['calculate'],
  desc: 'Calculate a math expression',

  run: async ({ text }, args) => {
    if (!args.length) {
      await text(
        `${e.cross} Please provide a math expression to calculate.\nExample: !calculate 2 + 2`,
      );
      return;
    }

    const expression = args.join(' ');

    try {
      const sanitized = expression.replace(/[^0-9+\-*/.().\s]/g, '').trim();

      if (!sanitized) {
        await text(`${e.cross} Invalid expression provided.`);
        return;
      }

      const result = evaluateSimpleExpression(sanitized);

      if (typeof result !== 'number' || Number.isNaN(result)) {
        await text(`${e.cross} Invalid calculation result.`);
        return;
      }

      await text(`${e.check} *${sanitized}* = *${result}*`);
    } catch (error) {
      await text(`${e.cross} Error calculating expression: ${getErrorMessage(error)}`);
    }
  },
};
