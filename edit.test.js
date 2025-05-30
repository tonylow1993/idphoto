// A. Initial Setup and Mocks

// 1. JSDOM Environment & HTML Structure
const setupJSDOMAndHTML = () => {
  document.body.innerHTML = `
    <canvas id="imageCanvas"></canvas>
    <input id="imgWidth" type="number" value="0">
    <input id="imgHeight" type="number" value="0">
    <button id="downloadButton">Download</button>
    
    <input type="radio" name="bgColor" value="#FFFFFF" id="bgColorWhite" checked>
    <label for="bgColorWhite">White</label>
    <input type="radio" name="bgColor" value="#0000FF" id="bgColorBlue">
    <label for="bgColorBlue">Blue</label>
    <input type="radio" name="bgColor" value="#FF0000" id="bgColorRed">
    <label for="bgColorRed">Red</label>
    <input type="radio" name="bgColor" value="#00FF00" id="bgColorGreen">
    <label for="bgColorGreen">Green</label>
    <input type="radio" name="bgColor" value="#CCCCCC" id="bgColorGrey">
    <label for="bgColorGrey">Grey</label>

    <input type="radio" name="downloadFormat" value="image/png" id="formatPng" checked>
    <label for="formatPng">PNG</label>
    <input type="radio" name="downloadFormat" value="image/jpeg" id="formatJpeg">
    <label for="formatJpeg">JPEG</label>
    <input type="radio" name="downloadFormat" value="image/webp" id="formatWebp">
    <label for="formatWebp">WEBP</label>

    <button id="reuploadButton">Re-upload</button>
    <!-- edit.js dynamically creates the reuploadFileInput -->
  `;
};

// 2. Mock window.localStorage
const mockOriginalImageUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII='; // 1x1 black pixel
const mockSegmentationPolygons = [{ points: [[10,10], [90,10], [90,90], [10,90]], label: 'object' }];
const mockSegmentationData = JSON.stringify({ polygons: mockSegmentationPolygons, width: 100, height: 100 });

const localStorageMock = (() => {
  let store = {
    originalImageUrl: mockOriginalImageUrl,
    segmentationData: mockSegmentationData,
  };
  return {
    getItem: jest.fn((key) => store[key] || null),
    setItem: jest.fn((key, value) => {
      if (value === null) {
        delete store[key]; 
      } else {
        store[key] = value.toString();
      }
    }),
    clear: () => { store = {}; },
    removeItem: jest.fn((key) => { delete store[key]; }),
    __resetStore: () => {
        store = {
            originalImageUrl: mockOriginalImageUrl,
            segmentationData: mockSegmentationData,
        };
    }
  };
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock, writable: true, configurable: true });


// 3. Mock Canvas API
const mockCtx = {
  fillRect: jest.fn(), drawImage: jest.fn(), beginPath: jest.fn(), moveTo: jest.fn(),
  lineTo: jest.fn(), closePath: jest.fn(), fill: jest.fn(),
  toDataURL: jest.fn(() => 'data:image/png;base64,mockCanvasData'),
  getImageData: jest.fn(() => ({ data: new Uint8ClampedArray(4 * 100 * 100) })), 
  putImageData: jest.fn(), clearRect: jest.fn(), save: jest.fn(), restore: jest.fn(),
  setTransform: jest.fn(), globalCompositeOperation: '', fillStyle: '', 
  strokeStyle: '', lineWidth: 0, 
  createImageData: jest.fn((width, height) => ({
    width, height, data: new Uint8ClampedArray(width * height * 4),
  })),
};
HTMLCanvasElement.prototype.getContext = jest.fn(() => mockCtx);

const mockPolyMaskCtx = { ...mockCtx, drawImage: jest.fn(), fillStyle: '', beginPath: jest.fn(), moveTo: jest.fn(), lineTo: jest.fn(), closePath: jest.fn(), fill: jest.fn() };
const mockTempOriginalCtx = { ...mockCtx, drawImage: jest.fn(), globalCompositeOperation: '', fillStyle: '' };
const mockGenericTempCtx = { ...mockCtx, drawImage: jest.fn() };

