// script.js

// Add this import at the top of the file
import { removeBackground } from '@imgly/background-removal'; // Uses import map

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

            // Convert the resulting Blob to a Data URL to store in localStorage
            const foregroundImageDataUrl = await new Promise((resolve, reject) => {
                const foregroundReader = new FileReader();
                foregroundReader.onloadend = () => resolve(foregroundReader.result);
                foregroundReader.onerror = reject;
                foregroundReader.readAsDataURL(blob);
            });

            localStorage.setItem('foregroundImageUrl', foregroundImageDataUrl);
            console.log('Foreground image processed and stored in localStorage:', foregroundImageDataUrl.substring(0, 50) + '...');
            window.location.href = 'edit.html';
            // --- End: New background removal logic ---

        } catch (error) {
            console.error("Error during client-side background removal:", error);
            alert("Error removing background from image. Check console for details. Error: " + error.message);
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
