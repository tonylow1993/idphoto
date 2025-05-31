// edit.js
document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('imageCanvas');
    const ctx = canvas.getContext('2d');
    const imgWidthInput = document.getElementById('imgWidth');
    const imgHeightInput = document.getElementById('imgHeight');
    const downloadButton = document.getElementById('downloadButton');
    const bgColorRadios = document.querySelectorAll('input[name="bgColor"]');
    const formatRadios = document.querySelectorAll('input[name="downloadFormat"]');
    const reuploadButton = document.getElementById('reuploadButton');

    const reuploadFileInput = document.createElement('input');
    reuploadFileInput.type = 'file';
    reuploadFileInput.accept = 'image/*';
    reuploadFileInput.style.display = 'none';
    document.body.appendChild(reuploadFileInput);

    let originalImage = null; // Will still be used for dimensions and re-upload reference
    let originalImageDataUrl = null;
    let foregroundImage = null; // New: To store the image with background removed
    let foregroundImageDataUrl = null;

    function loadImagesFromStorage() {
        originalImageDataUrl = localStorage.getItem('originalImageUrl');
        foregroundImageDataUrl = localStorage.getItem('foregroundImageUrl'); // New

        if (!originalImageDataUrl) {
            alert('Error: Original image data not found. Please upload an image first.');
            window.location.href = 'index.html';
            return false;
        }
        if (!foregroundImageDataUrl) { // Check for the new foreground image
            alert('Error: Foreground image data not found. Please try processing the image again.');
            // Potentially direct to index.html if critical, or allow re-upload to re-process
            window.location.href = 'index.html';
            return false;
        }

        let originalImageLoaded = false;
        let foregroundImageLoaded = false;

        function checkLoadCompletion() {
            if (originalImageLoaded && foregroundImageLoaded) {
                console.log('Original and foreground images loaded.');
                if (originalImage) { // Keep using originalImage for initial dimensions
                    imgWidthInput.value = originalImage.naturalWidth;
                    imgHeightInput.value = originalImage.naturalHeight;
                }
                redrawCanvas();
            }
        }

        originalImage = new Image();
        originalImage.onload = () => {
            originalImageLoaded = true;
            checkLoadCompletion();
        };
        originalImage.onerror = () => { alert('Error loading original image.'); };
        originalImage.src = originalImageDataUrl;

        foregroundImage = new Image(); // New: Load the foreground image
        foregroundImage.onload = () => {
            foregroundImageLoaded = true;
            checkLoadCompletion();
        };
        foregroundImage.onerror = () => { alert('Error loading foreground image.'); };
        foregroundImage.src = foregroundImageDataUrl;
        
        return true;
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
        if (!originalImage || !originalImage.complete || !foregroundImage || !foregroundImage.complete) {
            console.warn('Original or foreground image not ready. Aborting redrawCanvas.');
            return;
        }

        const newBgColor = getSelectedBgColor();
        const targetWidth = parseInt(imgWidthInput.value) || foregroundImage.naturalWidth; // Use foreground for default size
        const targetHeight = parseInt(imgHeightInput.value) || foregroundImage.naturalHeight; // Use foreground for default size

        canvas.width = targetWidth;
        canvas.height = targetHeight;

        // 1. Fill Main Canvas with Background Color
        ctx.fillStyle = newBgColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // 2. Draw Scaled Foreground Image to Main Canvas
        // The foregroundImage already has transparency, so we just draw it.
        // Calculate aspect ratio based on the foreground image (which is the subject).
        const aspect = foregroundImage.naturalWidth / foregroundImage.naturalHeight;
        let drawWidth = targetWidth;
        let drawHeight = targetHeight;

        // Adjust dimensions to fit within target, maintaining aspect ratio
        if (targetWidth / targetHeight > aspect) { // Canvas is wider than image aspect ratio
            drawWidth = targetHeight * aspect;
        } else { // Canvas is taller or same aspect ratio as image
            drawHeight = targetWidth / aspect;
        }

        const x = (targetWidth - drawWidth) / 2;
        const y = (targetHeight - drawHeight) / 2;

        ctx.drawImage(foregroundImage, x, y, drawWidth, drawHeight);
        console.log('Canvas redrawn with foreground image.');
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
});
