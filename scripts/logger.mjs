// LOGGER
const colors = {
  reset: "\x1b[0m",
  cyan: "\x1b[36m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
};

function createLogger(name = "") {
  const prefix = name ? ` [${name}]` : "";

  return {
    info: (msg) =>
      console.log(`${colors.cyan}[info]${prefix} ${msg}${colors.reset}`),
    success: (msg) =>
      console.log(`${colors.green}[success]${prefix} ${msg}${colors.reset}`),
    warn: (msg) =>
      console.warn(`${colors.yellow}[warn]${prefix} ${msg}${colors.reset}`),
    error: (msg) =>
      console.error(`${colors.red}[error]${prefix} ${msg}${colors.reset}`),
  };
}

export default createLogger;

