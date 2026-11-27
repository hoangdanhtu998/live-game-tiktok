const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const refs = ['config.js', 'game.js'].map(file => fs.readFileSync(path.join(root, file), 'utf8')).join('\n');
const assets = [...new Set(refs.match(/[A-Za-z0-9_-]+\.webp/g) || [])].filter(name => fs.existsSync(path.join(root, 'assets', name)));
const tmp = path.join(require('node:os').tmpdir(), 'kc-asset-verify.rgba');
const decode = file => {
  const result = spawnSync('ffmpeg', ['-v', 'error', '-i', file, '-frames:v', '1', '-f', 'rawvideo', '-pix_fmt', 'rgba', '-y', tmp], { stdio: 'ignore' });
  if (result.status !== 0) throw new Error(`Could not decode ${file}`);
  const pixels = fs.readFileSync(tmp); fs.unlinkSync(tmp);
  for (let i = 0; i < pixels.length; i += 4) if (pixels[i + 3] === 0) pixels.fill(0, i, i + 3);
  return crypto.createHash('sha256').update(pixels).digest('hex');
};
let exact = 0, pngBytes = 0, webpBytes = 0;
for (const webpName of assets) {
  const webp = path.join(root, 'assets', webpName), png = webp.replace(/\.webp$/i, '.png');
  if (!fs.existsSync(webp)) throw new Error(`Missing ${webp}`);
  if (decode(png) !== decode(webp)) throw new Error(`Decoded pixel mismatch for ${pngName}`);
  pngBytes += fs.statSync(png).size; webpBytes += fs.statSync(webp).size; exact++;
}
console.log(JSON.stringify({ files: exact, pngBytes, webpBytes, savedPercent: Number((100 * (1 - webpBytes / pngBytes)).toFixed(1)), visibleRgbaPixelsIdentical: exact }, null, 2));
