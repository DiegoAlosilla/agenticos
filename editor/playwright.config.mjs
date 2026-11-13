import {defineConfig} from '@playwright/test';
const baseURL = `http://127.0.0.1:${process.env.PORT || 8080}`;
export default defineConfig({
  testDir: './tests/integration', timeout: 60000, workers: 1,
  use: {baseURL, viewport: {width: 1440, height: 1000}, headless: true, trace: 'retain-on-failure'},
  reporter: [['list'], ['json', {outputFile: 'test-results/results.json'}]],
  webServer: {command: 'npm start', url: `${baseURL}/health`, reuseExistingServer: true, timeout: 180000}
});
