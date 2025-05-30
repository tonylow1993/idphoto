// Standalone function for processing the image
function processImage(file) {
    const reader = new FileReader(); // For Data URL (originalImageUrl)

    reader.onload = (loadEvent) => {
        const originalImageUrl = loadEvent.target.result;
        localStorage.setItem('originalImageUrl', originalImageUrl);
        console.log('Original image loaded for preview:', originalImageUrl.substring(0, 50) + '...');

        const arrayBufferReader = new FileReader();
        arrayBufferReader.onload = async (eventAB) => {
            const imageBinaryData = eventAB.target.result;
            const apiKey = "9OMXqnVGAlJAviQdCDAg2kW2sUL1PLeUgbsjoTlUtA3nPXzNEjzoJQQJ99BEAAAAAAAAAAAAINFRAZML4GHW";
            const apiUrl = "https://jp-ml-vlulx.japaneast.inference.ml.azure.com/score";
            
            const requestHeaders = new Headers();
            requestHeaders.append("Content-Type", file.type);
            requestHeaders.append("Authorization", "Bearer " + apiKey);
            requestHeaders.append("azureml-model-deployment", "florence-2-large-1");

            console.log("Attempting API call to:", apiUrl);
            console.log("With Content-Type:", file.type);

            try {
                const response = await fetch(apiUrl, {
                    method: "POST",
                    body: imageBinaryData,
                    headers: requestHeaders
                });

                if (response.ok) {
                    const jsonResponse = await response.json();
                    console.log("API Response OK. JSON:", jsonResponse);
                    localStorage.setItem('segmentationData', JSON.stringify(jsonResponse));
                    window.location.href = 'edit.html';
                } else {
                    console.error("API Request Failed with status:", response.status, response.statusText);
                    const responseBodyText = await response.text();
                    // Correctly iterating over Headers object for logging
                    let headerString = "";
                    for(let pair of response.headers.entries()){
                        headerString += pair[0] + ': ' + pair[1] + '\n';
                    }
                    console.error("Error response headers:\n", headerString);
                    console.error("Error response body:", responseBodyText);
                    alert(`Error segmenting image. Status: ${response.status} ${response.statusText}. Check console for details.`);
                }
            } catch (error) {
                console.error("Error during API call:", error);
                alert("Error making request to segmentation service. Check console for details.");
            }
        };
        arrayBufferReader.onerror = () => {
            console.error('Error reading file as ArrayBuffer.');
            alert('Error reading file for API upload.');
        };
        arrayBufferReader.readAsArrayBuffer(file);
    };
    reader.onerror = () => {
        console.error('Error reading file as DataURL.');
        alert('Error reading file for preview.');
    };
    reader.readAsDataURL(file);
}

// Standalone function for upload button click logic
function handleUploadButtonClick(fileInput) {
  if (fileInput) {
    fileInput.click();
  } else {
    console.error("fileInput not provided to handleUploadButtonClick");
  }
}

// Standalone function for file input change logic
function handleFileInputChange(event, processImageFn) {
  const file = event.target.files[0];
  if (file && typeof processImageFn === 'function') {
    console.log('File selected (via handleFileInputChange):', file.name);
    processImageFn(file);
  } else {
    if (!file) console.error("No file selected or event target is incorrect.");
    if (typeof processImageFn !== 'function') console.error("processImageFn not provided or not a function.");
  }
}

// DOMContentLoaded listener
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

    uploadButton.addEventListener('click', () => handleUploadButtonClick(fileInput));
    fileInput.addEventListener('change', (event) => handleFileInputChange(event, processImage));
  } else {
    console.warn("Upload button not found during DOMContentLoaded setup.");
  }
});

// CommonJS exports for testing with Jest
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    processImage,
    handleUploadButtonClick,
    handleFileInputChange
  };
}

// NOTE: The commented out functions like applyMaskAndChangeBackground, 
// simulateLocalImageProcessing, displayProcessedImage are not part of this refactoring
// as per the problem description, but they remain in the file if they were there before.
// For this task, only processImage and the event handler logics are refactored and exported.