let createdCanvasCount = 0; 
const baseOriginalCreateElement = document.createElement; 

document.createElement = (tagName) => {
  const lowerTagName = tagName.toLowerCase();
  if (lowerTagName === 'canvas') {
    createdCanvasCount++;
    const canvas = baseOriginalCreateElement.call(document, lowerTagName);
    if (document.createElement.isDownloadMockActive) { 
        canvas.getContext = jest.fn(() => mockGenericTempCtx);
    } else if (document.createElement.isReuploadMockActive) { 
        canvas.getContext = jest.fn(() => mockGenericTempCtx);
    }
    else if (createdCanvasCount === 1) { canvas.getContext = jest.fn(() => mockPolyMaskCtx); }
    else if (createdCanvasCount === 2) { canvas.getContext = jest.fn(() => mockTempOriginalCtx); }
    else { canvas.getContext = jest.fn(() => mockGenericTempCtx); }
    return canvas;
  }
  return baseOriginalCreateElement.call(document, lowerTagName);
};


// 4. Mock Image constructor
let mockImageInstance; 
class MockImage {
  static _staticNextNaturalWidth;
  static _staticNextNaturalHeight;

  constructor() {
    mockImageInstance = this; this.onload = () => {}; this.onerror = () => {};
    this._src = ''; 
    this.naturalWidth = MockImage._staticNextNaturalWidth !== undefined ? MockImage._staticNextNaturalWidth : 100; 
    this.naturalHeight = MockImage._staticNextNaturalHeight !== undefined ? MockImage._staticNextNaturalHeight : 100;
    this.complete = false; 

    // Reset static properties after using them for this instance
    MockImage._staticNextNaturalWidth = undefined;
    MockImage._staticNextNaturalHeight = undefined;
  }
  set src(value) {
    this._src = value;
    if (value) {
      Promise.resolve().then(() => {
        // Dimensions are set in constructor based on static props, or by direct _setMockDimensions
        if (this._mockNaturalWidth !== undefined) this.naturalWidth = this._mockNaturalWidth;
        if (this._mockNaturalHeight !== undefined) this.naturalHeight = this._mockNaturalHeight;
        
        this.complete = true; if (typeof this.onload === 'function') this.onload();
      });
    } else { this.complete = false; }
  }
  get src() { return this._src; }
  _setMockDimensions(w, h) { // For direct manipulation if needed, less common now
    this._mockNaturalWidth = w; this._mockNaturalHeight = h;
  }
}
window.Image = MockImage;

// 5. Mock window.alert
global.alert = jest.fn();

// Mock window.location
const locationMock = { href: 'http://localhost/edit.html', assign: jest.fn(), reload: jest.fn() };

// Helper to load edit.js
const loadEditScript = () => {
  jest.isolateModules(() => { require('./edit.js'); });
  document.dispatchEvent(new Event('DOMContentLoaded'));
};

// Helper to reset all mocks
const resetAllGlobalMocks = () => {
  localStorageMock.__resetStore(); localStorageMock.getItem.mockClear();
  localStorageMock.setItem.mockClear(); localStorageMock.removeItem.mockClear();
  Object.values(mockCtx).forEach(m => typeof m === 'function' && m.mockClear && m.mockClear());
  mockCtx.toDataURL.mockReturnValue('data:image/png;base64,mockCanvasData');
  mockCtx.getImageData.mockReturnValue({ data: new Uint8ClampedArray(4 * 100 * 100) });
  mockCtx.globalCompositeOperation = ''; mockCtx.fillStyle = ''; 
  Object.values(mockPolyMaskCtx).forEach(m => typeof m === 'function' && m.mockClear && m.mockClear());
  Object.values(mockTempOriginalCtx).forEach(m => typeof m === 'function' && m.mockClear && m.mockClear());
  Object.values(mockGenericTempCtx).forEach(m => typeof m === 'function' && m.mockClear && m.mockClear());
  createdCanvasCount = 0; global.alert.mockClear(); mockImageInstance = null;
  try { delete window.location; } catch (e) { /* ignore */ }
  window.location = locationMock; 
  locationMock.href = 'http://localhost/edit.html';
  locationMock.assign.mockClear(); locationMock.reload.mockClear();
  document.createElement = baseOriginalCreateElement; 
  createdCanvasCount = 0; 
  // Reset static MockImage properties
  MockImage._staticNextNaturalWidth = undefined;
  MockImage._staticNextNaturalHeight = undefined;
};

