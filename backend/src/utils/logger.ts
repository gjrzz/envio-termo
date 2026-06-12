type LogLevel = 'info' | 'warn' | 'error' | 'debug';

function format(level: LogLevel, message: string, meta?: unknown): string {
  const timestamp = new Date().toISOString();
  const base = `[${timestamp}] [${level.toUpperCase()}] ${message}`;

  if (meta === undefined) {
    return base;
  }

  return `${base} ${typeof meta === 'string' ? meta : JSON.stringify(meta)}`;
}

export const logger = {
  info(message: string, meta?: unknown): void {
    console.log(format('info', message, meta));
  },
  warn(message: string, meta?: unknown): void {
    console.warn(format('warn', message, meta));
  },
  error(message: string, meta?: unknown): void {
    console.error(format('error', message, meta));
  },
  debug(message: string, meta?: unknown): void {
    if (process.env.NODE_ENV !== 'production') {
      console.debug(format('debug', message, meta));
    }
  },
};
