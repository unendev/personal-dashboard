import { spawn } from 'child_process';
import net from 'net';

const START_PORT = 10000;
const MAX_PORTS_TO_TRY = 10;
const HOST = '0.0.0.0'; // Use 0.0.0.0 to avoid permission issues with 127.0.0.1

/**
 * Checks if a port is currently in use.
 * @param {number} port The port to check.
 * @returns {Promise<boolean>} A promise that resolves to true if the port is in use, false otherwise.
 */
function isPortInUse(port) {
  return new Promise((resolve, reject) => {
    const server = net.createServer();

    server.once('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        resolve(true); // Port is definitely in use
      } else {
        // Any other error (like EACCES) means we can't use this port or bind to it.
        // Rejecting is better to signal a fatal configuration/permission problem.
        reject(err);
      }
    });

    server.once('listening', () => {
      server.close();
      resolve(false); // Port is free
    });

    server.listen(port, HOST);
  });
}

/**
 * Finds the first available port starting from a given port.
 * @param {number} startPort The initial port to try.
 * @param {number} maxAttempts The maximum number of ports to try.
 * @returns {Promise<number | null>} A promise that resolves to an available port number, or null if none are found.
 */
async function findFreePort(startPort, maxAttempts) {
  for (let i = 0; i < maxAttempts; i++) {
    const port = startPort + i;
    console.log(`Checking port ${port}...`);
    try {
      const inUse = await isPortInUse(port);
      if (!inUse) {
        console.log(`Port ${port} is available.`);
        return port;
      }
      console.log(`Port ${port} is already in use.`);
    } catch (err) {
      // Re-throw the error from isPortInUse, likely EACCES
      throw err;
    }
  }
  return null;
}

/**
 * Main function to start the development server.
 */
async function startDevServer() {
  try {
    const freePort = await findFreePort(START_PORT, MAX_PORTS_TO_TRY);

    if (freePort === null) {
      console.error(`Could not find an available port between ${START_PORT} and ${START_PORT + MAX_PORTS_TO_TRY - 1}.`);
      console.error('Please free up a port or increase MAX_PORTS_TO_TRY.');
      process.exit(1);
    }

    console.log(`Starting Next.js development server on port ${freePort}...`);
    
    const nextCommand = 'node';
    const nextArgs = ['node_modules/next/dist/bin/next', 'dev', '-p', freePort.toString(), '-H', HOST];

    // Spawn the Next.js dev server as a child process.
    // 'inherit' pipes the child's stdio to the parent, so we see all Next.js logs.
    const child = spawn(nextCommand, nextArgs, { stdio: 'inherit' });

    child.on('error', (err) => {
      // This catches errors specific to the spawn operation itself, not the child process's output.
      console.error('Failed to spawn Next.js process:', err);
      process.exit(1);
    });

    child.on('close', (code) => {
      // This will be called when the Next.js server is stopped (e.g., with Ctrl+C).
      console.log(`Next.js process exited with code ${code}`);
      process.exit(code);
    });
  } catch (err) {
    if (err.code === 'EACCES') {
      console.error(`\n[FATAL] 权限拒绝: 无法绑定到指定端口 (${START_PORT}-${START_PORT + MAX_PORTS_TO_TRY - 1} 范围内)。`);
      console.error(`错误代码: ${err.code}`);
      console.error(`这是一个系统级问题，而不是应用程序代码问题。\n`);
      console.error('可能的原因:');
      console.error('  1. 另一个应用程序或服务（如 Hyper-V, WSL, 或 Docker）预留了此端口范围。');
      console.error('  2. 您的系统防火墙或杀毒软件阻止了 Node.js 监听此端口。');
      console.error('  3. 您在具有受限网络权限的环境中运行。');
      console.error('  4. 在 Windows 上，可以尝试以管理员身份运行 PowerShell/CMD。\n');
      console.error('建议的操作:');
      console.error('  - 尝试完全不同的端口范围 (例如，通过修改 START_PORT 或 MAX_PORTS_TO_TRY)。');
      console.error('  - 检查阻止 Node.js 的防火墙规则。');
      console.error('  - 在 Windows 管理员终端中运行 `netsh interface ipv4 show excludedportrange protocol=tcp` 查看预留端口范围。\n');
      process.exit(1);
    } else {
      console.error('查找可用端口时发生意外错误:', err);
      process.exit(1);
    }
  }
}

startDevServer();
