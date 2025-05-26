document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('imageCanvas');
    const ctx = canvas.getContext('2d');
    const bgColorInput = document.getElementById('bgColor');
    const imgWidthInput = document.getElementById('imgWidth');
    const imgHeightInput = document.getElementById('imgHeight');
    const applyButton = document.getElementById('applyButton');
    const downloadLink = document.getElementById('downloadLink');

    let originalImage = null;
    let maskImage = null;
    let originalImageDataUrl = null;
    let maskDataUrl = null;

    function loadImagesFromStorage() {
        originalImageDataUrl = localStorage.getItem('originalImageUrl');
        maskDataUrl = localStorage.getItem('maskDataUrl');

        if (!originalImageDataUrl || !maskDataUrl) {
            alert('Error: Image data not found. Please upload an image first.');
            window.location.href = 'index.html';
            return false;
        }

        let imagesLoaded = 0;
        const totalImages = 2;

        function onImageLoad() {
            imagesLoaded++;
            if (imagesLoaded === totalImages) {
                console.log('Original and mask images loaded into Image objects.');
                // Set initial dimensions in input fields from original image
                if (originalImage) {
                    imgWidthInput.value = originalImage.naturalWidth;
                    imgHeightInput.value = originalImage.naturalHeight;
                }
                applyUserEdits(); // Perform an initial render
            }
        }

        originalImage = new Image();
        originalImage.onload = onImageLoad;
        originalImage.onerror = () => { alert('Error loading original image.'); };
        originalImage.src = originalImageDataUrl;

        maskImage = new Image();
        maskImage.onload = onImageLoad;
        maskImage.onerror = () => { alert('Error loading mask image.'); };
        maskImage.src = maskDataUrl;
        
        return true;
    }

    function applyUserEdits() {
        if (!originalImage || !maskImage || !originalImage.complete || !maskImage.complete) {
            console.warn('Images not fully loaded yet. Aborting applyUserEdits.');
            return;
        }

        const newBgColor = bgColorInput.value || '#ffffff';
        const targetWidth = parseInt(imgWidthInput.value) || originalImage.naturalWidth;
        const targetHeight = parseInt(imgHeightInput.value) || originalImage.naturalHeight;

        // Set canvas dimensions
        canvas.width = targetWidth;
        canvas.height = targetHeight;

        // 1. Fill the entire canvas with the new background color
        ctx.fillStyle = newBgColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // 2. Create a temporary canvas for the original image and mask processing
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        tempCanvas.width = originalImage.naturalWidth;
        tempCanvas.height = originalImage.naturalHeight;

        // Draw original image onto temp canvas
        tempCtx.drawImage(originalImage, 0, 0);
        const originalImgData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);

        // Draw mask image onto another temporary canvas to get its pixel data
        // (ensuring mask is drawn at its natural dimensions to match original)
        const maskTempCanvas = document.createElement('canvas');
        const maskTempCtx = maskTempCanvas.getContext('2d');
        maskTempCanvas.width = maskImage.naturalWidth; // Use naturalWidth of the mask
        maskTempCanvas.height = maskImage.naturalHeight; // Use naturalHeight of the mask
        maskTempCtx.drawImage(maskImage, 0, 0, maskImage.naturalWidth, maskImage.naturalHeight);
        const maskImgData = maskTempCtx.getImageData(0, 0, maskTempCanvas.width, maskTempCanvas.height);

        // 3. Apply the mask to the original image data's alpha channel
        // Ensure dimensions match for pixel manipulation. If not, this step needs careful scaling.
        // For simplicity, this assumes the mask's dimensions correspond to the original image's dimensions.
        // If the mask was generated from the original image, they should.
        const len = originalImgData.data.length;
        for (let i = 0; i < len; i += 4) {
            // Assuming mask is grayscale, use red channel for alpha.
            // Mask: white (255) = opaque foreground, black (0) = transparent background.
            const maskValue = maskImgData.data[i]; // Red channel of the mask pixel
            originalImgData.data[i + 3] = maskValue; // Set alpha channel of original image
        }
        tempCtx.putImageData(originalImgData, 0, 0); // Put modified image data back to temp canvas

        // 4. Draw the masked and processed original image onto the main canvas,
        // scaled to fit targetWidth/targetHeight, maintaining aspect ratio and centered.

        const aspect = originalImage.naturalWidth / originalImage.naturalHeight;
        let drawWidth = targetWidth;
        let drawHeight = targetHeight;

        if (targetWidth / targetHeight > aspect) { // Canvas is wider than image
            drawWidth = targetHeight * aspect;
        } else { // Canvas is taller than image
            drawHeight = targetWidth / aspect;
        }

        const x = (targetWidth - drawWidth) / 2;
        const y = (targetHeight - drawHeight) / 2;

        ctx.drawImage(tempCanvas, x, y, drawWidth, drawHeight);

        // Make download link available
        const dataUrl = canvas.toDataURL('image/png');
        downloadLink.href = dataUrl;
        downloadLink.download = 'edited_photo.png';
        downloadLink.style.display = 'inline-block';
        console.log('Edits applied. Canvas updated.');
    }

    // Event Listeners
    applyButton.addEventListener('click', applyUserEdits);

    // Optional: Apply changes as inputs change (debounced or throttled for performance)
    // bgColorInput.addEventListener('input', applyUserEdits);
    // imgWidthInput.addEventListener('change', applyUserEdits); // 'change' fires after losing focus or Enter
    // imgHeightInput.addEventListener('change', applyUserEdits);


    // --- Initialization ---
    if (loadImagesFromStorage()) {
        // Images will be loaded, and applyUserEdits will be called by onImageLoad
        console.log("Image loading initiated...");
    }
});
