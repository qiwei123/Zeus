import { IpcRendererEvent } from 'electron';
import { IPCChannel } from '@shared/types/rpa.js';
interface IPCInvokeAPI {
    invoke: <T = unknown, R = unknown>(channel: IPCChannel, payload?: T) => Promise<R>;
}
interface IPCSendAPI {
    send: (channel: IPCChannel, payload?: unknown) => void;
    on: (channel: IPCChannel, callback: (event: IpcRendererEvent, ...args: unknown[]) => void) => void;
    once: (channel: IPCChannel, callback: (event: IpcRendererEvent, ...args: unknown[]) => void) => void;
    removeListener: (channel: IPCChannel, callback: (event: IpcRendererEvent, ...args: unknown[]) => void) => void;
}
declare const ipcAPI: IPCInvokeAPI & IPCSendAPI;
declare global {
    interface Window {
        electronAPI: typeof ipcAPI;
    }
}
export {};
//# sourceMappingURL=preload.d.ts.map