// --- Test Suites Start Here ---
describe('Edit Script Tests - Initial Setup', () => {
  beforeEach(() => { setupJSDOMAndHTML(); resetAllGlobalMocks(); });
  test('should have DOM elements available', () => { expect(document.getElementById('imageCanvas')).not.toBeNull(); });
  test('localStorage mock should work', () => { expect(localStorage.getItem('originalImageUrl')).toBe(mockOriginalImageUrl); });
  test('Image mock should work', (done) => { new Image().onload = () => { expect(mockImageInstance.complete).toBe(true); done(); }; mockImageInstance.src = "test.png"; });
});

describe('loadImagesFromStorage and initial setup', () => {
  beforeEach(() => { setupJSDOMAndHTML(); resetAllGlobalMocks(); });
  test('successful load with valid data', async () => {
    loadEditScript(); await Promise.resolve(); await Promise.resolve(); 
    expect(document.getElementById('imgWidth').value).toBe(String(100));
  });
  test('missing originalImageUrl should alert', () => {
    localStorageMock.setItem('originalImageUrl', null); loadEditScript();
    expect(global.alert).toHaveBeenCalledWith('Error: Original image data not found. Please upload an image first.');
  });
  test('invalid JSON in segmentationData should alert', () => {
    localStorageMock.setItem('segmentationData', 'this is not json'); loadEditScript();
    expect(global.alert).toHaveBeenCalledWith('Error: Could not parse segmentation data. Please try again.');
  });
   test('segmentationData with empty polygons array should alert', () => {
    localStorageMock.setItem('segmentationData', JSON.stringify({ polygons: [], width: 100, height: 100 })); loadEditScript();
    expect(global.alert).toHaveBeenCalledWith('Error: Invalid or empty segmentation data. Please try again.');
  });
});

describe('redrawCanvas functionality', () => {
  beforeEach(async () => {
    setupJSDOMAndHTML(); resetAllGlobalMocks(); 
    localStorageMock.setItem('originalImageUrl', mockOriginalImageUrl);
    localStorageMock.setItem('segmentationData', mockSegmentationData);
    loadEditScript(); await Promise.resolve(); await Promise.resolve(); await Promise.resolve();
    mockCtx.fillRect.mockClear(); mockCtx.drawImage.mockClear();
  });
  test('initial draw should have occurred', () => { expect(document.getElementById('imageCanvas').width).toBe(100); });
});

