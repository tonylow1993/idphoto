// script.js

// Add this import at the top of the file
import { removeBackground } from '@imgly/background-removal'; // Uses import map

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

    request.onsuccess = (event) => {
      resolve(event.target.result);
    };

    request.onerror = (event) => {
      console.error("IndexedDB error:", event.target.error);
      reject("Error opening IndexedDB: " + event.target.error);
    };
  });
}

function saveImageToDB(db, key, blob) {
  return new Promise((resolve, reject) => {
    if (!db) {
        reject("DB not initialized");
        return;
    }
    const transaction = db.transaction([STORE_NAME], "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(blob, key);

    request.onsuccess = () => {
      resolve();
    };

    request.onerror = (event) => {
      console.error("Error saving image to IndexedDB:", event.target.error);
      reject("Error saving image: " + event.target.error);
    };
  });
}

function getImageFromDB(db, key) {
  return new Promise((resolve, reject) => {
    if (!db) {
        reject("DB not initialized");
        return;
    }
    const transaction = db.transaction([STORE_NAME], "readonly");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(key);

    request.onsuccess = (event) => {
      resolve(event.target.result); // This will be the Blob or undefined
    };

    request.onerror = (event) => {
      console.error("Error getting image from IndexedDB:", event.target.error);
      reject("Error getting image: " + event.target.error);
    };
  });
}

document.addEventListener('DOMContentLoaded', () => {
  const loadingIndicator = document.getElementById('loading-indicator');
  const loadingText = document.getElementById('loading-text');
  const loadingProgressBar = document.getElementById('loading-bar-progress');

  const buttons = document.querySelectorAll('button');
  let uploadButton = null;
  buttons.forEach(button => {
    if (button.querySelector('span.truncate') && button.querySelector('span.truncate').textContent === 'Upload Photo') {
      uploadButton = button;
    }
  });

  if (uploadButton) {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    fileInput.style.display = 'none';
    document.body.appendChild(fileInput);

    uploadButton.addEventListener('click', () => {
      fileInput.click();
    });

    fileInput.addEventListener('change', (event) => {
      const file = event.target.files[0];
      if (file) {
        console.log('File selected:', file.name);
        processImage(file); // Pass the file object directly
      }
    });
  }

async function processImage(file) { // Changed to take file object
    if (loadingIndicator) loadingIndicator.style.display = 'block';
    if (loadingText) loadingText.textContent = 'Initializing...';
    if (loadingProgressBar) {
      loadingProgressBar.style.width = '0%';
      loadingProgressBar.textContent = '0%';
    }

    const reader = new FileReader();

    reader.onload = async (loadEvent) => {
        try {
            const originalImageUrl = loadEvent.target.result; // This is the Data URL
            localStorage.setItem('originalImageUrl', originalImageUrl);
            console.log('Original image loaded for preview and local storage:', originalImageUrl.substring(0, 50) + '...');

            // --- Start: New background removal logic ---
            console.log("Attempting client-side background removal...");
            // The library might prefer a File/Blob object directly, or a URL.
            // Let's try with originalImageUrl (Data URL) first as per documentation examples.
            // If this causes issues, we can try with the 'file' object directly if the library supports it,
            // or convert the Data URL to a Blob first.
            const blob = await removeBackground(originalImageUrl, {
                // publicPath: `${window.location.origin}/libs/@imgly/background-removal/dist/`, // Removed to test default CDN behavior
                debug: true, // Or false for production
                progress: (key, current, total) => {
                  console.log(`Loading asset: ${key} - ${current} / ${total}`);
                  if (loadingText) loadingText.textContent = `Loading asset: ${key}...`;
                  if (loadingProgressBar) {
                    const percent = total > 0 ? Math.round((current / total) * 100) : 0;
                    loadingProgressBar.style.width = percent + '%';
                    loadingProgressBar.textContent = percent + '%';
                  }
                  if (current === total) { // When a particular asset is done
                     if (loadingText) loadingText.textContent = `Processing image...`;
                     // Optional: Keep progress bar full or show indeterminate state for a moment
                     if (loadingProgressBar && total > 0) { // Ensure it shows 100% for this asset
                        loadingProgressBar.style.width = '100%';
                        loadingProgressBar.textContent = '100%';
                     }
                  }
                }
            });

            if (loadingText) loadingText.textContent = 'Finalizing...'; // After removeBackground completes
            if (loadingProgressBar) { // Show a near complete or indeterminate state
                loadingProgressBar.style.width = '99%';
                loadingProgressBar.textContent = '99%';
            }

            console.log("Foreground image blob received, attempting to save to IndexedDB...");
            const db = await openImageDB();
            await saveImageToDB(db, "foregroundImage", blob);
            console.log("Foreground image saved to IndexedDB successfully.");
            // originalImageUrl is still in localStorage, foregroundImage is in IndexedDB

            if (loadingText) loadingText.textContent = "Processing complete! Redirecting...";
            // Optional: Set progress to 100% explicitly here if not already
            if (loadingProgressBar) {
                loadingProgressBar.style.width = '100%';
                loadingProgressBar.textContent = '100%';
            }

            window.location.href = 'edit.html';
            // --- End: New background removal logic ---

        } catch (error) {
            console.error("Error during client-side background removal or DB operation:", error);
            alert("Error processing image or saving to DB. Details: " + (error.message || error));
        } finally {
            if (loadingIndicator) loadingIndicator.style.display = 'none';
        }
    };
    reader.onerror = () => {
        console.error('Error reading file as DataURL.');
        alert('Error reading file.');
        if (loadingIndicator) loadingIndicator.style.display = 'none'; // Also hide on reader error
    };
    reader.readAsDataURL(file); // Read the file to get originalImageUrl
}
});
