import sharp from 'sharp'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const svg = readFileSync(join(root, 'public/app-icon.svg'))

const icons = [
  { name: 'pwa-72x72.png', size: 72 },
  { name: 'pwa-96x96.png', size: 96 },
  { name: 'pwa-128x128.png', size: 128 },
  { name: 'pwa-144x144.png', size: 144 },
  { name: 'pwa-152x152.png', size: 152 },
  { name: 'pwa-167x167.png', size: 167 },
  { name: 'pwa-180x180.png', size: 180 },
  { name: 'pwa-192x192.png', size: 192 },
  { name: 'pwa-384x384.png', size: 384 },
  { name: 'pwa-512x512.png', size: 512 },
  { name: 'pwa-512x512-maskable.png', size: 512 },
  { name: 'apple-touch-icon.png', size: 180 },
  { name: 'favicon-32x32.png', size: 32 },
]

async function generateIcons() {
  for (const { name, size } of icons) {
    const filePath = join(root, 'public', name)
    const isMaskable = name.includes('maskable')
    
    let image = sharp(svg).resize(size, size)
    
    if (isMaskable) {
      image = image.extend({
        top: Math.floor(size * 0.1),
        bottom: Math.floor(size * 0.1),
        left: Math.floor(size * 0.1),
        right: Math.floor(size * 0.1),
        background: '#f55082',
      })
    }
    
    await image.png().toFile(filePath)
    console.log(`Generated public/${name}`)
  }
}

generateIcons().catch((err) => {
  console.error('Error generating icons:', err)
  process.exit(1)
})