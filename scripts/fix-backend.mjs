#!/usr/bin/env node

import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

console.log('🔧 Fixing backend ES module issues...');

// Fix PDFExtractor worker configuration
const pdfExtractorPath = 'dist/backend/core/pdf/PDFExtractor.js';
let content = readFileSync(pdfExtractorPath, 'utf-8');

// Remplacer la ligne problématique par une configuration manuelle
// On désactive le worker pour l'instant (pas critique pour le parsing)
content = content.replace(
  /pdfjsLib\.GlobalWorkerOptions\.workerSrc = .+$/gm,
  "// Worker disabled for ES module compatibility"
);

writeFileSync(pdfExtractorPath, content);

console.log('✅ Backend ES module issues fixed');
