import { participantAction } from './_utils.js'

export default {
  cmd: ['promote'],
  desc: 'Make member admin',
  run: participantAction('promote', 'Promoted'),
}
