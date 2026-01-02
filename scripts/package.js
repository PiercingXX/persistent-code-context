#!/usr/bin/env node
/**
 * Wrapper script to run vsce with File API polyfill.
 * Undici (used by vsce's cheerio dependency) expects browser File API.
 */

// Polyfill File class for Node.js environments that don't have it
if (typeof globalThis.File === 'undefined') {
  globalThis.File = class File {
    constructor(bits, name, options) {
      this.bits = bits;
      this.name = name;
      this.type = options?.type || '';
    }
  };
}

// Now run vsce
const { spawn } = require('child_process');
const path = require('path');

const vsce = spawn('npx', ['vsce', 'package'], {
  stdio: 'inherit',
  cwd: process.cwd()
});

vsce.on('close', (code) => {
  process.exit(code);
});
