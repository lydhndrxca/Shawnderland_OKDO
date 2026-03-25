/**
 * End-to-end test: simulates exactly what the Main Stage "Edit" button does.
 * 1. Creates a small test image (solid blue 50x50 PNG)
 * 2. Sends it to /api/ai-generate with "make this image red" prompt
 * 3. Verifies the response contains a valid image
 * 4. Saves both input and output to scripts/ for visual inspection
 */

import { createWriteStream } from 'fs';
import { writeFile } from 'fs/promises';
import { deflateSync } from 'zlib';

const PROXY_URL = 'http://localhost:3000/api/ai-generate';
const MODEL = 'gemini-3-pro-image-preview';
const METHOD = 'generateContent';
const EDIT_PROMPT = 'VISUAL EDIT TASK:\nChange the color of this square to bright red.\nApply ONLY the above modification.';

// ── Step 1: Create a small solid-blue 50x50 PNG as base64 ──
function createTestPng(width, height, r, g, b) {
  function crc32(buf) {
    let c = 0xffffffff;
    const table = new Int32Array(256);
    for (let n = 0; n < 256; n++) {
      let val = n;
      for (let k = 0; k < 8; k++) val = val & 1 ? 0xedb88320 ^ (val >>> 1) : val >>> 1;
      table[n] = val;
    }
    for (let i = 0; i < buf.length; i++) c = table[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  }

  function chunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const typeAndData = Buffer.concat([Buffer.from(type, 'ascii'), data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(typeAndData));
    return Buffer.concat([len, typeAndData, crc]);
  }

  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // color type: RGB
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  const rawRows = [];
  for (let y = 0; y < height; y++) {
    const row = Buffer.alloc(1 + width * 3);
    row[0] = 0; // no filter
    for (let x = 0; x < width; x++) {
      row[1 + x * 3] = r;
      row[2 + x * 3] = g;
      row[3 + x * 3] = b;
    }
    rawRows.push(row);
  }
  const rawData = Buffer.concat(rawRows);
  const compressed = deflateSync(rawData);

  const png = Buffer.concat([
    signature,
    chunk('IHDR', ihdr),
    chunk('IDAT', compressed),
    chunk('IEND', Buffer.alloc(0)),
  ]);

  return png;
}

async function main() {
  console.log('=== EDIT API END-TO-END TEST ===\n');

  // Step 1: Create test image
  console.log('Step 1: Creating 50x50 blue test image...');
  const pngBuffer = createTestPng(50, 50, 0, 100, 255);
  const base64 = pngBuffer.toString('base64');
  await writeFile('scripts/test-input.png', pngBuffer);
  console.log(`  ✓ Created test image (${pngBuffer.length} bytes, ${base64.length} chars base64)`);
  console.log(`  ✓ Saved to scripts/test-input.png`);

  // Step 2: Build the exact same request body the CharViewNode sends
  console.log('\nStep 2: Building request body (same as CharViewNode.handleEdit)...');
  const apiBody = {
    contents: [{
      parts: [
        { inlineData: { mimeType: 'image/png', data: base64 } },
        { text: EDIT_PROMPT },
      ],
    }],
    generationConfig: { responseModalities: ['TEXT', 'IMAGE'] },
  };

  const proxyPayload = {
    model: MODEL,
    method: METHOD,
    body: apiBody,
  };

  const payloadStr = JSON.stringify(proxyPayload);
  console.log(`  ✓ Payload size: ${(payloadStr.length / 1024).toFixed(1)} KB`);

  // Step 3: Send to proxy (exactly like attemptFetch does)
  console.log(`\nStep 3: POST → ${PROXY_URL}`);
  console.log(`  Model: ${MODEL}`);
  console.log(`  Method: ${METHOD}`);

  const t0 = Date.now();
  let response;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 120_000);

    response = await fetch(PROXY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payloadStr,
      signal: controller.signal,
    });

    clearTimeout(timeout);
  } catch (err) {
    const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
    console.error(`\n  ✗ FETCH FAILED after ${elapsed}s: ${err.message}`);
    if (err.message.includes('ECONNREFUSED')) {
      console.error('  → Dev server is not running! Start it with: npm run dev');
    }
    process.exit(1);
  }

  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(`  ← Response: ${response.status} ${response.statusText} (${elapsed}s)`);

  if (!response.ok) {
    const errText = await response.text();
    console.error(`\n  ✗ PROXY ERROR: ${errText.slice(0, 500)}`);
    process.exit(1);
  }

  // Step 4: Parse the response (same as generateWithGeminiRef)
  console.log('\nStep 4: Parsing response (same as generateWithGeminiRef)...');
  const json = await response.json();

  const candidates = json.candidates;
  if (!candidates?.length) {
    console.error('  ✗ No candidates in response!');
    console.error('  Full response:', JSON.stringify(json).slice(0, 1000));
    process.exit(1);
  }

  const parts = candidates[0]?.content?.parts ?? [];
  console.log(`  Parts in response: ${parts.length}`);

  const textParts = parts.filter(p => p.text);
  const imageParts = parts.filter(p => p.inlineData);

  if (textParts.length > 0) {
    console.log(`  Text parts: ${textParts.length}`);
    for (const tp of textParts) {
      console.log(`    "${tp.text.slice(0, 200)}"`);
    }
  }

  if (imageParts.length === 0) {
    console.error('\n  ✗ NO IMAGE in response!');
    console.error('  This means Gemini processed the request but did not return an image.');
    console.error('  Full parts:', JSON.stringify(parts).slice(0, 500));
    process.exit(1);
  }

  // Step 5: Extract and save the output image
  console.log(`\n  ✓ IMAGE FOUND! ${imageParts.length} image(s) returned`);
  const img = imageParts[0].inlineData;
  console.log(`  Mime type: ${img.mimeType}`);
  console.log(`  Base64 length: ${img.data.length} chars (${(img.data.length * 0.75 / 1024).toFixed(0)} KB decoded)`);

  const ext = img.mimeType.includes('png') ? 'png' : 'jpg';
  const outputPath = `scripts/test-output.${ext}`;
  await writeFile(outputPath, Buffer.from(img.data, 'base64'));
  console.log(`  ✓ Saved output to ${outputPath}`);

  // Step 6: Summary
  console.log('\n=== TEST PASSED ===');
  console.log(`  Input:  50x50 solid blue PNG`);
  console.log(`  Prompt: "Change the color to bright red"`);
  console.log(`  Output: ${img.mimeType} image (${(img.data.length * 0.75 / 1024).toFixed(0)} KB)`);
  console.log(`  Time:   ${elapsed}s`);
  console.log(`\n  The exact same code path that CharViewNode.handleEdit uses`);
  console.log(`  produced a valid image response. Check scripts/test-output.${ext}`);
}

main().catch((err) => {
  console.error('Unhandled error:', err);
  process.exit(1);
});
