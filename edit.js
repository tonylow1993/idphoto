document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('imageCanvas');
    const ctx = canvas.getContext('2d');
    const imgWidthInput = document.getElementById('imgWidth');
    const imgHeightInput = document.getElementById('imgHeight');
    const downloadButton = document.getElementById('downloadButton');
    const bgColorRadios = document.querySelectorAll('input[name="bgColor"]');
    const formatRadios = document.querySelectorAll('input[name="downloadFormat"]');

    let originalImage = null;
    let originalImageDataUrl = null;
    let segmentationPolygons = null; // New global variable for polygon data

    // hexToRgb can be removed if not used elsewhere, ctx.fillStyle accepts hex directly.
    // function hexToRgb(hex) { ... } 

    function loadImagesFromStorage() {
        originalImageDataUrl = localStorage.getItem('originalImageUrl');
        const segmentationJsonString = localStorage.getItem('segmentationData');

        if (!originalImageDataUrl) {
            alert('Error: Original image data not found. Please upload an image first.');
            window.location.href = 'index.html';
            return false;
        }
        if (!segmentationJsonString) {
            alert('Error: Segmentation data not found. Please upload an image again.');
            window.location.href = 'index.html';
            return false;
        }

        try {
            const parsedData = JSON.parse(segmentationJsonString);
            // Assuming the structure is {"<REGION_TO_SEGMENTATION>": {"polygons": [[[x,y,x,y,...]],...]}}
            // The key "<REGION_TO_SEGMENTATION>" might vary or be absent if the JSON directly contains polygons.
            // For this implementation, we'll look for a "polygons" key at the top level or nested.
            if (parsedData.polygons) {
                 segmentationPolygons = parsedData.polygons;
            } else if (parsedData["<REGION_TO_SEGMENTATION>"]?.polygons) {
                 segmentationPolygons = parsedData["<REGION_TO_SEGMENTATION>"].polygons;
            } else {
                throw new Error("Polygons key not found in segmentation data");
            }

            if (!Array.isArray(segmentationPolygons) || segmentationPolygons.length === 0) {
                console.error('Invalid or empty segmentation polygons:', segmentationPolygons);
                alert('Error: Invalid or empty segmentation data. Please try again.');
                // Potentially redirect or offer to re-upload: window.location.href = 'index.html';
                return false; 
            }
            console.log("Segmentation polygons loaded and parsed:", segmentationPolygons);
        } catch (error) {
            console.error('Error parsing segmentation data:', error);
            alert('Error: Could not parse segmentation data. Please try again.');
            window.location.href = 'index.html';
            return false;
        }

        let originalImageLoaded = false;

        function checkLoadCompletion() {
            if (originalImageLoaded && segmentationPolygons) {
                console.log('Original image loaded and segmentation data ready.');
                if (originalImage) {
                    imgWidthInput.value = originalImage.naturalWidth;
                    imgHeightInput.value = originalImage.naturalHeight;
                }
                redrawCanvas(); // Perform an initial render
            }
        }

        originalImage = new Image();
        originalImage.onload = () => {
            originalImageLoaded = true;
            checkLoadCompletion();
        };
        originalImage.onerror = () => { alert('Error loading original image.'); };
        originalImage.src = originalImageDataUrl;
        
        return true; // Indicates that loading process has started
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
        // A. Inputs & Basic Setup
        if (!originalImage || !originalImage.complete || !segmentationPolygons) {
            console.warn('Original image or segmentation polygons not ready. Aborting redrawCanvas.');
            return;
        }

        const newBgColor = getSelectedBgColor();
        const targetWidth = parseInt(imgWidthInput.value) || originalImage.naturalWidth;
        const targetHeight = parseInt(imgHeightInput.value) || originalImage.naturalHeight;

        canvas.width = targetWidth;
        canvas.height = targetHeight;

        // B. Fill Main Canvas with Background Color
        ctx.fillStyle = newBgColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // C. Create Polygon Mask Canvas (`polyMaskCanvas`)
        const polyMaskCanvas = document.createElement('canvas');
        polyMaskCanvas.width = originalImage.naturalWidth;
        polyMaskCanvas.height = originalImage.naturalHeight;
        const polyMaskCtx = polyMaskCanvas.getContext('2d');
        polyMaskCtx.fillStyle = 'white'; // Color to draw the mask shapes

        // The segmentationPolygons is expected to be an array of "polyLists".
        // Each "polyList" is an array of actual polygons.
        // Each "polygon" is a flat array of coordinates [x1, y1, x2, y2, ...].
        segmentationPolygons.forEach(polyList => {
            if (Array.isArray(polyList)) {
                polyList.forEach(polygon => {
                    if (Array.isArray(polygon) && polygon.length >= 6) { // Need at least 3 points for a polygon
                        polyMaskCtx.beginPath();
                        polyMaskCtx.moveTo(polygon[0], polygon[1]);
                        for (let j = 2; j < polygon.length; j += 2) {
                            polyMaskCtx.lineTo(polygon[j], polygon[j + 1]);
                        }
                        polyMaskCtx.closePath();
                        polyMaskCtx.fill();
                    }
                });
            }
        });
        
        // D. Isolate Foreground using Polygon Mask
        const tempOriginalCanvas = document.createElement('canvas');
        tempOriginalCanvas.width = originalImage.naturalWidth;
        tempOriginalCanvas.height = originalImage.naturalHeight;
        const tempOriginalCtx = tempOriginalCanvas.getContext('2d');
        
        tempOriginalCtx.drawImage(originalImage, 0, 0); // Draw original image
        tempOriginalCtx.globalCompositeOperation = 'destination-in'; // Keep parts of original that overlap with mask
        tempOriginalCtx.drawImage(polyMaskCanvas, 0, 0); // Apply polygon mask
        tempOriginalCtx.globalCompositeOperation = 'source-over'; // Reset composite operation

        // E. Draw Scaled Foreground to Main Canvas
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

        ctx.drawImage(tempOriginalCanvas, x, y, drawWidth, drawHeight);
        console.log('Canvas redrawn with polygon-based masking.');
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
