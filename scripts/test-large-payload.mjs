/**
 * Test with a LARGE image payload (simulates real character image ~2-5MB).
 * This catches body size limits or timeout issues with large requests.
 */

import { writeFile } from 'fs/promises';
import { deflateSync } from 'zlib';

const PROXY_URL = 'http://localhost:3000/api/ai-generate';

function createLargePng(width, height) {
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
    const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
    const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
    return Buffer.concat([len, td, crc]);
  }
  const sig = Buffer.from([137,80,78,71,13,10,26,10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width,0); ihdr.writeUInt32BE(height,4);
  ihdr[8]=8; ihdr[9]=2;
  const rows = [];
  for (let y = 0; y < height; y++) {
    const row = Buffer.alloc(1 + width*3);
    for (let x = 0; x < width; x++) {
      row[1+x*3] = Math.floor(Math.random()*256);
      row[2+x*3] = Math.floor(Math.random()*256);
      row[3+x*3] = Math.floor(Math.random()*256);
    }
    rows.push(row);
  }
  const compressed = deflateSync(Buffer.concat(rows), { level: 1 });
  return Buffer.concat([sig, chunk('IHDR',ihdr), chunk('IDAT',compressed), chunk('IEND',Buffer.alloc(0))]);
}

async function main() {
  // Create a 1024x1024 random-noise image (~3MB PNG, ~4MB base64)
  console.log('Creating 1024x1024 test image (simulates real character image)...');
  const png = createLargePng(1024, 1024);
  const base64 = png.toString('base64');
  console.log(`  PNG size: ${(png.length / 1024 / 1024).toFixed(1)} MB`);
  console.log(`  Base64 size: ${(base64.length / 1024 / 1024).toFixed(1)} MB`);

  const proxyPayload = JSON.stringify({
    model: 'gemini-3-pro-image-preview',
    method: 'generateContent',
    body: {
      contents: [{
        parts: [
          { inlineData: { mimeType: 'image/png', data: base64 } },
          { text: 'VISUAL EDIT TASK:\nMake this person wear a red coat.\nApply ONLY the above modification.' },
        ],
      }],
      generationConfig: { responseModalities: ['TEXT', 'IMAGE'] },
    },
  });

  console.log(`  Total request payload: ${(proxyPayload.length / 1024 / 1024).toFixed(1)} MB`);
  console.log(`\nPOST → ${PROXY_URL}`);

  const t0 = Date.now();
  try {
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), 120_000);

    const res = await fetch(PROXY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: proxyPayload,
      signal: ac.signal,
    });

    clearTimeout(timer);
    const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
    console.log(`  ← ${res.status} ${res.statusText} (${elapsed}s)`);

    if (!res.ok) {
      const err = await res.text();
      console.error(`  ✗ Error: ${err.slice(0, 500)}`);
      process.exit(1);
    }

    const json = await res.json();
    const parts = json.candidates?.[0]?.content?.parts ?? [];
    const imgs = parts.filter(p => p.inlineData);

    if (imgs.length === 0) {
      console.log(`  ⚠ No image in response (${parts.length} parts total)`);
      const textParts = parts.filter(p => p.text);
      if (textParts.length) console.log(`  Text: "${textParts[0].text.slice(0, 300)}"`);
    } else {
      const img = imgs[0].inlineData;
      console.log(`  ✓ Image returned: ${img.mimeType}, ${(img.data.length/1024).toFixed(0)}KB base64`);
      const ext = img.mimeType.includes('png') ? 'png' : 'jpg';
      await writeFile(`scripts/test-large-output.${ext}`, Buffer.from(img.data, 'base64'));
      console.log(`  ✓ Saved to scripts/test-large-output.${ext}`);
    }

    console.log(`\n=== LARGE PAYLOAD TEST PASSED (${elapsed}s) ===`);
  } catch (err) {
    const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
    console.error(`\n  ✗ FAILED after ${elapsed}s: ${err.message}`);
    process.exit(1);
  }
}

main();
