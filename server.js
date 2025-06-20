const express = require('express');
const path = require('path');
const app = express(); // Create app instance

// Serve static files from the current directory
app.use(express.static(__dirname));

app.use('/libs/@imgly/background-removal', express.static(path.join(__dirname, 'node_modules/@imgly/background-removal/'))); // Serve entire package
app.use('/libs/onnxruntime-web', express.static(path.join(__dirname, 'node_modules/onnxruntime-web/dist'))); // Serve ONNX runtime assets

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/terms-of-service.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'terms-of-service.html'));
});

app.get('/privacy-policy.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'privacy-policy.html'));
});

// Export app for testing
module.exports = app;

// Conditionally start the server only if this script is run directly
if (require.main === module) {
  const port = process.env.PORT || 3000;
  app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port}`);
  });
}
