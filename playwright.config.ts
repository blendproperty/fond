import { defineConfig, devices } from '@playwright/test';
export default defineConfig({testDir:'./e2e',use:{baseURL:'http://127.0.0.1:3100'},projects:[{name:'desktop',use:{...devices['Desktop Chrome']}},{name:'mobile',use:{...devices['iPhone 13'],defaultBrowserType:'chromium'}}],webServer:{command:'npm run start -- --port 3100',url:'http://127.0.0.1:3100',reuseExistingServer:!process.env.CI}});
