import { afterAll, afterEach, beforeEach } from 'vite-plus/test';
import { finishFile, finishTest, install, startTest } from './state';

install();
beforeEach(() => {
  install();
  startTest();
});
afterEach(finishTest);
afterAll(finishFile);
