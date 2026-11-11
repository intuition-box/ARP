import { afterEach, describe, expect, spyOn, test } from 'bun:test';
import { basename, dirname, join } from 'node:path';
import { PassThrough } from 'node:stream';

import { processEnv } from '../src/install/env.ts';

const savedArpHome = process.env['ARP_HOME'];
afterEach(() => {
  if (savedArpHome === undefined) delete process.env['ARP_HOME'];
  else process.env['ARP_HOME'] = savedArpHome;
});

describe('the real process environment the installer runs in', () => {
  test('it carries the dist, the version and the Node binary running arp', () => {
    const env = processEnv('/opt/arp/dist', '9.9.9');
    expect(env.dist).toBe('/opt/arp/dist');
    expect(env.version).toBe('9.9.9');
    expect(env.node).toBe(process.execPath);
    expect(env.cwd).toBe(process.cwd());
    expect(env.now()).toBeInstanceOf(Date);
  });

  test('ARP_HOME names ARP’s directory, else it is ~/.arp', () => {
    process.env['ARP_HOME'] = '  /elsewhere/arp  ';
    expect(processEnv('d', 'v').arpHome).toBe('/elsewhere/arp');
    process.env['ARP_HOME'] = '   ';
    const env = processEnv('d', 'v');
    expect(env.arpHome).toBe(join(env.home, '.arp'));
  });

  test('which finds a binary on PATH and answers null for one that is not there', () => {
    const env = processEnv('d', 'v');
    const runtime = basename(process.execPath);
    const savedPath = process.env.PATH;
    process.env.PATH = `::${dirname(process.execPath)}`;
    try {
      expect(env.which(runtime)).toBe(join(dirname(process.execPath), runtime));
      expect(env.which('arp-no-such-binary-136')).toBeNull();
    } finally {
      process.env.PATH = savedPath;
    }
  });

  test('run spawns without a shell, writes stdin, and returns the exit code and output', () => {
    const env = processEnv('d', 'v');
    const echoed = env.run(
      [
        process.execPath,
        '-e',
        'process.stdout.write(require("fs").readFileSync(0, "utf8").toUpperCase()); process.exit(3)',
      ],
      'hello',
    );
    expect(echoed).toEqual({ code: 3, stdout: 'HELLO', stderr: '' });
    // A binary that is not there never reports success. Node says `null`, Bun `undefined`.
    const missing = env.run(['arp-no-such-binary-136']);
    expect(missing.code).not.toBe(0);
    expect(missing.stdout).toBe('');
  });

  test('out and err write one line each, to stdout and stderr', () => {
    const env = processEnv('d', 'v');
    const stdout = spyOn(process.stdout, 'write').mockImplementation(() => true);
    const stderr = spyOn(process.stderr, 'write').mockImplementation(() => true);
    try {
      env.out('to the reader');
      env.err('to the log');
      expect(stdout).toHaveBeenCalledWith('to the reader\n');
      expect(stderr).toHaveBeenCalledWith('to the log\n');
    } finally {
      stdout.mockRestore();
      stderr.mockRestore();
    }
  });

  test('ask reads one answer from stdin: y or yes is a yes, anything else a no', async () => {
    const env = processEnv('d', 'v');
    const stdout = spyOn(process.stdout, 'write').mockImplementation(() => true);
    const realStdin = Object.getOwnPropertyDescriptor(process, 'stdin');
    const answer = async (typed: string) => {
      const input = new PassThrough();
      Object.defineProperty(process, 'stdin', { value: input, configurable: true });
      const asked = env.ask('Install?');
      input.end(typed);
      return asked;
    };
    try {
      expect(await answer('YES\n')).toBe(true);
      expect(await answer(' y \n')).toBe(true);
      expect(await answer('nope\n')).toBe(false);
      expect(stdout).toHaveBeenCalledWith('Install? [y/N] ');
    } finally {
      if (realStdin !== undefined) Object.defineProperty(process, 'stdin', realStdin);
      stdout.mockRestore();
    }
  });
});
