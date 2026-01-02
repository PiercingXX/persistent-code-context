#!/usr/bin/env node
/**
 * Wrapper script to run vsce with File API polyfill.
 * Undici (used by vsce's cheerio dependency) expects browser File API.
 */

// Polyfill File class BEFORE loading any modules
if (typeof globalThis.File === 'undefined') {
  globalThis.File = class File {
    constructor(bits, name, options) {
      this.bits = bits;
      this.name = name;
      this.type = options?.type || '';
      this.size = 0;
      this.lastModified = Date.now();
    }
  };
}

// Also polyfill other web APIs that undici might need
if (typeof globalThis.FormData === 'undefined') {
  globalThis.FormData = class FormData {
    constructor() {
      this._data = new Map();
    }
  };
}

// Now require and run vsce in the same process
async function main() {
  try {
    const vsce = require('@vscode/vsce');
    await vsce.createVSIX({
      cwd: process.cwd(),
      useYarn: false
    });
    console.log('✓ Package created successfully');
  } catch (error) {
    console.error('Packaging failed:', error);
    process.exit(1);
  }
}

main();
