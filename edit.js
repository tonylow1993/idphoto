// edit.js
import { removeBackground } from '@imgly/background-removal';

const DB_NAME = "ImageEditorDB";
const STORE_NAME = "processedImages";
const DB_VERSION = 1;

function openImageDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = (event) => { resolve(event.target.result); };
    request.onerror = (event) => {
      console.error("IndexedDB error:", event.target.error);
      reject("Error opening IndexedDB: " + event.target.error);
    };
  });
}

function getImageFromDB(db, key) {
  return new Promise((resolve, reject) => {
    if (!db) { reject("DB not initialized"); return; }
    const transaction = db.transaction([STORE_NAME], "readonly");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(key);
    request.onsuccess = (event) => { resolve(event.target.result); };
    request.onerror = (event) => {
      console.error("Error getting image from IndexedDB:", event.target.error);
      reject("Error getting image: " + event.target.error);
    };
  });
}

document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('imageCanvas');
    const ctx = canvas.getContext('2d');
    const imgWidthInput = document.getElementById('imgWidth');
    const imgHeightInput = document.getElementById('imgHeight');
    const downloadButton = document.getElementById('downloadButton');
    const bgColorRadios = document.querySelectorAll('input[name="bgColor"]');
    const formatRadios = document.querySelectorAll('input[name="downloadFormat"]');
    const reuploadButton = document.getElementById('reuploadButton');
    const generateButton = document.getElementById('generateButton');
    const editLoadingIndicator = document.getElementById('edit-loading-indicator');
    const editLoadingText = document.getElementById('edit-loading-text');
    const editLoadingProgressBar = document.getElementById('edit-loading-bar-progress');

    const reuploadFileInput = document.createElement('input');
    reuploadFileInput.type = 'file';
    reuploadFileInput.accept = 'image/*';
    reuploadFileInput.style.display = 'none';
    document.body.appendChild(reuploadFileInput);

    let originalImage = null; 
    let originalImageLoaded = false;
    let foregroundImage = null; // To store the result of background removal

    // No longer need originalImageDataUrl or foregroundImageDataUrl globally for image loading logic
    // as original image comes from IndexedDB as Blob, and foreground is generated on this page.

    function loadImagesFromStorage() {
        // Original image URL from localStorage is still needed for cases where IndexedDB might fail
        // or as a quick check, but primary loading is from IndexedDB.
        const originalImageUrlFromStorage = localStorage.getItem('originalImageUrl');
        if (!originalImageUrlFromStorage) {
            alert('Error: Original image URL not found in local storage. Please upload an image first.');
            window.location.href = 'index.html';
            return false; 
        }

        function checkLoadCompletion() {
            // Only waiting for original image now. Foreground is loaded/generated later.
            if (originalImageLoaded) {
                console.log('Original image loaded.');
                if (originalImage) { 
                    imgWidthInput.value = originalImage.naturalWidth;
                    imgHeightInput.value = originalImage.naturalHeight;
                }
                redrawCanvas(); // Initial draw with original image
            }
        }

        // Load original image from IndexedDB
        openImageDB().then(db => {
          return getImageFromDB(db, "originalImageFile"); // Key changed here
        }).then(originalImageBlob => {
          if (originalImageBlob) {
            console.log("Original image blob retrieved from IndexedDB.");
            originalImage = new Image(); 
            originalImage.onload = () => {
              originalImageLoaded = true; // Flag updated
              checkLoadCompletion();
            };
            originalImage.onerror = () => {
                alert("Error loading original image from Blob. Please try re-uploading.");
                console.error("Error event for originalImage.src:", originalImage.src);
                window.location.href = 'index.html'; 
            };
            originalImage.src = URL.createObjectURL(originalImageBlob);
          } else {
            // Fallback or error if not found in IndexedDB - could try localStorage originalImageUrl if that's still desired
            console.warn("Original image blob not found in IndexedDB. Trying localStorage URL.");
            if (originalImageUrlFromStorage) {
                originalImage = new Image();
                originalImage.onload = () => {
                    originalImageLoaded = true;
                    checkLoadCompletion();
                };
                originalImage.onerror = () => {
                    alert('Error loading original image from localStorage fallback. Please try re-uploading.');
                    window.location.href = 'index.html';
                };
                originalImage.src = originalImageUrlFromStorage;
            } else {
                alert("Error: Original image data not found in DB or localStorage. Please upload image again.");
                window.location.href = 'index.html';
            }
          }
        }).catch(error => {
          console.error("Error loading original image from IndexedDB:", error);
          alert("Error loading original image from DB. Please try again.");
          window.location.href = 'index.html';
        });
        
        return true; // Indicates loading process has started
    }

    function getSelectedBgColor() {
        for (const radio of bgColorRadios) {
            if (radio.checked) {
                return radio.value;
            }
        }
        return '#ffffff';
    }

    function getSelectedFormat() {
        for (const radio of formatRadios) {
            if (radio.checked) {
                return radio.value;
            }
        }
        return 'image/png';
    }

    function redrawCanvas() {
        if (!originalImage || !originalImage.complete) {
            console.warn('Original image not ready. Aborting redrawCanvas.');
            return;
        }
    
        const targetWidth = parseInt(imgWidthInput.value) || originalImage.naturalWidth;
        const targetHeight = parseInt(imgHeightInput.value) || originalImage.naturalHeight;
    
        canvas.width = targetWidth;
        canvas.height = targetHeight;
    
        if (foregroundImage && foregroundImage.complete) {
            // Logic for drawing foregroundImage on selected background
            const newBgColor = getSelectedBgColor();
            ctx.fillStyle = newBgColor;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
    
            const aspect = foregroundImage.naturalWidth / foregroundImage.naturalHeight;
            let drawWidth = targetWidth;
            let drawHeight = targetHeight;
            if (targetWidth / targetHeight > aspect) {
                drawWidth = targetHeight * aspect;
            } else {
                drawHeight = targetWidth / aspect;
            }
            const x = (targetWidth - drawWidth) / 2;
            const y = (targetHeight - drawHeight) / 2;
            ctx.drawImage(foregroundImage, x, y, drawWidth, drawHeight);
            console.log('Canvas redrawn with foreground image.');
        } else {
            // Logic for drawing originalImage with a default background
            ctx.fillStyle = '#e5e7eb'; // Default neutral background (same as canvas container)
            ctx.fillRect(0, 0, canvas.width, canvas.height);
    
            const aspect = originalImage.naturalWidth / originalImage.naturalHeight;
            let drawWidth = targetWidth;
            let drawHeight = targetHeight;
            if (targetWidth / targetHeight > aspect) { // Canvas is wider
                drawWidth = targetHeight * aspect;
            } else { // Canvas is taller or same aspect
                drawHeight = targetWidth / aspect;
            }
            const x = (targetWidth - drawWidth) / 2;
            const y = (targetHeight - drawHeight) / 2;
            ctx.drawImage(originalImage, x, y, drawWidth, drawHeight);
            console.log('Canvas redrawn with original image.');
        }
    }

    // Event Listeners (mostly unchanged)
    bgColorRadios.forEach(radio => {
        radio.addEventListener('change', redrawCanvas);
    });

    imgWidthInput.addEventListener('blur', redrawCanvas);
    imgHeightInput.addEventListener('blur', redrawCanvas);

    downloadButton.addEventListener('click', () => {
        const selectedMimeType = getSelectedFormat();
        let fileExtension = '.png';
        if (selectedMimeType === 'image/jpeg') {
            fileExtension = '.jpg';
        } else if (selectedMimeType === 'image/webp') {
            fileExtension = '.webp';
        }

        let dataUrl;
        if (selectedMimeType === 'image/jpeg') {
            // Create a temporary canvas, draw white background, then foreground
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = canvas.width;
            tempCanvas.height = canvas.height;
            const tempCtx = tempCanvas.getContext('2d');
            tempCtx.fillStyle = getSelectedBgColor(); // Or force white if JPEG transparency is an issue
            if (getSelectedBgColor() === 'transparent' && selectedMimeType === 'image/jpeg') {
                 tempCtx.fillStyle = '#FFFFFF'; // Force white for JPEG if bg is transparent
            } else {
                tempCtx.fillStyle = getSelectedBgColor();
            }
            tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
            tempCtx.drawImage(canvas, 0, 0); // Draw the current canvas content (which has fg on bg)
            dataUrl = tempCanvas.toDataURL(selectedMimeType, 0.9);
        } else { // PNG or WebP can handle transparency directly from the main canvas
            dataUrl = canvas.toDataURL(selectedMimeType, (selectedMimeType === 'image/webp' ? 0.8 : undefined));
        }
        
        const a = document.createElement('a');
        a.href = dataUrl;
        a.download = 'edited_photo' + fileExtension;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        console.log('Image download initiated for format:', selectedMimeType);
    });

    if (loadImagesFromStorage()) {
        console.log("Image loading initiated...");
    }

    if (reuploadButton) { 
        reuploadButton.addEventListener('click', () => {
            // When re-uploading, we should go back to index.html to re-process the image
            // because the background removal now happens in script.js
            localStorage.removeItem('foregroundImageUrl'); // Clear old foreground
            localStorage.removeItem('segmentationData'); // Clear any old segmentation data just in case
            window.location.href = 'index.html';
        });
    }

    // Remove the reuploadFileInput.addEventListener as re-upload now goes to index.html
    // reuploadFileInput.addEventListener('change', (event) => { ... });
    // The old logic for re-uploading directly on edit.html is no longer valid
    // as background removal (the new @imgly/background-removal) is in script.js (on index.html)

    if (generateButton) {
        generateButton.addEventListener('click', async () => {
            if (!originalImage || !originalImage.complete) {
                alert("Original image is not loaded yet. Please wait or try re-uploading.");
                return;
            }
        
            editLoadingIndicator.style.display = 'block';
            editLoadingText.textContent = 'Initializing...';
            editLoadingProgressBar.style.width = '0%';
            editLoadingProgressBar.textContent = '0%';
        
            try {
                // Revoke previous foregroundImage blob URL if it exists
                if (foregroundImage && foregroundImage.src && foregroundImage.src.startsWith('blob:')) {
                    console.log("Revoking previous foregroundImage Object URL:", foregroundImage.src);
                    URL.revokeObjectURL(foregroundImage.src);
                }
        
                const imageSourceForRemoval = originalImage.src; // Assumes originalImage.src is suitable
        
                const config = {
                    // publicPath: '/libs/@imgly/background-removal/dist/', // Uncomment if assets are not found
                    debug: true, // Set to false for production
                    progress: (key, current, total) => {
                        const percent = total > 0 ? Math.round((current / total) * 100) : 0;
                        editLoadingText.textContent = `Processing: ${key} (${percent}%)`;
                        editLoadingProgressBar.style.width = percent + '%';
                        editLoadingProgressBar.textContent = percent + '%';
                        if (current === total && key !== 'segmentation') { // segmentation is usually the last model asset
                             editLoadingText.textContent = `Segmenting image...`;
                        } else if (current === total && key === 'segmentation') {
                            editLoadingText.textContent = 'Finalizing...';
                        }
                    }
                };
                
                editLoadingText.textContent = 'Starting background removal process...';
                const processedBlob = await removeBackground(imageSourceForRemoval, config);
        
                editLoadingText.textContent = 'Image processed. Loading result...';
                editLoadingProgressBar.style.width = '100%';
                editLoadingProgressBar.textContent = '100%';
        
                const newFgImage = new Image();
                newFgImage.onload = () => {
                    foregroundImage = newFgImage; // Assign to global
                    editLoadingIndicator.style.display = 'none';
                    redrawCanvas(); // Redraw with the new foreground
                    console.log("New foreground image loaded and canvas redrawn.");
                };
                newFgImage.onerror = () => {
                    alert("Error loading processed image into image element.");
                    editLoadingIndicator.style.display = 'none';
                };
                newFgImage.src = URL.createObjectURL(processedBlob);
        
            } catch (error) {
                console.error("Error during background removal:", error);
                alert("Error removing background: " + (error.message || error));
                editLoadingIndicator.style.display = 'none';
            }
        });
    }

  window.addEventListener("beforeunload", () => {
    if (originalImage && originalImage.src && originalImage.src.startsWith("blob:")) {
      console.log("Revoking Object URL for originalImage:", originalImage.src);
      URL.revokeObjectURL(originalImage.src);
    }
    if (foregroundImage && foregroundImage.src && foregroundImage.src.startsWith("blob:")) {
      console.log("Revoking Object URL for foregroundImage:", foregroundImage.src);
      URL.revokeObjectURL(foregroundImage.src);
    }
  });
});
