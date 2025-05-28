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

    function hexToRgb(hex) {
        let r = 0, g = 0, b = 0;
        // 3 digits
        if (hex.length == 4) {
            r = parseInt(hex[1] + hex[1], 16);
            g = parseInt(hex[2] + hex[2], 16);
            b = parseInt(hex[3] + hex[3], 16);
        }
        // 6 digits
        else if (hex.length == 7) {
            r = parseInt(hex[1] + hex[2], 16);
            g = parseInt(hex[3] + hex[4], 16);
            b = parseInt(hex[5] + hex[6], 16);
        }
        return { r, g, b };
    }

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

        // 2. Fill Main Canvas with New Background
        ctx.fillStyle = newBgColor; // newBgColor is already a hex string
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // 3. Prepare Original Image Data
        const tempCanvasOriginal = document.createElement('canvas');
        const tempCtxOriginal = tempCanvasOriginal.getContext('2d');
        tempCanvasOriginal.width = originalImage.naturalWidth;
        tempCanvasOriginal.height = originalImage.naturalHeight;
        tempCtxOriginal.drawImage(originalImage, 0, 0);
        const originalImgData = tempCtxOriginal.getImageData(0, 0, originalImage.naturalWidth, originalImage.naturalHeight);

        // 4. Prepare Mask Data
        const tempCanvasMask = document.createElement('canvas');
        const tempCtxMask = tempCanvasMask.getContext('2d');
        tempCanvasMask.width = maskImage.naturalWidth;
        tempCanvasMask.height = maskImage.naturalHeight;
        tempCtxMask.drawImage(maskImage, 0, 0);
        const maskImgData = tempCtxMask.getImageData(0, 0, maskImage.naturalWidth, maskImage.naturalHeight);

        // 5. Create Foreground Canvas & Image Data
        const foregroundCanvas = document.createElement('canvas');
        const fgCtx = foregroundCanvas.getContext('2d');
        foregroundCanvas.width = originalImage.naturalWidth;
        foregroundCanvas.height = originalImage.naturalHeight;
        const foregroundImageData = fgCtx.createImageData(originalImage.naturalWidth, originalImage.naturalHeight);

        // 6. Process Pixels to Create Foreground Layer
        const threshold = 50; 
        const len = originalImgData.data.length;
        for (let i = 0; i < len; i += 4) {
            const maskValue = maskImgData.data[i]; // Red channel of mask

            if (maskValue >= threshold) { // Foreground
                foregroundImageData.data[i]   = originalImgData.data[i];   // R
                foregroundImageData.data[i+1] = originalImgData.data[i+1]; // G
                foregroundImageData.data[i+2] = originalImgData.data[i+2]; // B
                foregroundImageData.data[i+3] = 255;                      // Alpha (fully opaque)
            } else { // Background
                foregroundImageData.data[i]   = 0; // R
                foregroundImageData.data[i+1] = 0; // G
                foregroundImageData.data[i+2] = 0; // B
                foregroundImageData.data[i+3] = 0; // Alpha (fully transparent)
            }
        }

        // 7. Put Foreground Data onto Foreground Canvas
        fgCtx.putImageData(foregroundImageData, 0, 0);

        // 8. Calculate Scaling and Draw Foreground onto Main Canvas
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

        ctx.drawImage(foregroundCanvas, x, y, drawWidth, drawHeight);
        console.log('Canvas redrawn with explicit compositing.');
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
