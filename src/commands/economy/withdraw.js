import { withdraw } from '../../database/database.js';
import { bankAction } from './_utils.js';

/** @type {import('../../../types/index.js').Command} */
export default {
  cmd: ['withdraw'],
  desc: 'Withdraw coins from bank',
  run: bankAction(withdraw, 'bank', 'WITHDRAWAL'),
};
