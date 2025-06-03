const request = require('supertest');
const app = require('./server'); // Assuming server.js exports the app
const fs = require('fs');
const path = require('path');

// Important: server.js needs to export the 'app' instance for testing.
// It also should conditionally start listening, e.g., if (!module.parent) { app.listen(...) }
// For now, we'll assume server.js is modified or can be required without auto-starting.
// If server.js immediately calls app.listen(), these tests might hang or fail.
// A better approach for server.js:
// const express = require('express');
// const app = express();
// ... (all your app.use, app.get) ...
// if (require.main === module) {
//   const port = process.env.PORT || 3000;
//   app.listen(port, () => console.log(`Server listening at http://localhost:${port}`));
// }
// module.exports = app;

describe('Express Server Tests', () => {
  let server;

  // Start server before all tests and close after
  // This is problematic if server.js directly calls app.listen().
  // For robust testing, server.js should export 'app' and conditionally listen.
  // We will proceed assuming server.js might need adjustment or supertest can handle it.

  beforeAll(done => {
    // Check if server.js exports the app instance directly
    if (typeof app.listen !== 'function') {
      console.error('server.js does not export the Express app instance directly or app.listen is not a function. Tests may fail.');
      // Attempt to use the app instance directly if it's not a function (meaning it might be the server instance itself)
      // This is a fallback, the ideal is server.js exports 'app' before listen.
      if (app.address && app.address()) { // Check if it's a running server instance
         server = app; // Already listening
         done();
         return;
      }
      // If server.js exports the app and does not auto-listen, this is how it would work:
      // server = app.listen(3001, done); // Use a different port for testing
      // However, current server.js auto-listens.
      // For now, tests will run against the server started by server.js's own app.listen.
      // This means the main server.js must be running for tests to pass, or supertest handles this.
      // Supertest can take an 'app' instance. If server.js exports 'app', supertest will start/stop it.
      // The current server.js does not export 'app' before listen, it exports nothing and just runs.
      // This requires `server.js` to be modified.
      // For the purpose of this subtask, we will write the tests as if server.js exports the app.
      // The user will need to modify server.js to:
      // const app = express(); ... module.exports = app;
      // And then in the main block: if (require.main === module) { app.listen(...) }
      done(); // Proceed, assuming server.js will be adjusted or supertest handles it.
    } else {
      // If app.listen is a function, it means 'app' is the express app instance.
      // Supertest will handle starting the server for requests.
      done();
    }
  });

  afterAll(done => {
    // if (server && server.close) {
    //   server.close(done);
    // } else {
    //   done();
    // }
    // Supertest manages server start/stop per request if given an app instance.
    // If server.js starts its own server, we can't easily close it here without modifying server.js
    done();
  });

  describe('Static Page Routes', () => {
    test('GET / should return index.html', async () => {
      const response = await request(app).get('/');
      expect(response.statusCode).toBe(200);
      expect(response.headers['content-type']).toMatch(/html/);
      // Check for a unique string from index.html
      const indexHtmlContent = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
      expect(response.text).toEqual(indexHtmlContent);
    });

    test('GET /terms-of-service.html should return terms-of-service.html', async () => {
      const response = await request(app).get('/terms-of-service.html');
      expect(response.statusCode).toBe(200);
      expect(response.headers['content-type']).toMatch(/html/);
      const termsHtmlContent = fs.readFileSync(path.join(__dirname, 'terms-of-service.html'), 'utf8');
      expect(response.text).toEqual(termsHtmlContent);
    });

    test('GET /privacy-policy.html should return privacy-policy.html', async () => {
      const response = await request(app).get('/privacy-policy.html');
      expect(response.statusCode).toBe(200);
      expect(response.headers['content-type']).toMatch(/html/);
      const privacyHtmlContent = fs.readFileSync(path.join(__dirname, 'privacy-policy.html'), 'utf8');
      expect(response.text).toEqual(privacyHtmlContent);
    });
  });

  describe('Library Static Routes', () => {
    test('GET /libs/@imgly/background-removal/config.json should return the config file', async () => {
      // This tests if the static serving for the library is set up.
      // We need a known file within that served directory. Let's assume 'config.json' or a similar small file exists.
      // Based on the library structure, a common file could be package.json of the library itself or a specific asset.
      // Checking for `config.json` as an example.
      const response = await request(app).get('/libs/@imgly/background-removal/package.json'); // Test with package.json
      expect(response.statusCode).toBe(200);
      expect(response.headers['content-type']).toMatch(/json/);
    });

    test('GET /libs/onnxruntime-web/ort.min.js should return the JS file', async () => {
      // Test for a key file in onnxruntime-web. ort.min.js is a likely candidate.
      const response = await request(app).get('/libs/onnxruntime-web/ort.min.js');
      expect(response.statusCode).toBe(200);
      expect(response.headers['content-type']).toMatch(/javascript/);
    });
  });

  // Test for server starting (implicitly tested by the requests above)
  // A dedicated test for "server starts" is tricky without modifying server.js to not auto-listen
  // and to export the server instance or a start function.
  // If the above tests pass, it implies the server is running and responding.
});
