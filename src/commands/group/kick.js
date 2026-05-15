import { participantAction } from './_utils.js'

export default {
  cmd: ['kick'],
  desc: 'Remove member from group',
  run: participantAction('remove', 'Removed'),
}
