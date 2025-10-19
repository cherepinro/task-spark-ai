type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  [key: string]: unknown;
}

class Logger {
  private formatMessage(level: LogLevel, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString();
    const contextStr = context ? ` ${JSON.stringify(context)}` : '';
    return `[${timestamp}] [${level.toUpperCase()}] ${message}${contextStr}`;
  }

  debug(message: string, context?: LogContext): void {
    console.log(this.formatMessage('debug', message, context));
  }

  info(message: string, context?: LogContext): void {
    console.log(this.formatMessage('info', message, context));
  }

  warn(message: string, context?: LogContext): void {
    console.warn(this.formatMessage('warn', message, context));
  }

  error(message: string, error?: Error | unknown, context?: LogContext): void {
    const errorContext: LogContext = {
      ...context,
      error: error instanceof Error ? {
        name: error.name,
        message: error.message,
        stack: error.stack,
      } : error,
    };
    console.error(this.formatMessage('error', message, errorContext));
  }

  // Specific logger for API endpoints
  apiError(endpoint: string, error: Error | unknown, context?: LogContext): void {
    this.error(`API Error: ${endpoint}`, error, context);
  }

  // Specific logger for service errors
  serviceError(service: string, operation: string, error: Error | unknown, context?: LogContext): void {
    this.error(`Service Error: ${service}.${operation}`, error, context);
  }
}

export const logger = new Logger();
