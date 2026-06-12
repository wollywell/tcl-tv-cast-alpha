import { spawn } from 'node:child_process';

export function runCommand({ command, args, cwd, env, input }, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      env: { ...process.env, ...env },
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: options.shell ?? false,
    });
    let stdout = '';
    let stderr = '';

    if (input) {
      child.stdin.write(input);
    }
    child.stdin.end();

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });
    child.on('error', reject);
    child.on('close', (code) => {
      const output = [stdout.trim(), stderr.trim()].filter(Boolean).join('\n');
      if (code === 0) {
        resolve(output || `${command} ${args.join(' ')} completed`);
        return;
      }
      reject(new Error(output || `${command} ${args.join(' ')} failed with ${code}`));
    });
  });
}
