import { emoji as e } from '../../config/config.js';
import { format } from '../../utils/utils.js';
import os from 'os';

/** @type {import('../../../types/index.js').Command} */
export default {
  cmd: ['server'],
  desc: 'Server statistics',

  run: async ({ text }) => {
    const cpus = os.cpus() || [];
    const cpuModel = cpus[0]?.model ? cpus[0].model.replace(/\s+/g, ' ').trim() : 'Unknown';
    const cores =
      cpus.length ||
      (typeof os.availableParallelism === 'function' ? os.availableParallelism() : 1);
    const speed = cpus[0]?.speed && cpus[0].speed > 0 ? ` @ ${cpus[0].speed} MHz` : '';

    const [total, free] = [os.totalmem(), os.freemem()];
    const used = Math.max(0, total - free);
    const ramPercent = total > 0 ? ((used / total) * 100).toFixed(1) : '0';

    const mem = process.memoryUsage();
    const loads = os.loadavg();
    const isWin = os.platform() === 'win32';
    const loadAvg =
      loads.every((n) => n === 0) && isWin ? 'N/A' : loads.map((n) => n.toFixed(2)).join(', ');

    const osName = os.type() === 'Windows_NT' ? 'Windows' : os.type();

    await text(
      `
╭━━━ ${e.rocket} *SERVER* ━━━╮
┃ ${e.bolt} OS: ${osName} (${os.platform()} ${os.arch()})
┃ ${e.tool} Release: ${os.release()}
┃ ${e.info} Node: ${process.version}
┃ ${e.user} CPU: ${cpuModel}
┃ ${e.bolt} Cores: ${cores}${speed}
┃ ${e.speed} Load Avg: ${loadAvg}
┃ ${e.speed} RAM: ${format.bytes(used)} / ${format.bytes(total)} (${ramPercent}%)
┃ ${e.star} Bot RAM: ${format.bytes(mem.rss)} (Heap: ${format.bytes(mem.heapUsed)})
┃ ${e.time} OS Up: ${format.uptime(os.uptime())}
┃ ${e.time} Bot Up: ${format.getUptime()}
╰━━━━━━━━━━━━━━━━━━━━━━╯`.trim(),
    );
  },
};
