document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('imageCanvas');
    const ctx = canvas.getContext('2d');
    const imgWidthInput = document.getElementById('imgWidth');
    const imgHeightInput = document.getElementById('imgHeight');
    const downloadButton = document.getElementById('downloadButton');
    const bgColorRadios = document.querySelectorAll('input[name="bgColor"]');
    const formatRadios = document.querySelectorAll('input[name="downloadFormat"]');

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
                redrawCanvas(); // Perform an initial render
            }
        }

        originalImage = new Image();
        originalImage.onload = onImageLoad;
        originalImage.onerror = () => { alert('Error loading original image.'); };
        originalImage.src = originalImageDataUrl;

        maskImage = new Image();
        maskImage.onload = onImageLoad;
        maskImage.onerror = () => { alert('Error loading mask image.'); };
        maskImage.crossOrigin = "Anonymous"; // Add this line
        maskImage.src = maskDataUrl;
        
        return true;
    }

    function getSelectedBgColor() {
        for (const radio of bgColorRadios) {
            if (radio.checked) {
                return radio.value;
            }
        }
        return '#ffffff'; // Default to white if none selected (should not happen with 'checked' attribute)
    }

    function getSelectedFormat() {
        for (const radio of formatRadios) {
            if (radio.checked) {
                return radio.value;
            }
        }
        return 'image/png'; // Default to PNG
    }

    function redrawCanvas() {
        if (!originalImage || !maskImage || !originalImage.complete || !maskImage.complete) {
            console.warn('Images not fully loaded yet. Aborting redrawCanvas.');
            return;
        }

        const newBgColor = getSelectedBgColor();
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
        
        // Apply the mask to the original image data's alpha channel with thresholding
        const len = originalImgData.data.length;
        const threshold = 128; // Mid-point threshold for grayscale mask
                               // Assumes mask values < threshold are background, >= threshold are foreground.

        for (let i = 0; i < len; i += 4) {
            const maskValue = maskImgData.data[i]; // Red channel of the mask pixel (0-255)

            if (maskValue < threshold) {
                originalImgData.data[i + 3] = 0;   // Fully transparent (background)
            } else {
                originalImgData.data[i + 3] = 255; // Fully opaque (foreground)
            }
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
        console.log('Canvas redrawn.');
    }

    // Event Listeners
    bgColorRadios.forEach(radio => {
        radio.addEventListener('change', redrawCanvas);
    });

    imgWidthInput.addEventListener('blur', redrawCanvas);
    imgHeightInput.addEventListener('blur', redrawCanvas);

    downloadButton.addEventListener('click', () => {
        // redrawCanvas(); // Optional: ensure canvas is up-to-date, but other events should handle this.

        const selectedMimeType = getSelectedFormat();
        let fileExtension = '.png';
        if (selectedMimeType === 'image/jpeg') {
            fileExtension = '.jpg';
        } else if (selectedMimeType === 'image/webp') {
            fileExtension = '.webp';
        }

        let dataUrl;
        if (selectedMimeType === 'image/jpeg') {
            dataUrl = canvas.toDataURL(selectedMimeType, 0.9); // 90% quality for JPEG
        } else if (selectedMimeType === 'image/webp') {
            dataUrl = canvas.toDataURL(selectedMimeType, 0.8); // 80% quality for WebP
        } else { // PNG or any other format
            dataUrl = canvas.toDataURL(selectedMimeType);
        }
        
        const a = document.createElement('a');
        a.href = dataUrl;
        a.download = 'edited_photo' + fileExtension;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        console.log('Image download initiated for format:', selectedMimeType);
    });

    // --- Initialization ---
    if (loadImagesFromStorage()) {
        // Images will be loaded, and redrawCanvas will be called by onImageLoad
        console.log("Image loading initiated...");
    }
});
