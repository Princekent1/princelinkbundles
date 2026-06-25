export const createLogger = (name: string) =>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (message: string, ...args: any[]) => console.log(`bundle-hub:${name} ${message}`, ...args)
