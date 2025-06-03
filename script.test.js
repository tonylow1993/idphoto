// script.test.js
const { openImageDB, saveImageToDB, getImageFromDB } = require('./script'); // Assuming functions are exported or globally available via jsdom

// Mock IndexedDB
// More comprehensive mocking might be needed depending on the exact interactions.
// This is a basic version.
const mockDB = {
  transaction: jest.fn(),
  close: jest.fn(),
  objectStoreNames: {
    contains: jest.fn()
  },
  createObjectStore: jest.fn()
};
const mockTransaction = {
  objectStore: jest.fn(),
  oncomplete: null,
  onerror: null,
  abort: jest.fn()
};
const mockStore = {
  put: jest.fn(),
  get: jest.fn()
};

// Global mock for indexedDB
global.indexedDB = {
  open: jest.fn(),
  deleteDatabase: jest.fn()
};

// Mock FileReader
global.FileReader = jest.fn(() => ({
    readAsDataURL: jest.fn(),
    onload: null,
    onerror: null,
    result: 'data:image/png;base64,dummydata'
}));

// Mock DOM elements and localStorage if functions interact with them directly
// For the DB functions, this might not be strictly necessary unless they log to specific elements not present.
document.body.innerHTML = `
  <div id="loading-indicator"></div>
  <div id="loading-text"></div>
  <div id="loading-bar-progress"></div>
  <button><span>Upload Photo</span></button>
`;
global.localStorage = {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn()
};
global.alert = jest.fn();
global.URL.createObjectURL = jest.fn(() => 'blob:http://localhost/mock-blob-url');
global.URL.revokeObjectURL = jest.fn();


// Utility to simulate IDBRequest success/error
const simulateIDBRequest = (request, result, error) => {
  if (error) {
    request.onerror(error);
  } else {
    request.result = result;
    request.onsuccess({ target: request });
  }
};

// Reset mocks before each test
beforeEach(() => {
  jest.clearAllMocks();

  // Default implementations
  global.indexedDB.open.mockImplementation((dbName, version) => {
    const request = { onupgradeneeded: null, onsuccess: null, onerror: null };
    // Simulate async opening
    setTimeout(() => {
      // Check if onupgradeneeded should be called
      // For simplicity, we'll assume version 1, so upgradeneeded might not always fire
      // if the mockDB.objectStoreNames.contains returns true.
      // Let's simulate it needs upgrade for the first open in a test run where it might be called.
      if (request.onupgradeneeded) {
         mockDB.objectStoreNames.contains.mockReturnValueOnce(false); // Store doesn't exist
         request.onupgradeneeded({ target: { result: mockDB } });
      }
      simulateIDBRequest(request, mockDB);
    }, 0);
    return request;
  });

  mockDB.transaction.mockImplementation((stores, mode) => {
    mockTransaction.mode = mode;
    return mockTransaction;
  });
  mockTransaction.objectStore.mockImplementation((name) => mockStore);

  // Default success for put/get, can be overridden in specific tests
  mockStore.put.mockImplementation((data, key) => {
    const request = { onsuccess: null, onerror: null };
    setTimeout(() => simulateIDBRequest(request, key), 0); // Simulate success with the key
    return request;
  });
  mockStore.get.mockImplementation((key) => {
    const request = { onsuccess: null, onerror: null };
    // Simulate finding an item or not. Overridden in tests.
    setTimeout(() => simulateIDBRequest(request, undefined), 0);
    return request;
  });
   mockDB.createObjectStore.mockReturnValue({ createIndex: jest.fn() }); // Part of onupgradeneeded
});

