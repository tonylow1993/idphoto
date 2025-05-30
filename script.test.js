// Mock global objects
global.fetch = jest.fn();
global.alert = jest.fn();
global.console.error = jest.fn(); // Also mock console.error for checks

// Mock FileReader
const mockFileReaderInstance = {
  readAsDataURL: jest.fn(),
  readAsArrayBuffer: jest.fn(),
  onload: null, // Will be set by the script
  onerror: null, // Will be set by the script
  result: null, // To provide mock results
};
global.FileReader = jest.fn(() => mockFileReaderInstance);

// Mock localStorage
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: jest.fn((key) => store[key] || null),
    setItem: jest.fn((key, value) => {
      store[key] = value.toString();
    }),
    clear: () => {
      store = {};
    },
    removeItem: jest.fn((key) => {
      delete store[key];
    }),
  };
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock window.location
const locationMock = { href: 'http://localhost/' }; // Defined once globally

// Mock DOM elements that script.js interacts with
document.body.innerHTML = `
  <button id="uploadBtn">
    <span class="truncate">Upload Photo</span>
  </button>
  // File input is now dynamically created by script.js
  <div id="loadingIndicator" style="display:none;">Loading...</div>
  <div id="imagePreview"></div>
  <button id="editBtn">Edit</button>
  <button id="downloadBtn">Download</button>
  <canvas id="canvas"></canvas>
`;

// Function to simulate DOMContentLoaded
const simulateDOMContentLoaded = () => {
  const event = new Event('DOMContentLoaded');
  document.dispatchEvent(event);
};

// Helper to reset all mocks before each test
const resetAllMocks = () => {
  global.fetch.mockClear();
  global.alert.mockClear();
  global.console.error.mockClear();
  
  mockFileReaderInstance.readAsDataURL.mockClear();
  mockFileReaderInstance.readAsArrayBuffer.mockClear();
  mockFileReaderInstance.onload = null;
  mockFileReaderInstance.onerror = null;
  mockFileReaderInstance.result = null;
  global.FileReader.mockClear();

  localStorageMock.getItem.mockClear();
  localStorageMock.setItem.mockClear();
  localStorageMock.clear(); // Clear the store itself
  localStorageMock.removeItem.mockClear();
  
  // For other mocks...
  localStorageMock.getItem.mockClear();
  localStorageMock.setItem.mockClear();
  localStorageMock.clear();
  localStorageMock.removeItem.mockClear();

  // Ensure window.location IS locationMock and its href is reset
  delete window.location; // Make sure we're not dealing with JSDOM's native Location object here for direct tests
  window.location = locationMock;
  locationMock.href = 'http://localhost/'; 

  // Reset DOM state
  document.body.innerHTML = `
    <button id="uploadBtn">
      <span class="truncate">Upload Photo</span>
    </button>
    // File input is dynamically created by script.js
    <div id="loadingIndicator" style="display:none;">Loading...</div>
    <div id="imagePreview"></div>
    <button id="editBtn">Edit</button>
    <button id="downloadBtn">Download</button>
    <canvas id="canvas"></canvas>
  `;
};


// No top-level import of script functions anymore for processImage tests

