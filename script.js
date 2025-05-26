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


  // Placeholder for Azure ML Florence-2 API endpoint
  const FLORENCE_API_ENDPOINT = 'YOUR_AZURE_ML_FLORENCE_2_API_ENDPOINT_HERE';
  // Placeholder for API key if required
  const API_KEY = 'YOUR_API_KEY_HERE';

  function processImage(file) {
    const reader = new FileReader();
    reader.onload = async (e) => {
      const originalImageUrl = e.target.result;
      console.log('Original image loaded:', originalImageUrl.substring(0, 50) + '...');

      try {
        // Call Florence-2 API to get the alpha mask
        const alphaMaskBlob = await callFlorence2Api(originalImageUrl);
        console.log('Alpha mask received (simulated or actual API):', alphaMaskBlob);

        // Convert alphaMaskBlob to Data URL and redirect
        const maskReader = new FileReader();
        maskReader.onloadend = () => {
          const maskDataUrl = maskReader.result;
          localStorage.setItem('originalImageUrl', originalImageUrl);
          localStorage.setItem('maskDataUrl', maskDataUrl);
          console.log('Stored originalImageUrl and maskDataUrl in localStorage. Redirecting to edit.html...');
          window.location.href = 'edit.html';
        };
        maskReader.readAsDataURL(alphaMaskBlob);

        // Old logic (commented out):
        // const processedImageUrl = await applyMaskAndChangeBackground(originalImageUrl, alphaMaskBlob, 'blue');
        // console.log('Image with new background and resized:', processedImageUrl.substring(0, 50) + '...');
        // displayProcessedImage(processedImageUrl);

      } catch (error) {
        console.error('Error in image processing pipeline:', error);
        // Fallback to local simulation is no longer needed here as processing is moved
        // simulateLocalImageProcessing(originalImageUrl, 'blue', (processedImageUrl) => {
        //   console.log('Image processed locally (fallback):', processedImageUrl.substring(0, 50) + '...');
        //   displayProcessedImage(processedImageUrl);
        // });
      }
    };
    reader.readAsDataURL(file);
  }

  async function callFlorence2Api(imageUrl) {
    // This is a placeholder for the actual API call to get the alpha mask.
    // The API is expected to return binary data (e.g., a PNG or grayscale image)
    // representing the alpha mask.

    if (FLORENCE_API_ENDPOINT === 'YOUR_AZURE_ML_FLORENCE_2_API_ENDPOINT_HERE') {
      console.warn('Florence-2 API endpoint is a placeholder. Simulating alpha mask generation locally.');
      // Simulate an alpha mask (e.g., a black image with a white silhouette)
      return new Promise(resolve => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          canvas.width = img.width;
          canvas.height = img.height;

          // Create a simple circular mask for simulation
          ctx.fillStyle = 'black'; // Background is black (transparent)
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.fillStyle = 'white'; // Foreground is white (opaque)
          ctx.beginPath();
          ctx.arc(canvas.width / 2, canvas.height / 2, Math.min(canvas.width, canvas.height) / 3, 0, Math.PI * 2);
          ctx.fill();

          canvas.toBlob(blob => resolve(blob), 'image/png');
        };
        img.src = imageUrl; // Use original image dimensions for mask
      });
    }

    try {
      const response = await fetch(FLORENCE_API_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json', // Or 'image/jpeg', 'image/png' depending on API input
          // 'Authorization': `Bearer ${API_KEY}`,
        },
        body: JSON.stringify({ image: imageUrl }), // Send image as base64 string
      });

      if (!response.ok) {
        throw new Error(`API call failed with status: ${response.status}`);
      }

      // Assuming the API returns binary data (e.g., image/png for the mask)
      return await response.blob();

    } catch (error) {
      console.error('Error calling Florence-2 API:', error);
      throw error;
    }
  }

  // function applyMaskAndChangeBackground(originalImageUrl, alphaMaskBlob, newBackgroundColor) {
  //   return new Promise((resolve, reject) => {
  //     const originalImg = new Image();
  //     originalImg.onload = () => {
  //       const maskImg = new Image();
  //       maskImg.onload = () => {
  //         const canvas = document.createElement('canvas');
  //         const ctx = canvas.getContext('2d');
  //
  //         // Set ID photo standard size (e.g., 2x2 inches at 300 DPI = 600x600 pixels)
  //         const idPhotoWidth = 600;
  //         const idPhotoHeight = 600;
  //
  //         canvas.width = idPhotoWidth;
  //         canvas.height = idPhotoHeight;
  //
  //         // 1. Fill the entire canvas with the new background color
  //         ctx.fillStyle = newBackgroundColor;
  //         ctx.fillRect(0, 0, canvas.width, canvas.height);
  //
  //         // 2. Draw the original image onto a temporary canvas to apply the mask
  //         const tempCanvas = document.createElement('canvas');
  //         const tempCtx = tempCanvas.getContext('2d');
  //         tempCanvas.width = originalImg.width;
  //         tempCanvas.height = originalImg.height;
  //         tempCtx.drawImage(originalImg, 0, 0);
  //
  //         // Create an ImageData object from the mask image
  //         const maskCanvas = document.createElement('canvas');
  //         const maskCtx = maskCanvas.getContext('2d');
  //         maskCanvas.width = maskImg.width;
  //         maskCanvas.height = maskImg.height;
  //         maskCtx.drawImage(maskImg, 0, 0);
  //         const maskData = maskCtx.getImageData(0, 0, maskCanvas.width, maskCanvas.height);
  //
  //         // Apply the mask to the original image data
  //         const originalImageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
  //         for (let i = 0; i < originalImageData.data.length; i += 4) {
  //           // Assuming mask is grayscale, use red channel for alpha
  //           // The mask should be white for foreground, black for background
  //           const maskAlpha = maskData.data[i]; // Red channel of mask
  //           originalImageData.data[i + 3] = maskAlpha; // Set alpha of original image
  //         }
  //         tempCtx.putImageData(originalImageData, 0, 0);
  //
  //         // 3. Draw the masked original image onto the main canvas, scaled and centered
  //         const aspectRatio = originalImg.width / originalImg.height;
  //         let drawWidth = idPhotoWidth;
  //         let drawHeight = idPhotoHeight;
  //
  //         if (originalImg.width > originalImg.height) {
  //           drawHeight = idPhotoWidth / aspectRatio;
  //         } else {
  //           drawWidth = idPhotoHeight * aspectRatio;
  //         }
  //
  //         const x = (idPhotoWidth - drawWidth) / 2;
  //         const y = (idPhotoHeight - drawHeight) / 2;
  //
  //         ctx.drawImage(tempCanvas, x, y, drawWidth, drawHeight);
  //
  //         resolve(canvas.toDataURL('image/png'));
  //       };
  //       maskImg.onerror = reject;
  //       maskImg.src = URL.createObjectURL(alphaMaskBlob);
  //     };
  //     originalImg.onerror = reject;
  //     originalImg.src = originalImageUrl;
  //   });
  // }

  // function simulateLocalImageProcessing(imageUrl, newBackgroundColor, callback) {
  //   // This function remains for local simulation/fallback
  //   const img = new Image();
  //   img.onload = () => {
  //     const canvas = document.createElement('canvas');
  //     const ctx = canvas.getContext('2d');
  //
  //     // Set ID photo standard size (e.g., 2x2 inches at 300 DPI = 600x600 pixels)
  //     const idPhotoWidth = 600;
  //     const idPhotoHeight = 600;
  //
  //     canvas.width = idPhotoWidth;
  //     canvas.height = idPhotoHeight;
  //
  //     // Fill background with new color
  //     ctx.fillStyle = newBackgroundColor;
  //     ctx.fillRect(0, 0, canvas.width, canvas.height);
  //
  //     // Draw the image, centered and scaled to fit within the ID photo dimensions
  //     const aspectRatio = img.width / img.height;
  //     let drawWidth = idPhotoWidth;
  //     let drawHeight = idPhotoHeight;
  //
  //     if (img.width > img.height) {
  //       drawHeight = idPhotoWidth / aspectRatio;
  //     } else {
  //       drawWidth = idPhotoHeight * aspectRatio;
  //     }
  //
  //     const x = (idPhotoWidth - drawWidth) / 2;
  //     const y = (idPhotoHeight - drawHeight) / 2;
  //
  //     ctx.drawImage(img, x, y, drawWidth, drawHeight);
  //
  //     callback(canvas.toDataURL('image/png'));
  //   };
  //   img.src = imageUrl;
  // }

  // function displayProcessedImage(imageUrl) {
  //   const existingImageContainer = document.getElementById('processed-image-container');
  //   if (existingImageContainer) {
  //     existingImageContainer.remove();
  //   }
  //
  //   const imageContainer = document.createElement('div');
  //   imageContainer.id = 'processed-image-container';
  //   imageContainer.style.marginTop = '20px';
  //   imageContainer.style.textAlign = 'center';
  //
  //   const processedImage = document.createElement('img');
  //   processedImage.src = imageUrl;
  //   processedImage.alt = 'Processed ID Photo';
  //   processedImage.style.maxWidth = '100%';
  //   processedImage.style.height = 'auto';
  //   processedImage.style.border = '1px solid #ccc';
  //
  //   const downloadLink = document.createElement('a');
  //   downloadLink.href = imageUrl;
  //   downloadLink.download = 'id_photo.png';
  //   downloadLink.textContent = 'Download Processed Photo';
  //   downloadLink.style.display = 'block';
  //   downloadLink.style.marginTop = '10px';
  //   downloadLink.style.padding = '10px 20px';
  //   downloadLink.style.backgroundColor = '#0c7ff2';
  //   downloadLink.style.color = 'white';
  //   downloadLink.style.textDecoration = 'none';
  //   downloadLink.style.borderRadius = '5px';
  //   downloadLink.style.maxWidth = '200px';
  //   downloadLink.style.margin = '10px auto';
  //
  //   imageContainer.appendChild(processedImage);
  //   imageContainer.appendChild(downloadLink);
  //
  //   // Find a suitable place to insert the processed image, e.g., after the main content div
  //   const mainContentContainer = document.querySelector('.layout-content-container');
  //   if (mainContentContainer) {
  //     mainContentContainer.appendChild(imageContainer);
  //   } else {
  //     document.body.appendChild(imageContainer);
  //   }
  // }
});
