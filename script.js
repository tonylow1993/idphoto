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
      const originalImageUrl = e.target.result;
      console.log('Original image loaded:', originalImageUrl.substring(0, 50) + '...');

      const segmentationJsonString = '{"<REGION_TO_SEGMENTATION>": {"polygons": [[[248.7779998779297, 45.492000579833984, 250.61399841308594, 43.45199966430664, 250.61399841308594, 41.4119987487793, 251.83799743652344, 39.37199783325195, 256.7340087890625, 34.47599792480469, 259.79400634765625, 32.43600082397461, 261.6300048828125, 32.43600082397461, 264.69000244140625, 30.395999908447266, 266.5260009765625, 30.395999908447266, 268.36199951171875, 29.579999923706055, 271.4219970703125, 27.53999900817871, 273.8699951171875, 25.5, 273.8699951171875, 23.459999084472656, 275.70599365234375, 21.420000076293945, 275.70599365234375, 19.3799991607666, 277.5419921875, 18.56399917602539, 279.989990234375, 17.34000015258789, 284.885986328125, 17.34000015258789, 286.72198486328125, 16.52400016784668, 288.5579833984375, 14.483999252319336, 290.39398193359375, 14.483999252319336, 292.84197998046875, 16.52400016784668, 294.6780090332031, 16.52400016784668, 302.6340026855469, 15.299999237060547, 305.6940002441406, 16.52400016784668, 307.5299987792969, 17.34000015258789, 309.3659973144531, 19.3799991607666, 311.8139953613281, 19.3799991607666, 313.6499938964844, 20.195999145507812, 315.4859924316406, 22.236000061035156, 317.9339904785156, 23.459999084472656, 319.7699890136719, 23.459999084472656, 327.7259826660156, 22.236000061035156, 329.5619812011719, 23.459999084472656, 331.3979797363281, 25.5, 334.4580078125, 26.31599998474121, 338.74200439453125, 26.31599998474121, 341.802001953125, 27.53999900817871, 346.697998046875, 32.43600082397461, 350.98199462890625, 34.47599792480469, 352.8179931640625, 34.47599792480469, 355.87799072265625, 36.51599884033203, 358.93798828125, 36.51599884033203, 360.77398681640625, 38.555999755859375, 360.77398681640625, 39.37199783325195, 365.0579833984375, 42.6359977722168, 366.89398193359375, 44.67599868774414, 366.89398193359375, 47.53199768066406, 368.72998046875, 50.38800048828125, 369.9539794921875, 53.652000427246094, 369.9539794921875, 55.69199752807617, 370.56597900390625, 58.54800033569336, 371.78997802734375, 60.58799743652344, 373.6260070800781, 62.62799835205078, 374.8500061035156, 65.48400115966797, 374.8500061035156, 69.56399536132812, 376.0740051269531, 70.37999725341797, 376.6860046386719, 73.64399719238281, 376.6860046386719, 80.58000183105469, 377.9100036621094, 81.39599609375, 379.1340026855469, 87.51599884033203, 379.1340026855469, 98.53199768066406, 377.9100036621094, 99.75599670410156, 376.6860046386719, 108.73199462890625, 376.6860046386719, 123.82799530029297, 379.1340026855469, 125.86799621582031, 384.0299987792969, 129.947998046875, 385.8659973144531, 134.0279998779297, 387.0899963378906, 136.88400268554688, 387.0899963378906, 145.0439910888672, 385.8659973144531, 149.12399291992188, 384.6419982910156, 153.20399475097656, 384.0299987792969, 156.05999755859375, 382.8059997558594, 158.91600036621094, 379.7460021972656, 165.03599548339844, 377.9100036621094, 167.89199829101562, 376.0740051269531, 171.15599060058594, 373.6260070800781, 174.01199340820312, 371.78997802734375, 176.052001953125, 360.77398681640625, 176.052001953125, 358.93798828125, 178.0919952392578, 357.7139892578125, 182.1719970703125, 357.10198974609375, 187.0679931640625, 357.10198974609375, 191.1479949951172, 355.87799072265625, 191.9639892578125, 355.2659912109375, 195.22799682617188, 354.0419921875, 198.08399963378906, 354.0419921875, 218.07598876953125, 355.87799072265625, 220.11599731445312, 366.89398193359375, 220.11599731445312, 368.72998046875, 220.93199157714844, 369.9539794921875, 222.9720001220703, 369.9539794921875, 225.01199340820312, 371.78997802734375, 228.2760009765625, 371.78997802734375, 229.90798950195312, 374.8500061035156, 235.2119903564453, 374.8500061035156, 237.2519989013672, 376.6860046386719, 240.10800170898438, 376.6860046386719, 242.1479949951172, 377.9100036621094, 245.41200256347656, 379.1340026855469, 248.2679901123047, 382.8059997558594, 252.34799194335938, 384.6419982910156, 252.34799194335938, 387.7019958496094, 254.38800048828125, 390.1499938964844, 254.38800048828125, 393.8219909667969, 256.0199890136719, 395.6579895019531, 258.05999755859375, 398.7179870605469, 259.28399658203125, 401.7779846191406, 261.3240051269531, 404.8379821777344, 263.3639831542969, 407.8979797363281, 264.9960021972656, 410.9579772949219, 267.0359802246094, 414.6300048828125, 270.29998779296875, 417.69000244140625, 273.156005859375, 420.75, 275.19598388671875, 423.80999755859375, 277.2359924316406, 426.8699951171875, 279.2760009765625, 429.92999267578125, 281.3160095214844, 432.989990234375, 283.3559875488281, 435.43798828125, 285.39599609375, 438.49798583984375, 287.4360046386719, 441.5579833984375, 288.2519836425781, 444.61798095703125, 290.2919921875, 447.677978515625, 292.3320007324219, 450.7380065917969, 294.37200927734375, 453.7980041503906, 296.4119873046875, 457.4700012207031, 299.26800537109375, 461.7539978027344, 302.531982421875, 466.6499938964844, 306.2039794921875, 474.6059875488281, 313.5480041503906, 487.4579772949219, 325.3800048828125, 493.5780029296875, 331.5, 495.41400146484375, 334.3559875488281, 497.25, 337.6199951171875, 499.697998046875, 341.2919921875, 500.30999755859375, 344.5559997558594, 501.53399658203125, 347.4119873046875, 502.75799560546875, 350.26800537109375, 503.3699951171875, 353.531982421875, 504.593994140625, 360.4679870605469, 505.8179931640625, 367.40399169921875, 505.8179931640625, 374.3399963378906, 506.42999267578125, 380.4599914550781, 507.65399169921875, 385.3559875488281, 508.87799072265625, 386.5799865722656, 509.489990234375, 391.4759826660156, 509.489990234375, 396.3719787597656, 510.7139892578125, 397.5959777832031, 511.32598876953125, 402.49200439453125, 512.5499877929688, 407.38800048828125, 161.87399291992188, 407.38800048828125, 161.87399291992188, 396.3719787597656, 163.09799194335938, 389.4360046386719, 164.32199096679688, 385.3559875488281, 164.93399047851562, 384.53997802734375, 166.15798950195312, 380.4599914550781, 166.77000427246094, 374.3399963378906, 167.99400329589844, 369.4440002441406, 169.21800231933594, 364.5480041503906, 169.8300018310547, 358.427978515625, 169.8300018310547, 350.26800537109375, 171.0540008544922, 344.5559997558594, 172.2779998779297, 338.4360046386719, 172.88999938964844, 332.31597900390625, 174.11399841308594, 327.41998291015625, 174.7259979248047, 323.3399963378906, 175.9499969482422, 320.4840087890625, 177.1739959716797, 317.2200012207031, 177.78599548339844, 315.17999267578125, 180.23399353027344, 312.3240051269531, 190.0260009765625, 301.3079833984375, 199.20599365234375, 292.3320007324219, 202.87799072265625, 289.0679931640625, 205.93800354003906, 287.4360046386719, 208.9980010986328, 285.39599609375, 213.8939971923828, 283.3559875488281, 216.3419952392578, 281.3160095214844, 218.7899932861328, 280.5, 221.84999084472656, 278.4599914550781, 223.6859893798828, 276.41998291015625, 226.74600219726562, 275.19598388671875, 229.19400024414062, 273.156005859375, 234.08999633789062, 271.52398681640625, 235.92599487304688, 269.4840087890625, 238.98599243164062, 268.260009765625, 242.04598999023438, 266.2200012207031, 246.94200134277344, 261.3240051269531, 248.7779998779297, 258.05999755859375, 248.7779998779297, 257.2439880371094, 250.61399841308594, 254.38800048828125, 253.06199645996094, 251.12399291992188, 256.7340087890625, 246.22799682617188, 262.85400390625, 240.10800170898438, 264.0780029296875, 240.10800170898438, 267.13800048828125, 238.0679931640625, 269.58599853515625, 235.2119903564453, 269.58599853515625, 216.03599548339844, 262.85400390625, 209.09999084472656, 259.79400634765625, 205.01998901367188, 257.9580078125, 200.94000244140625, 256.7340087890625, 198.08399963378906, 255.50999450683594, 195.22799682617188, 254.8979949951172, 191.9639892578125, 253.6739959716797, 189.10800170898438, 253.06199645996094, 185.0279998779297, 253.06199645996094, 182.1719970703125, 251.83799743652344, 178.0919952392578, 250.61399841308594, 175.23599243164062, 245.71800231933594, 169.93199157714844, 243.88198852539062, 167.0760040283203, 242.04598999023438, 164.22000122070312, 240.82199096679688, 162.17999267578125, 239.59799194335938, 158.91600036621094, 239.59799194335938, 134.843994140625, 240.82199096679688, 129.947998046875, 242.04598999023438, 127.90799713134766, 245.71800231933594, 123.82799530029297, 245.71800231933594, 115.66799926757812, 244.49398803710938, 112.81199645996094, 243.88198852539062, 108.73199462890625, 242.65798950195312, 107.50799560546875, 242.04598999023438, 104.6520004272461, 240.82199096679688, 100.5719985961914, 240.82199096679688, 85.47599792480469, 242.04598999023438, 79.35599517822266, 242.65798950195312, 74.45999908447266, 243.88198852539062, 70.37999725341797, 244.49398803710938, 69.56399536132812, 245.71800231933594, 66.29999542236328, 246.94200134277344, 63.444000244140625, 246.94200134277344, 58.54800033569336, 248.7779998779297, 56.507999420166016, 250.0019989013672, 54.46799850463867, 250.0019989013672, 52.42799758911133, 247.5540008544922, 50.38800048828125, 247.5540008544922, 47.53199768066406]]], "labels": [""]}}';

      localStorage.setItem('originalImageUrl', originalImageUrl);
      localStorage.setItem('segmentationData', segmentationJsonString);
      console.log('Stored originalImageUrl and segmentationData (JSON string) in localStorage. Redirecting to edit.html...');
      window.location.href = 'edit.html';
    };
    reader.onerror = (error) => {
        console.error('Error reading file:', error);
        alert('Error reading file. Please try again.');
    };
    reader.readAsDataURL(file);
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
