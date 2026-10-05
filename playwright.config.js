import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './workshop/browser-tests',
  fullyParallel: true,
  use: {
    baseURL: 'http://127.0.0.1:8791',
    browserName: 'chromium',
    launchOptions: process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {},
  },
  webServer: {command:'node scripts/serve-workshop.mjs',url:'http://127.0.0.1:8791',reuseExistingServer:!process.env.CI},
  projects: [
    { name: 'desktop', use: { viewport: { width: 1440, height: 1000 } } },
    { name: 'mobile', use: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } },
    ...(process.env.ALL_BROWSERS ? ['firefox','webkit'].map(browserName=>({name:browserName,use:{browserName,launchOptions:browserName==='webkit'&&process.env.WEBKIT_PATH?{executablePath:process.env.WEBKIT_PATH}:{},viewport:{width:1280,height:900}}})) : []),
  ],
});
