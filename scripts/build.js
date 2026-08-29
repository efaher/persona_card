const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const source = require.resolve('socket.io-client/dist/socket.io.min.js');
const vendorDir = path.join(process.cwd(), 'vendor');
const target = path.join(vendorDir, 'socket.io.min.js');

fs.mkdirSync(vendorDir, { recursive: true });
fs.copyFileSync(source, target);

const runtime = spawnSync(process.execPath, ['scripts/write-runtime-config.js'], {
  cwd: process.cwd(),
  env: process.env,
  stdio: 'inherit'
});

if (runtime.status !== 0) process.exit(runtime.status || 1);
console.log('Socket.IO client vendored to vendor/socket.io.min.js');
