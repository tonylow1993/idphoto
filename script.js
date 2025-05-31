// script.js

// Add this import at the top of the file
import removeBackground from '/libs/@imgly/background-removal/index.mjs';

document.addEventListener('DOMContentLoaded', () => {
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
    const reader = new FileReader();

    reader.onload = async (loadEvent) => {
        const originalImageUrl = loadEvent.target.result; // This is the Data URL
        localStorage.setItem('originalImageUrl', originalImageUrl);
        console.log('Original image loaded for preview and local storage:', originalImageUrl.substring(0, 50) + '...');

        // --- Start: New background removal logic ---
        try {
            console.log("Attempting client-side background removal...");
            // The library might prefer a File/Blob object directly, or a URL.
            // Let's try with originalImageUrl (Data URL) first as per documentation examples.
            // If this causes issues, we can try with the 'file' object directly if the library supports it,
            // or convert the Data URL to a Blob first.
            const blob = await removeBackground(originalImageUrl, {
                publicPath: '/libs/@imgly/background-removal/', // Serve assets from the same path
                debug: true,
                progress: (key, current, total) => {
                    console.log(`Downloading ${key}: ${current} of ${total}`);
                }
            });

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

        } catch (error) {
            console.error("Error during client-side background removal:", error);
            alert("Error removing background from image. Check console for details. Error: " + error.message);
        }
        // --- End: New background removal logic ---
    };
    reader.onerror = () => {
        console.error('Error reading file as DataURL.');
        alert('Error reading file.');
    };
    reader.readAsDataURL(file); // Read the file to get originalImageUrl
}
});