describe('IndexedDB Helper Functions from script.js', () => {
  describe('openImageDB', () => {
    test('should open the database successfully', async () => {
      const db = await openImageDB();
      expect(global.indexedDB.open).toHaveBeenCalledWith('ImageEditorDB', 1);
      expect(db).toBe(mockDB);
    });

    test('should handle errors when opening the database', async () => {
      const openError = new Error('Open failed');
      global.indexedDB.open.mockImplementationOnce(() => {
        const request = { onsuccess: null, onerror: null };
        setTimeout(() => simulateIDBRequest(request, null, { target: { error: openError } }), 0);
        return request;
      });
      await expect(openImageDB()).rejects.toMatch("Error opening IndexedDB: " + openError);
    });

    test('should create object store if it does not exist during onupgradeneeded', async () => {
        mockDB.objectStoreNames.contains.mockReturnValueOnce(false); // Store does not exist
        global.indexedDB.open.mockImplementationOnce((dbName, version) => {
            const request = { onupgradeneeded: null, onsuccess: null, onerror: null };
            setTimeout(() => {
                // Simulate onupgradeneeded
                const event = { target: { result: mockDB } };
                if (request.onupgradeneeded) {
                    request.onupgradeneeded(event);
                }
                simulateIDBRequest(request, mockDB); // Then success
            }, 0);
            return request;
        });

        await openImageDB();
        expect(mockDB.objectStoreNames.contains).toHaveBeenCalledWith('processedImages');
        expect(mockDB.createObjectStore).toHaveBeenCalledWith('processedImages');
    });

    test('should not create object store if it already exists during onupgradeneeded', async () => {
        mockDB.objectStoreNames.contains.mockReturnValueOnce(true); // Store exists
         global.indexedDB.open.mockImplementationOnce((dbName, version) => {
            const request = { onupgradeneeded: null, onsuccess: null, onerror: null };
            setTimeout(() => {
                const event = { target: { result: mockDB } };
                 if (request.onupgradeneeded) {
                    request.onupgradeneeded(event);
                }
                simulateIDBRequest(request, mockDB);
            }, 0);
            return request;
        });
        await openImageDB();
        expect(mockDB.objectStoreNames.contains).toHaveBeenCalledWith('processedImages');
        expect(mockDB.createObjectStore).not.toHaveBeenCalled();
    });
  });

  describe('saveImageToDB', () => {
    test('should save an image blob to the store', async () => {
      const blob = new Blob(['test'], { type: 'image/png' });
      await saveImageToDB(mockDB, 'testImage', blob);
      expect(mockDB.transaction).toHaveBeenCalledWith(['processedImages'], 'readwrite');
      expect(mockTransaction.objectStore).toHaveBeenCalledWith('processedImages');
      expect(mockStore.put).toHaveBeenCalledWith(blob, 'testImage');
    });

    test('should handle errors when saving an image', async () => {
      const saveError = new Error('Save failed');
      mockStore.put.mockImplementationOnce(() => {
        const request = { onsuccess: null, onerror: null };
        setTimeout(() => simulateIDBRequest(request, null, { target: { error: saveError } }), 0);
        return request;
      });
      const blob = new Blob(['test']);
      await expect(saveImageToDB(mockDB, 'testImage', blob)).rejects.toMatch("Error saving image: " + saveError);
    });
     test('should reject if DB is not initialized', async () => {
        const blob = new Blob(['test']);
        await expect(saveImageToDB(null, 'testImage', blob)).rejects.toEqual("DB not initialized");
    });
  });

  describe('getImageFromDB', () => {
    test('should retrieve an image blob from the store', async () => {
      const mockBlob = new Blob(['retrieved'], { type: 'image/png' });
      mockStore.get.mockImplementationOnce((key) => {
        const request = { onsuccess: null, onerror: null };
        setTimeout(() => simulateIDBRequest(request, mockBlob), 0);
        return request;
      });
      const result = await getImageFromDB(mockDB, 'testImage');
      expect(mockDB.transaction).toHaveBeenCalledWith(['processedImages'], 'readonly');
      expect(mockTransaction.objectStore).toHaveBeenCalledWith('processedImages');
      expect(mockStore.get).toHaveBeenCalledWith('testImage');
      expect(result).toBe(mockBlob);
    });

    test('should return undefined if image not found', async () => {
      mockStore.get.mockImplementationOnce((key) => {
        const request = { onsuccess: null, onerror: null };
        setTimeout(() => simulateIDBRequest(request, undefined), 0); // Simulate not found
        return request;
      });
      const result = await getImageFromDB(mockDB, 'nonExistentImage');
      expect(result).toBeUndefined();
    });

    test('should handle errors when retrieving an image', async () => {
      const getError = new Error('Get failed');
      mockStore.get.mockImplementationOnce(() => {
        const request = { onsuccess: null, onerror: null };
        setTimeout(() => simulateIDBRequest(request, null, { target: { error: getError } }), 0);
        return request;
      });
      await expect(getImageFromDB(mockDB, 'testImage')).rejects.toMatch("Error getting image: " + getError);
    });
     test('should reject if DB is not initialized', async () => {
        await expect(getImageFromDB(null, 'testImage')).rejects.toEqual("DB not initialized");
    });
  });
});

// To make script.js runnable in Node for Jest, its direct DOM manipulations
// and global event listeners (DOMContentLoaded) need to be handled.
// The functions themselves (openImageDB, etc.) are testable if exported.
// If script.js is not structured to export these, the subtask will need to modify it.
// For now, assuming they can be imported/required.
// If script.js is written as an IIFE or only attaches to DOMContentLoaded,
// it might need refactoring for easier testing of individual functions.
// The provided script.js content seems to define functions at the top level,
// so they should be require-able if not inside a DOMContentLoaded listener exclusively.
// The `require('./script')` will work if these functions are implicitly on `module.exports`
// or if `script.js` is modified to export them.
// We'll add exports to script.js as part of this subtask.
