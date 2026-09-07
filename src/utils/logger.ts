type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';

const REDACT_KEYS = ['password', 'key', 'token', 'secret', 'authorization'];

function sanitize(data: any): any {
  if (!data || typeof data !== 'object') return data;
  if (Array.isArray(data)) return data.map(sanitize);

  const clean: Record<string, any> = {};
  for (const [k, v] of Object.entries(data)) {
    if (REDACT_KEYS.some((rk) => k.toLowerCase().includes(rk))) {
      clean[k] = '[REDACTED]';
    } else if (typeof v === 'object' && v !== null) {
      clean[k] = sanitize(v);
    } else {
      clean[k] = v;
    }
  }
  return clean;
}

export class Logger {
  private context: string;

  constructor(context: string) {
    this.context = context;
  }

  private log(level: LogLevel, message: string, meta?: any) {
    const entry = {
      timestamp: new Date().toISOString(),
      level,
      context: this.context,
      message,
      ...(meta ? { metadata: sanitize(meta) } : {}),
    };
    const output = JSON.stringify(entry);
    if (level === 'ERROR') {
      console.error(output);
    } else if (level === 'WARN') {
      console.warn(output);
    } else {
      console.log(output);
    }
  }

  info(message: string, meta?: any) {
    this.log('INFO', message, meta);
  }

  warn(message: string, meta?: any) {
    this.log('WARN', message, meta);
  }

  error(message: string, meta?: any) {
    this.log('ERROR', message, meta);
  }

  debug(message: string, meta?: any) {
    this.log('DEBUG', message, meta);
  }
}

export const createLogger = (context: string) => new Logger(context);
export const rootLogger = new Logger('PolarisBackend');