// D. Test Cases for Download Button
describe('Download Functionality', () => {
  let downloadButton, formatPngRadio, formatJpegRadio, formatWebpRadio;
  let currentMockAnchor; 
  let appendChildSpy, removeChildSpy;
  let originalDocumentCreateElement_DL; 
  let originalToDataURL_DL_Descriptor; 

  beforeEach(() => { 
    setupJSDOMAndHTML(); 
    resetAllGlobalMocks();
    
    originalDocumentCreateElement_DL = document.createElement; 
    document.createElement = jest.fn((tagName) => {
      const lowerTagName = tagName.toLowerCase();
      document.createElement.isDownloadMockActive = true;
      if (lowerTagName === 'a') {
        currentMockAnchor = originalDocumentCreateElement_DL.call(document, 'a');
        jest.spyOn(currentMockAnchor, 'click').mockImplementation(() => {});
        return currentMockAnchor;
      }
      return originalDocumentCreateElement_DL.call(document, lowerTagName);
    });
    
    appendChildSpy = jest.spyOn(document.body, 'appendChild').mockImplementation(() => {}); 
    removeChildSpy = jest.spyOn(document.body, 'removeChild').mockImplementation(() => {});

    originalToDataURL_DL_Descriptor = Object.getOwnPropertyDescriptor(HTMLCanvasElement.prototype, 'toDataURL');
    Object.defineProperty(HTMLCanvasElement.prototype, 'toDataURL', {
      value: mockCtx.toDataURL, writable: true, configurable: true
    });

    loadEditScript(); 

    downloadButton = document.getElementById('downloadButton');
    formatPngRadio = document.getElementById('formatPng');
    formatJpegRadio = document.getElementById('formatJpeg');
    formatWebpRadio = document.getElementById('formatWebp');
    
    mockCtx.toDataURL.mockClear(); 
    if (currentMockAnchor && currentMockAnchor.click && currentMockAnchor.click.mockClear) {
        currentMockAnchor.click.mockClear();
    }
    appendChildSpy.mockClear();
    removeChildSpy.mockClear();
  });

  afterEach(() => {
    document.createElement = baseOriginalCreateElement; 
    delete document.createElement.isDownloadMockActive;
    if (originalToDataURL_DL_Descriptor) { 
        Object.defineProperty(HTMLCanvasElement.prototype, 'toDataURL', originalToDataURL_DL_Descriptor);
    } else { 
        delete HTMLCanvasElement.prototype.toDataURL;
    }
    
    const idsToRemove = ['downloadButton', 'formatPng', 'formatJpeg', 'formatWebp', 'imageCanvas', 'imgWidth', 'imgHeight', 'reuploadButton'];
    idsToRemove.forEach(id => {
      const el = document.getElementById(id);
      if (el && el.parentNode) el.parentNode.removeChild(el);
    });
  });

  test('should download as PNG', () => {
    formatPngRadio.checked = true;
    mockCtx.toDataURL.mockReturnValue('data:image/png;base64,mockPngData');
    downloadButton.click();
    expect(mockCtx.toDataURL).toHaveBeenCalledWith('image/png');
    expect(currentMockAnchor.href).toBe('data:image/png;base64,mockPngData');
    expect(currentMockAnchor.download).toBe('edited_photo.png');
    expect(appendChildSpy).toHaveBeenCalledWith(currentMockAnchor);
    expect(currentMockAnchor.click).toHaveBeenCalledTimes(1);
    expect(removeChildSpy).toHaveBeenCalledWith(currentMockAnchor);
  });

  test('should download as JPEG', () => {
    formatJpegRadio.checked = true;
    mockCtx.toDataURL.mockReturnValue('data:image/jpeg;base64,mockJpegData');
    downloadButton.click();
    expect(mockCtx.toDataURL).toHaveBeenCalledWith('image/jpeg', 0.9);
    expect(currentMockAnchor.href).toBe('data:image/jpeg;base64,mockJpegData');
    expect(currentMockAnchor.download).toBe('edited_photo.jpg');
    expect(appendChildSpy).toHaveBeenCalledWith(currentMockAnchor);
    expect(currentMockAnchor.click).toHaveBeenCalledTimes(1);
    expect(removeChildSpy).toHaveBeenCalledWith(currentMockAnchor);
  });

  test('should download as WebP', () => {
    formatWebpRadio.checked = true;
    mockCtx.toDataURL.mockReturnValue('data:image/webp;base64,mockWebpData');
    downloadButton.click();
    expect(mockCtx.toDataURL).toHaveBeenCalledWith('image/webp', 0.8);
    expect(currentMockAnchor.href).toBe('data:image/webp;base64,mockWebpData');
    expect(currentMockAnchor.download).toBe('edited_photo.webp');
    expect(appendChildSpy).toHaveBeenCalledWith(currentMockAnchor);
    expect(currentMockAnchor.click).toHaveBeenCalledTimes(1);
    expect(removeChildSpy).toHaveBeenCalledWith(currentMockAnchor);
  });
});


