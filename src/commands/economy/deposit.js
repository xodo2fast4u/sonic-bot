import { deposit } from '../../database/database.js';
import { bankAction } from './_utils.js';

/** @type {import('../../../types/index.js').Command} */
export default {
  cmd: ['deposit'],
  desc: 'Deposit coins to bank',
  run: bankAction(deposit, 'balance', 'DEPOSIT'),
};
