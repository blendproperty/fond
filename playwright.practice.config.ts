import {defineConfig} from '@playwright/test';
export default defineConfig({testDir:'./practice-tests',outputDir:'practice-results',workers:1,timeout:90000,use:{baseURL:'http://127.0.0.1:3101',viewport:{width:1280,height:900}},webServer:{command:'npx tsx scripts/coffee-practice.ts',url:'http://127.0.0.1:3101/practice',reuseExistingServer:false,timeout:45000}});