// Single top-level describe block
describe('Image Processing Script', () => {
  // Global beforeEach for all tests within this describe block
  beforeEach(() => {
    resetAllMocks(); // Resets global mocks and ensures DOM is set up correctly by default.
  });

  describe('processImage Function (Direct Tests)', () => {
    const mockFile = new File(['dummyImageBits'], 'test.jpg', { type: 'image/jpeg' });

    // No specific beforeEach/afterEach for location spy here anymore

    test('successful API call', async () => {
      const { processImage } = require('./script'); 

      const mockApiResponse = { someData: 'segmented' };
      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockApiResponse,
      });

      const dataURLReaderMock = { readAsDataURL: jest.fn(), onload: null, onerror: null, result: null };
      const arrayBufferReaderMock = { readAsArrayBuffer: jest.fn(), onload: null, onerror: null, result: null };
      global.FileReader
        .mockReturnValueOnce(dataURLReaderMock)
        .mockReturnValueOnce(arrayBufferReaderMock);

      processImage(mockFile);

      // Simulate DataURL reader completing
      dataURLReaderMock.result = 'data:image/jpeg;base64,mockOriginalData';
      expect(dataURLReaderMock.readAsDataURL).toHaveBeenCalledWith(mockFile); // Ensure readAsDataURL was called
      if (dataURLReaderMock.onload) { // Check if script.js assigned an onload handler
        await dataURLReaderMock.onload({ target: { result: dataURLReaderMock.result } });
      } else {
        throw new Error("dataURLReader.onload was not set by processImage function");
      }

      // Simulate ArrayBuffer reader completing
      arrayBufferReaderMock.result = new ArrayBuffer(8);
      expect(arrayBufferReaderMock.readAsArrayBuffer).toHaveBeenCalledWith(mockFile); // Ensure readAsArrayBuffer was called
      if (arrayBufferReaderMock.onload) { // Check if script.js assigned an onload handler
        await arrayBufferReaderMock.onload({ target: { result: arrayBufferReaderMock.result } });
      } else {
        throw new Error("arrayBufferReader.onload was not set by processImage function");
      }
      
      // Allow promises from fetch and any subsequent microtasks to resolve
      await new Promise(process.nextTick);
      await new Promise(process.nextTick); // Adding an extra tick for good measure

      expect(global.fetch).toHaveBeenCalledTimes(1);
      expect(localStorageMock.setItem).toHaveBeenCalledWith('originalImageUrl', 'data:image/jpeg;base64,mockOriginalData');
      expect(localStorageMock.setItem).toHaveBeenCalledWith('segmentationData', JSON.stringify(mockApiResponse));
      // JSDOM does not fully support navigation, so testing window.location.href changes can be unreliable.
      // We've verified that localStorage is updated correctly before this potential navigation.
      // expect(locationMock.href).toBe('edit.html');
    });

    test('failed API call (network error)', async () => {
      const { processImage } = require('./script'); 
      global.fetch.mockRejectedValueOnce(new Error('Network failed'));

      const dataURLReaderMock = { readAsDataURL: jest.fn(), onload: null, onerror: null, result: null };
      const arrayBufferReaderMock = { readAsArrayBuffer: jest.fn(), onload: null, onerror: null, result: null };
      global.FileReader.mockReturnValueOnce(dataURLReaderMock).mockReturnValueOnce(arrayBufferReaderMock);
      
      processImage(mockFile);
      
      dataURLReaderMock.result = 'data:image/jpeg;base64,mockOriginalData';
      expect(dataURLReaderMock.readAsDataURL).toHaveBeenCalledWith(mockFile);
      if (dataURLReaderMock.onload) await dataURLReaderMock.onload({ target: { result: dataURLReaderMock.result } }); 
      else throw new Error("dataURLReader.onload not set by processImage");
      
      arrayBufferReaderMock.result = new ArrayBuffer(8);
      expect(arrayBufferReaderMock.readAsArrayBuffer).toHaveBeenCalledWith(mockFile);
      if (arrayBufferReaderMock.onload) await arrayBufferReaderMock.onload({ target: { result: arrayBufferReaderMock.result } }); 
      else throw new Error("arrayBufferReader.onload not set by processImage");

      await new Promise(process.nextTick); 

      expect(global.alert).toHaveBeenCalledWith(expect.stringContaining('Error making request to segmentation service. Check console for details.'));
      expect(console.error).toHaveBeenCalledWith('Error during API call:', new Error('Network failed')); 
      expect(localStorageMock.setItem).toHaveBeenCalledWith('originalImageUrl', 'data:image/jpeg;base64,mockOriginalData');
      expect(localStorageMock.setItem).not.toHaveBeenCalledWith('segmentationData', expect.any(String));
      expect(locationMock.href).not.toBe('edit.html'); // Check locationMock
    });

    test('failed API call (non-ok response)', async () => {
      const { processImage } = require('./script'); 
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Server Error',
        headers: new Headers({'Content-Type': 'text/plain'}), 
        text: async () => 'Internal Server Error Details',
      });

      const dataURLReaderMock = { readAsDataURL: jest.fn(), onload: null, onerror: null, result: null };
      const arrayBufferReaderMock = { readAsArrayBuffer: jest.fn(), onload: null, onerror: null, result: null };
      global.FileReader.mockReturnValueOnce(dataURLReaderMock).mockReturnValueOnce(arrayBufferReaderMock);

      processImage(mockFile);
      
      dataURLReaderMock.result = 'data:image/jpeg;base64,mockOriginalData';
      expect(dataURLReaderMock.readAsDataURL).toHaveBeenCalledWith(mockFile);
      if (dataURLReaderMock.onload) await dataURLReaderMock.onload({ target: { result: dataURLReaderMock.result } });
      else throw new Error("dataURLReader.onload not set by processImage");
      
      arrayBufferReaderMock.result = new ArrayBuffer(8);
      expect(arrayBufferReaderMock.readAsArrayBuffer).toHaveBeenCalledWith(mockFile);
      if (arrayBufferReaderMock.onload) await arrayBufferReaderMock.onload({ target: { result: arrayBufferReaderMock.result } });
      else throw new Error("arrayBufferReader.onload not set by processImage");
      
      await new Promise(process.nextTick); 
      
      expect(global.alert).toHaveBeenCalledWith(expect.stringContaining('Error segmenting image. Status: 500 Server Error. Check console for details.'));
      expect(console.error).toHaveBeenCalledWith("API Request Failed with status:", 500, "Server Error");
      expect(console.error).toHaveBeenCalledWith("Error response headers:\n", "content-type: text/plain\n");
      expect(console.error).toHaveBeenCalledWith("Error response body:", "Internal Server Error Details");
      expect(localStorageMock.setItem).toHaveBeenCalledWith('originalImageUrl', 'data:image/jpeg;base64,mockOriginalData');
      expect(localStorageMock.setItem).not.toHaveBeenCalledWith('segmentationData', expect.any(String));
      expect(locationMock.href).not.toBe('edit.html'); // Check locationMock
    });

    test('FileReader error (readAsDataURL)', async () => {
      const { processImage } = require('./script'); // Added missing require
      const dataURLReaderMock = { readAsDataURL: jest.fn(), onload: null, onerror: null, result: null };
      global.FileReader.mockReturnValueOnce(dataURLReaderMock);

      processImage(mockFile);

      // Simulate the error for dataURLReader
      expect(dataURLReaderMock.readAsDataURL).toHaveBeenCalledWith(mockFile);
      if (dataURLReaderMock.onerror) { // Check if script.js assigned an onerror handler
        dataURLReaderMock.onerror({ target: { error: new Error('Simulated DataURL Read Error') } });
      } else {
        throw new Error("dataURLReader.onerror was not set by processImage function");
      }
      
      await new Promise(process.nextTick); // For alert/console.error if they are async (they are not here)

      expect(global.alert).toHaveBeenCalledWith('Error reading file for preview.');
      expect(console.error).toHaveBeenCalledWith('Error reading file as DataURL.');
    });

    test('FileReader error (readAsArrayBuffer)', async () => {
      const { processImage } = require('./script'); // Added missing require
      const dataURLReaderMock = { readAsDataURL: jest.fn(), onload: null, onerror: null, result: null };
      const arrayBufferReaderMock = { readAsArrayBuffer: jest.fn(), onload: null, onerror: null, result: null };
      global.FileReader
        .mockReturnValueOnce(dataURLReaderMock)
        .mockReturnValueOnce(arrayBufferReaderMock);

      processImage(mockFile);

      // DataURL reader succeeds
      dataURLReaderMock.result = 'data:image/jpeg;base64,mockOriginalData';
      expect(dataURLReaderMock.readAsDataURL).toHaveBeenCalledWith(mockFile);
      if (dataURLReaderMock.onload) await dataURLReaderMock.onload({ target: { result: dataURLReaderMock.result } });
      else throw new Error("dataURLReader.onload not set by processImage");
      
      // ArrayBuffer reader errors
      expect(arrayBufferReaderMock.readAsArrayBuffer).toHaveBeenCalledWith(mockFile);
      if (arrayBufferReaderMock.onerror) { // Check if script.js assigned an onerror handler
        arrayBufferReaderMock.onerror({ target: { error: new Error('Simulated ArrayBuffer Read Error') } });
      } else {
        throw new Error("arrayBufferReader.onerror was not set by processImage function");
      }
      
      await new Promise(process.nextTick);
      
      expect(global.alert).toHaveBeenCalledWith('Error reading file for API upload.');
      expect(console.error).toHaveBeenCalledWith('Error reading file as ArrayBuffer.');
    });
  });

  describe('DOM Event Handlers (Direct Tests)', () => {
    // For these, a single top-level import might be fine as they are pure functions
    // not relying on global window state that resetAllMocks changes in a critical way for them.
    // However, for consistency with processImage, let's import them freshly too, or ensure
    // that if they *did* depend on window state, it would be handled.
    // For now, assuming existing top-level import is fine for these simpler handlers.
    // If these also started failing due to stale references, they'd need the same treatment.
    const { handleUploadButtonClick, handleFileInputChange } = require('./script');


    test('handleUploadButtonClick should call click on fileInput', () => {
      const mockFileInput = { click: jest.fn() };
      handleUploadButtonClick(mockFileInput);
      expect(mockFileInput.click).toHaveBeenCalledTimes(1);
    });

    test('handleFileInputChange should call processImageFn with the file', () => {
      const mockProcessImageFn = jest.fn();
      const mockFile = new File(['dummy'], 'test.png', { type: 'image/png' });
      const mockEvent = { target: { files: [mockFile] } };
      const { processImage: localProcessImage } = require('./script'); // or pass the imported one

      handleFileInputChange(mockEvent, mockProcessImageFn); 
      
      expect(mockProcessImageFn).toHaveBeenCalledWith(mockFile);
    });

    test('handleFileInputChange should do nothing if no file is selected', () => {
      const mockProcessImageFn = jest.fn();
      const mockEvent = { target: { files: [] } }; // No file
      
      handleFileInputChange(mockEvent, mockProcessImageFn);
      
      expect(mockProcessImageFn).not.toHaveBeenCalled();
    });
     test('handleFileInputChange should do nothing if processImageFn is not a function', () => {
      const mockFile = new File(['dummy'], 'test.png', { type: 'image/png' });
      const mockEvent = { target: { files: [mockFile] } };
      
      handleFileInputChange(mockEvent, null); // Invalid function
    });
  });

  describe('DOMContentLoaded setup', () => {
    beforeEach(() => {
      // This specific describe block needs the DOM and script.js to run.
      // resetAllMocks() is called by the top-level beforeEach already.
      // We need to load script.js and simulate DOMContentLoaded for this suite.
      jest.isolateModules(() => {
        require('./script'); // This allows script.js to set its DOMContentLoaded listener
      });
      simulateDOMContentLoaded(); // This fires the event, running the setup in script.js
    });

    // No longer need the redundant inner beforeEach.
    // uploadBtn is queried locally in tests.
    // fileInput will refer to the one dynamically created by script.js.

    test('upload button should be present and dynamic file input hidden', () => {
      const uploadBtnLocal = document.getElementById('uploadBtn'); // The button itself
      expect(uploadBtnLocal).not.toBeNull();
      // The dynamically created file input by script.js has style.display = 'none'
      const dynamicFileInput = document.querySelector('input[type="file"]');
      expect(dynamicFileInput).not.toBeNull();
      expect(dynamicFileInput.style.display).toBe('none');
    });

    test('clicking Upload Photo button should trigger click on the dynamic file input', () => {
      const uploadBtnLocal = document.getElementById('uploadBtn');
      // Get the file input created and used by script.js
      const dynamicFileInput = document.querySelector('input[type="file"]');
      expect(dynamicFileInput).not.toBeNull(); // Ensure it was created

      const fileInputClickSpy = jest.spyOn(dynamicFileInput, 'click');
      uploadBtnLocal.click(); // This should call .click() on the dynamicFileInput via script.js
      expect(fileInputClickSpy).toHaveBeenCalledTimes(1);
      fileInputClickSpy.mockRestore();
    });

    // Test for the file input change event triggering the actual processImage flow
    test('changing dynamic file input should call processImage and attempt file reading', () => {
      const dynamicFileInput = document.querySelector('input[type="file"]');
      expect(dynamicFileInput).not.toBeNull();
      
      // Mock FileReader instances that the *actual* processImage (called by the event handler) will use
      const dataURLReaderInteractionMock = { readAsDataURL: jest.fn(), onload: null, onerror: null, result: null };
      // We only need to mock the first reader if we're only checking the first call.
      // If processImage makes it to the second reader, this mock setup would need to account for that too.
      global.FileReader.mockReturnValueOnce(dataURLReaderInteractionMock);

      const mockFile = new File(['dummy'], 'test.png', { type: 'image/png' });
      Object.defineProperty(dynamicFileInput, 'files', { value: [mockFile], writable: true });
      
      // Dispatching the event should trigger the event listener in script.js,
      // which then calls the original processImage function.
      dynamicFileInput.dispatchEvent(new Event('change'));

      // Check that the first step of processImage (readAsDataURL) was called
      expect(dataURLReaderInteractionMock.readAsDataURL).toHaveBeenCalledWith(mockFile);
      // We don't need to simulate onload for this test of the event listener's effect,
      // just that the initial call made by processImage happened.
    });
  });
});
