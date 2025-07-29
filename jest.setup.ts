// Suppress dotenv console messages during tests
const originalConsoleLog = console.log;
const originalConsoleWarn = console.warn;

beforeAll(() => {
  console.log = (...args: any[]) => {
    if (typeof args[0] === 'string' && args[0].includes('[dotenv@')) {
      return; // Suppress dotenv messages
    }
    originalConsoleLog(...args);
  };

  console.warn = (...args: any[]) => {
    if (typeof args[0] === 'string' && args[0].includes('[dotenv@')) {
      return; // Suppress dotenv messages
    }
    originalConsoleWarn(...args);
  };
});

afterAll(() => {
  console.log = originalConsoleLog;
  console.warn = originalConsoleWarn;
});
