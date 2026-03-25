/**
 * Simulates the EXACT browser-side code path from CharViewNode → imageGenApi → proxy.
 * Replicates attemptFetch, callApi, generateWithGeminiRef, and handleEdit logic.
 * Tests with a larger image (closer to real character image size).
 */

import { writeFile, readFile } from 'fs/promises';
import { deflateSync } from 'zlib';

const PROXY_URL = 'http://localhost:3000/api/ai-generate';
const MODEL_ID = 'gemini-3-pro-image-preview';
const EDIT_PREFIX = 'VISUAL EDIT TASK:\nPreserve 100% of the existing design, only apply the following modification:\n';
const EDIT_SUFFIX = '\nApply ONLY the above modification. Do NOT change anything else.\nBackground: Solid flat grey (#D3D3D3). No floor, no shadows, no environment.';

// ── Replicate attemptFetch exactly ──
async function attemptFetch(url, bodyStr, label, timeoutMs) {
  const ac = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => { timedOut = true; ac.abort(); }, timeoutMs);

  console.log(`    [attemptFetch] POST ${url.slice(0, 60)}... (${(bodyStr.length / 1024).toFixed(0)}KB, timeout=${timeoutMs/1000}s)`);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: bodyStr,
      signal: ac.signal,
    });

    console.log(`    [attemptFetch] Response: ${res.status} ${res.statusText}`);

    if (res.ok) return await res.json();

    const errText = await res.text().catch(() => `HTTP ${res.status}`);
    throw new Error(`${label} error ${res.status}: ${errText.slice(0, 400)}`);
  } catch (err) {
    if (timedOut) throw new Error(`${label} timed out after ${Math.round(timeoutMs / 1000)}s`);
    if (err instanceof Error && err.message.startsWith(`${label} error`)) throw err;
    console.log(`    [attemptFetch] Network error: ${err.message}`);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

// ── Replicate callApi exactly ──
async function callApi(model, method, body, label, timeoutMs = 120000) {
  const proxyBody = JSON.stringify({ model, method, body });
  console.log(`  [callApi] ${label} → proxy (${(proxyBody.length / 1024).toFixed(0)}KB)`);

  const result = await attemptFetch(PROXY_URL, proxyBody, label, timeoutMs);
  if (result) {
    console.log(`  [callApi] ${label} → proxy OK ✓`);
    return result;
  }

  throw new Error(`${label} failed — server proxy returned a network error`);
}

// ── Replicate generateWithGeminiRef exactly ──
async function generateWithGeminiRef(prompt, referenceImage) {
  const images = Array.isArray(referenceImage) ? referenceImage : [referenceImage];

  console.log(`  [generateWithGeminiRef] model=${MODEL_ID}, images=${images.length}, prompt length=${prompt.length}`);
  for (let i = 0; i < images.length; i++) {
    console.log(`  [generateWithGeminiRef] image[${i}] mime=${images[i].mimeType} base64 length=${images[i].base64.length}`);
  }

  const parts = [
    ...images.map(img => ({ inlineData: { mimeType: img.mimeType, data: img.base64 } })),
    { text: prompt },
  ];

  const t0 = Date.now();
  const json = await callApi(
    MODEL_ID,
    'generateContent',
    {
      contents: [{ parts }],
      generationConfig: { responseModalities: ['TEXT', 'IMAGE'] },
    },
    'Gemini 3 Pro',
  );
  console.log(`  [generateWithGeminiRef] callApi returned in ${Date.now() - t0}ms`);

  const responseParts = json.candidates?.[0]?.content?.parts ?? [];
  console.log(`  [generateWithGeminiRef] response parts: ${responseParts.length}`);

  const imageParts = responseParts.filter(p => p.inlineData);
  if (imageParts.length === 0) throw new Error('No image returned from Gemini 3 Pro');

  return imageParts.map(p => ({
    base64: p.inlineData.data,
    mimeType: p.inlineData.mimeType,
  }));
}

// ── Create test image ──
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
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
    const typeAndData = Buffer.concat([Buffer.from(type, 'ascii'), data]);
    const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(typeAndData));
    return Buffer.concat([len, typeAndData, crc]);
  }
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; ihdr[9] = 2;
  const rows = [];
  for (let y = 0; y < height; y++) {
    const row = Buffer.alloc(1 + width * 3);
    for (let x = 0; x < width; x++) { row[1 + x*3] = r; row[2 + x*3] = g; row[3 + x*3] = b; }
    rows.push(row);
  }
  const compressed = deflateSync(Buffer.concat(rows));
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', compressed), chunk('IEND', Buffer.alloc(0))]);
}

// ── Replicate handleEdit exactly ──
async function main() {
  console.log('=== BROWSER SIMULATION TEST ===\n');
  console.log('This replicates the EXACT code path from CharViewNode.handleEdit\n');

  // Create image (simulating displayImage in the viewer)
  const png = createTestPng(200, 200, 0, 100, 255);
  const displayImage = { base64: png.toString('base64'), mimeType: 'image/png' };
  console.log(`[handleEdit] Source image: ${displayImage.mimeType}, ${(displayImage.base64.length / 1024).toFixed(0)}KB base64\n`);

  const editText = 'red coat';
  const prompt = EDIT_PREFIX + editText + EDIT_SUFFIX;

  console.log(`[handleEdit] Prompt: "${editText}"`);
  console.log('[handleEdit] Calling generateWithGeminiRef...\n');

  const t0 = Date.now();
  try {
    const results = await generateWithGeminiRef(prompt, displayImage);

    const img = results[0];
    if (!img) throw new Error('No image returned');

    const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
    console.log(`\n[handleEdit] ✓ Edit complete (${elapsed}s)`);
    console.log(`[handleEdit] New image: ${img.mimeType}, ${(img.base64.length / 1024).toFixed(0)}KB base64`);

    // This is what setEditedImage(img) would do
    console.log('[handleEdit] Would call setEditedImage(img) → triggers React re-render');
    console.log('[handleEdit] Would call setNodes(...generatedImage: img...) → persists to node data');

    // Verify the image is valid
    const imgBuf = Buffer.from(img.base64, 'base64');
    const ext = img.mimeType.includes('png') ? 'png' : 'jpg';
    await writeFile(`scripts/test-browser-sim-output.${ext}`, imgBuf);
    console.log(`[handleEdit] Saved output: scripts/test-browser-sim-output.${ext} (${imgBuf.length} bytes)`);

    console.log('\n=== SIMULATION PASSED ===');
    console.log('The full handleEdit → generateWithGeminiRef → callApi → attemptFetch');
    console.log('→ proxy → Google API → response parsing chain works correctly.');
    console.log(`Total time: ${elapsed}s`);

  } catch (err) {
    const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
    console.error(`\n[handleEdit] ✗ FAILED after ${elapsed}s: ${err.message}`);
    process.exit(1);
  }
}

main();
