/**
 * Test setup file (CommonJS): intercepts 'vscode' requires before tests load.
 * This bypasses ts-node/source-map-support timing issues.
 */

const Module = require('module');
const path = require('path');

// Save the original load function
const originalLoad = Module.prototype.load;

// Override load to intercept vscode requires
Module.prototype.load = function (filename) {
  if (filename === 'vscode') {
    filename = path.resolve(__dirname, 'mocks', 'vscode.js');
  }
  return originalLoad.call(this, filename);
};

// Also patch resolveFilename for extra safety
const originalResolveFilename = Module._resolveFilename;
Module._resolveFilename = function (request, parent, isMain) {
  if (request === 'vscode') {
    request = path.resolve(__dirname, 'mocks', 'vscode');
  }
  return originalResolveFilename.call(this, request, parent, isMain);
};
