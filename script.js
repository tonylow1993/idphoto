// script.js

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

            // Convert Data URL to Blob
            const response = await fetch(originalImageUrl);
            const originalImageBlob = await response.blob();

            console.log("Original image blob created, attempting to save to IndexedDB...");
            const db = await openImageDB();
            await saveImageToDB(db, "originalImageFile", originalImageBlob);
            console.log("Original image saved to IndexedDB successfully as originalImageFile.");

            // originalImageUrl is in localStorage, originalImageFile is in IndexedDB

            if (loadingText) loadingText.textContent = "Processing complete! Redirecting...";
            // Optional: Set progress to 100% explicitly here if not already
            if (loadingProgressBar) {
                loadingProgressBar.style.width = '100%';
                loadingProgressBar.textContent = '100%';
            }

            window.location.href = 'edit.html';

        } catch (error) {
            console.error("Error processing image or saving to DB:", error);
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

// Add this to the end of script.js for testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    openImageDB,
    saveImageToDB,
    getImageFromDB,
    // processImage // if we want to test this too, though it's more complex
  };
}
