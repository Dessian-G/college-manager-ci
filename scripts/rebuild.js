// Rebuild better-sqlite3 for the installed Electron version
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

const { execSync } = require('child_process')
const path = require('path')

const electronPath = require('../node_modules/electron')
const electronVersion = require('../node_modules/electron/package.json').version

console.log(`Rebuild better-sqlite3 pour Electron ${electronVersion}...`)

try {
  execSync(
    `node-gyp-build`,
    {
      cwd: path.join(__dirname, '../node_modules/better-sqlite3'),
      stdio: 'inherit',
      env: {
        ...process.env,
        npm_config_runtime: 'electron',
        npm_config_target: electronVersion,
        npm_config_disturl: 'https://electronjs.org/headers',
        npm_config_arch: 'x64',
        npm_config_target_arch: 'x64',
        NODE_TLS_REJECT_UNAUTHORIZED: '0',
      },
    }
  )
  console.log('Rebuild OK')
} catch (e) {
  // Try via electron-rebuild
  try {
    execSync(
      `npx electron-rebuild -f -w better-sqlite3 --electron-version ${electronVersion}`,
      {
        cwd: path.join(__dirname, '..'),
        stdio: 'inherit',
        env: { ...process.env, NODE_TLS_REJECT_UNAUTHORIZED: '0' },
      }
    )
    console.log('electron-rebuild OK')
  } catch (e2) {
    console.warn('Rebuild ignoré (non bloquant):', e2.message?.slice(0, 100))
  }
}
