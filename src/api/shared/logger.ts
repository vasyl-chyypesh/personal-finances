/* eslint-disable no-console */
export class Logger {
  public static log(...args: unknown[]) {
    console.log(`[${new Date().toISOString()}]`, ...args);
  }

  public static error(...args: unknown[]) {
    console.error(`[${new Date().toISOString()}] Error:`, ...args);
  }
}
