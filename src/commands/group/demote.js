import { participantAction } from './_utils.js'

export default {
  cmd: ['demote', 'unadmin'],
  desc: 'Remove admin from member',
  run: participantAction('demote', 'Demoted'),
}
