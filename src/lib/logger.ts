type LogLevel = 'info' | 'error' | 'warn';

class Logger {
  private log(level: LogLevel, message: string, ...args: any[]) {
    const timestamp = new Date().toISOString();
    console[level](`[${timestamp}] ${message}`, ...args);
  }

  info(message: string, ...args: any[]) {
    this.log('info', message, ...args);
  }

  error(message: string, ...args: any[]) {
    this.log('error', message, ...args);
  }

  warn(message: string, ...args: any[]) {
    this.log('warn', message, ...args);
  }
}

export const logger = new Logger(); 