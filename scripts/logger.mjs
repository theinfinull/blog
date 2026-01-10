const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
}

function createLogger(name = '') {
  const prefix = name ? `[${name}]` : ''

  return {
    info: (msg) => console.log(`${prefix} [INFO] ${msg}`),
    success: (msg) =>
      console.log(`${colors.green}${prefix} [SUCCESS] ${msg}${colors.reset}`),
    warn: (msg) =>
      console.warn(`${colors.yellow}${prefix} [WARN] ${msg}${colors.reset}`),
    error: (msg) =>
      console.error(`${colors.red}${prefix} [ERROR] ${msg}${colors.reset}`),
    debug: (msg) =>
      console.log(`${colors.cyan}${prefix} [DEBUG] ${msg}${colors.reset}`),
  }
}

export default createLogger