// E. Test Cases for Re-upload Button
let lastMockFileReaderInstance_RU; 

class MockFileReader_RU {
  static _shouldError = false;
  static _mockResult = null;

  constructor() {
    this.onload = null; this.onerror = null; this.result = null;
    // Apply static config to this instance properties for readAsDataURL to use
    this.instanceShouldError = MockFileReader_RU._shouldError;
    this.instanceMockResult = MockFileReader_RU._mockResult;
    lastMockFileReaderInstance_RU = this; 
  }
  readAsDataURL = jest.fn(file => {
    if (this.instanceShouldError) {
      if (typeof this.onerror === 'function') Promise.resolve().then(() => this.onerror(new Error('Mock FileReader Error')));
    } else {
      if (typeof this.onload === 'function') {
        this.result = this.instanceMockResult || `data:${file.type};base64,mockreaddata`;
        Promise.resolve().then(() => this.onload({ target: { result: this.result } }));
      }
    }
  });
}

let originalFileReader_RU_Global_File; 
let originalCreateElement_RU_Global_File; 

describe('Re-upload Functionality', () => {
  let reuploadButton;
  let suiteCapturedFileInput; 
  
  beforeEach(async () => {
    setupJSDOMAndHTML();
    resetAllGlobalMocks(); 
    
    originalFileReader_RU_Global_File = window.FileReader;
    window.FileReader = MockFileReader_RU;
    originalCreateElement_RU_Global_File = document.createElement; 

    suiteCapturedFileInput = null; 
    document.createElement = jest.fn((tagName) => {
      const lowerTagName = tagName.toLowerCase();
      document.createElement.isReuploadMockActive = true; 
      if (lowerTagName === 'input' && !suiteCapturedFileInput) { 
        suiteCapturedFileInput = originalCreateElement_RU_Global_File.call(document, tagName);
        return suiteCapturedFileInput;
      }
      return originalCreateElement_RU_Global_File.call(document, lowerTagName);
    });
    
    loadEditScript(); 
    reuploadButton = document.getElementById('reuploadButton');

    MockFileReader_RU._shouldError = false; 
    MockFileReader_RU._mockResult = null;
    lastMockFileReaderInstance_RU = null; 

    localStorageMock.setItem.mockClear(); mockCtx.fillRect.mockClear(); 
    mockCtx.drawImage.mockClear(); global.alert.mockClear();
    if (mockImageInstance) {
        mockImageInstance.src = ''; mockImageInstance.onload = () => {};
         // Don't use _setMockDimensions on the global mockImageInstance for re-upload,
         // use static properties on MockImage class instead.
    }
    // Reset static MockImage properties for dimension control
    MockImage._staticNextNaturalWidth = undefined;
    MockImage._staticNextNaturalHeight = undefined;

    await Promise.resolve(); await Promise.resolve();
  });

  afterEach(() => {
    window.FileReader = originalFileReader_RU_Global_File; 
    document.createElement = baseOriginalCreateElement; 
    delete document.createElement.isReuploadMockActive;
    suiteCapturedFileInput = null; 
  });

  test('reuploadButton click should trigger click on a file input', () => {
    let inputClickedByEditJS = suiteCapturedFileInput;

    if (!inputClickedByEditJS) { 
      const localOriginalCreateElement = document.createElement; 
      document.createElement = jest.fn(tagName => { 
        if (tagName.toLowerCase() === 'input') {
          inputClickedByEditJS = localOriginalCreateElement.call(document, tagName);
          inputClickedByEditJS.type = 'file'; 
          jest.spyOn(inputClickedByEditJS, 'click').mockImplementation(() => {});
          return inputClickedByEditJS;
        }
        return localOriginalCreateElement.call(document, tagName);
      });
    } else { 
        jest.spyOn(inputClickedByEditJS, 'click').mockImplementation(() => {});
    }
    
    reuploadButton.click(); 
    
    expect(inputClickedByEditJS).toBeDefined();
    expect(inputClickedByEditJS.click).toHaveBeenCalledTimes(1);

    if(document.createElement.mockRestore) document.createElement.mockRestore();
    else document.createElement = originalCreateElement_RU_Global_File; 
  });

  test('successful file re-upload should update image and localStorage', async () => {
    let testFileInput = suiteCapturedFileInput;
    if (!testFileInput) {
        const currentCreateElement = document.createElement; // Might be already the suite's mock or base original
        document.createElement = jest.fn((tagName) => { // Test-specific local mock
            if (tagName.toLowerCase() === 'input') {
                testFileInput = originalCreateElement_RU_Global_File.call(document, tagName);
                testFileInput.type = 'file';
                if(!testFileInput.parentElement) document.body.appendChild(testFileInput);
                return testFileInput;
            }
            return currentCreateElement.call(document, tagName); // Fallback to what was active
        });
        reuploadButton.click(); 
        document.createElement = originalCreateElement_RU_Global_File; // Restore after this specific path
    }
    if (!testFileInput) throw new Error('File input could not be obtained for success test.');
    if (!testFileInput.parentElement) document.body.appendChild(testFileInput);
    
    const mockNewImageData = 'data:image/jpeg;base64,newMockJpegDataForReupload';
    MockFileReader_RU._mockResult = mockNewImageData; 
    MockImage._staticNextNaturalWidth = 150; // Set static dimension for next MockImage instance
    MockImage._staticNextNaturalHeight = 160;
        
    const mockFile = { name: 'new_image.jpeg', type: 'image/jpeg', size: 12345 };
    Object.defineProperty(testFileInput, 'files', { value: [mockFile], writable: true });
    testFileInput.dispatchEvent(new Event('change', { bubbles: true }));

    await Promise.resolve(); await Promise.resolve(); await Promise.resolve(); 

    expect(lastMockFileReaderInstance_RU.readAsDataURL).toHaveBeenCalledWith(mockFile);
    expect(localStorage.setItem).toHaveBeenCalledWith('originalImageUrl', mockNewImageData);
    expect(document.getElementById('imgWidth').value).toBe("150");
    expect(document.getElementById('imgHeight').value).toBe("160");
    expect(mockCtx.drawImage).toHaveBeenCalled(); 
    expect(testFileInput.value).toBe(''); 
  });

  test('file re-upload with FileReader error should show alert', async () => {
    let testFileInput_Error = suiteCapturedFileInput;
     if (!testFileInput_Error) {
        const currentCreateElement = document.createElement;
        document.createElement = jest.fn(tagName => {
            if (tagName.toLowerCase() === 'input') {
                testFileInput_Error = originalCreateElement_RU_Global_File.call(document, tagName);
                testFileInput_Error.type = 'file';
                 if(!testFileInput_Error.parentElement) document.body.appendChild(testFileInput_Error);
                return testFileInput_Error;
            }
            return currentCreateElement.call(document, tagName);
        });
        reuploadButton.click();
        document.createElement = originalCreateElement_RU_Global_File;
    }
    if (!testFileInput_Error) throw new Error('File input could not be obtained for error test.');
    if (!testFileInput_Error.parentElement) document.body.appendChild(testFileInput_Error);

    MockFileReader_RU._shouldError = true; 
    const mockFile = { name: 'error_image.png', type: 'image/png' };
    Object.defineProperty(testFileInput_Error, 'files', { value: [mockFile], writable: true });
    testFileInput_Error.dispatchEvent(new Event('change', { bubbles: true }));
    
    await Promise.resolve(); await Promise.resolve(); 
    expect(global.alert).toHaveBeenCalledWith('Error reading the re-uploaded file.');
  });
});
