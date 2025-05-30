// These will hold the mock functions. They are defined here so they can be
// accessed by tests, and assigned within the jest.mock factory.
let mockUse, mockGet, mockListen, mockStatic;

// Mock express
jest.mock('express', () => {
  // Create the mock functions within the factory to ensure they are initialized
  // before the factory returns.
  mockUse = jest.fn();
  mockGet = jest.fn();
  mockListen = jest.fn();
  mockStatic = jest.fn(() => 'mocked_static_middleware'); // express.static returns a middleware

  const app = {
    use: mockUse,
    get: mockGet,
    listen: mockListen,
    // Add any other express app properties/methods that server.js might use
  };
  // The mock for 'express' should be a function that returns the app object.
  // It should also have a 'static' property that is our mockStatic function.
  const mockExpressFn = jest.fn(() => app);
  mockExpressFn.static = mockStatic;
  return mockExpressFn;
});

// Now that express is mocked, requiring it will give us the mock.
const express = require('express'); 

describe('Server Tests', () => {
  beforeEach(() => {
    // Clear all mocks before each test.
    // Need to ensure these are defined if a test fails early or beforeEach is called unexpectedly.
    if (mockUse) mockUse.mockClear();
    if (mockGet) mockGet.mockClear();
    if (mockListen) mockListen.mockClear();
    if (mockStatic) mockStatic.mockClear(); // Clear mockStatic
    if (express && express.mockClear) express.mockClear();
    // It's important to re-require the server module if it initializes express on load
    // and you want to test that initialization.
    jest.isolateModules(() => {
      require('./server'); // server.js will now use the mocked express
    });
  });

  test('should initialize Express', () => {
    // express itself is now a jest.fn() that returns the app mock
    expect(express).toHaveBeenCalled();
  });

  test('should serve static files from __dirname', () => {
    expect(mockStatic).toHaveBeenCalledWith(__dirname);
    // Ensure server.js uses the result of express.static() in app.use()
    expect(mockUse).toHaveBeenCalledWith('mocked_static_middleware');
  });

  test('should setup GET route for /', () => {
    expect(mockGet).toHaveBeenCalledWith('/', expect.any(Function));
  });

  test('should listen on port 3000', () => {
    expect(mockListen).toHaveBeenCalledWith(3000, expect.any(Function));
  });
});
