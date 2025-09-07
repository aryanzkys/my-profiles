#!/usr/bin/env node
const path = require('path');
const { generatePatches } = require('../lib/generatePatches');

try {
  const repoRoot = path.resolve(__dirname, '..');
  const res = generatePatches({ repoRoot });
  console.log(`Generated patches: ${res.patches.length} total (last: #${res.patches[res.patches.length-1]?.number||0})`);
} catch (e) {
  console.error('Failed to generate patches:', e.message || e);
  process.exit(1);
}
