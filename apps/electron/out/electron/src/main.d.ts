import { BrowserWindow } from 'electron';
declare class RPAMain {
    private mainWindow;
    private executor;
    constructor();
    initialize(): Promise<void>;
    private initializeDatabase;
    private createMainWindow;
    private setupAppEvents;
    getMainWindow(): BrowserWindow | null;
}
declare const rpaMain: RPAMain;
export { rpaMain };
//# sourceMappingURL=main.d.ts.map