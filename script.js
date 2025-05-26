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
        processImage(file);
      }
    });
  }

  function processImage(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const imageUrl = e.target.result;
      console.log('Image loaded:', imageUrl.substring(0, 50) + '...'); // Log a part of the base64 string

      // Simulate background removal and color change
      simulateImageProcessing(imageUrl, 'blue', (processedImageUrl) => {
        console.log('Image processed (simulated):', processedImageUrl.substring(0, 50) + '...');
        displayProcessedImage(processedImageUrl);
      });
    };
    reader.readAsDataURL(file);
  }

  function simulateImageProcessing(imageUrl, newBackgroundColor, callback) {
    // In a real application, this would involve sending the image to a server-side API
    // for background removal and resizing. For this simulation, we'll just
    // create a new canvas and draw the image with a colored background.

    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      // Set ID photo standard size (e.g., 2x2 inches at 300 DPI = 600x600 pixels)
      const idPhotoWidth = 600;
      const idPhotoHeight = 600;

      canvas.width = idPhotoWidth;
      canvas.height = idPhotoHeight;

      // Fill background with new color
      ctx.fillStyle = newBackgroundColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw the image, centered and scaled to fit within the ID photo dimensions
      const aspectRatio = img.width / img.height;
      let drawWidth = idPhotoWidth;
      let drawHeight = idPhotoHeight;

      if (img.width > img.height) {
        drawHeight = idPhotoWidth / aspectRatio;
      } else {
        drawWidth = idPhotoHeight * aspectRatio;
      }

      const x = (idPhotoWidth - drawWidth) / 2;
      const y = (idPhotoHeight - drawHeight) / 2;

      ctx.drawImage(img, x, y, drawWidth, drawHeight);

      callback(canvas.toDataURL('image/png'));
    };
    img.src = imageUrl;
  }

  function displayProcessedImage(imageUrl) {
    const existingImageContainer = document.getElementById('processed-image-container');
    if (existingImageContainer) {
      existingImageContainer.remove();
    }

    const imageContainer = document.createElement('div');
    imageContainer.id = 'processed-image-container';
    imageContainer.style.marginTop = '20px';
    imageContainer.style.textAlign = 'center';

    const processedImage = document.createElement('img');
    processedImage.src = imageUrl;
    processedImage.alt = 'Processed ID Photo';
    processedImage.style.maxWidth = '100%';
    processedImage.style.height = 'auto';
    processedImage.style.border = '1px solid #ccc';

    const downloadLink = document.createElement('a');
    downloadLink.href = imageUrl;
    downloadLink.download = 'id_photo.png';
    downloadLink.textContent = 'Download Processed Photo';
    downloadLink.style.display = 'block';
    downloadLink.style.marginTop = '10px';
    downloadLink.style.padding = '10px 20px';
    downloadLink.style.backgroundColor = '#0c7ff2';
    downloadLink.style.color = 'white';
    downloadLink.style.textDecoration = 'none';
    downloadLink.style.borderRadius = '5px';
    downloadLink.style.maxWidth = '200px';
    downloadLink.style.margin = '10px auto';

    imageContainer.appendChild(processedImage);
    imageContainer.appendChild(downloadLink);

    // Find a suitable place to insert the processed image, e.g., after the main content div
    const mainContentContainer = document.querySelector('.layout-content-container');
    if (mainContentContainer) {
      mainContentContainer.appendChild(imageContainer);
    } else {
      document.body.appendChild(imageContainer);
    }
  }
});
