declare module 'tunnelmole' {
  export function tunnelmole(options: { port: number | string; [key: string]: unknown }): Promise<string>;
}

// Deep imports for main/tunnel.ts (the package has no `exports` map). Only what is used.
declare module 'tunnelmole/dist/message-handlers.js' {
  export const messageHandlers: Record<string, unknown>;
}
declare module 'tunnelmole/dist/src/events/event-handler.js' {
  export const eventHandler: import('node:events').EventEmitter;
  export const URL_ASSIGNED: string;
}
