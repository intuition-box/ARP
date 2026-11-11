/** The probe's process: {@link start} with the environment, the guarded way out, the log on
 *  stderr, and a clean stop on SIGTERM, which is how a container is stopped (task 140, ADR `0200`). */
import { guardedIo, start } from './server.ts';

const started = start(process.env, guardedIo, (line) => process.stderr.write(`${line}\n`));
if ('error' in started) {
  process.stderr.write(`arp-probe: ${started.error}\n`);
  process.exit(1);
}
for (const signal of ['SIGTERM', 'SIGINT'] as const)
  process.once(signal, () => void started.stop().then(() => process.exit(0)));
for (const line of started.banner) process.stderr.write(`${line}\n`);
