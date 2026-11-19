/** Shrinks a photo to at most `max` px on its long side and returns a JPEG data URL. */
export async function resizeImage(file: File, max = 1400, quality = 0.8): Promise<string> {
  return (await resizePhoto(file, max, quality)).url
}

/** Shrinks a photo for storage and reports its original shape. */
export async function resizePhoto(file: File, max = 1400, quality = 0.8): Promise<{ url: string; width: number; height: number }> {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
  // Some systems leave the file type empty; trust the extension for the usual photo formats.
  if (!file.type.startsWith('image/') && !['jpg', 'jpeg', 'png', 'webp', 'jfif', 'avif', 'gif', 'bmp'].includes(ext)) throw new Error(`${file.name} isn’t a photo. Use a JPG or PNG.`)
  if (/heic|heif/.test(file.type) || ext === 'heic' || ext === 'heif') throw new Error(`${file.name} is an iPhone HEIC photo. Save it as JPG first (on iPhone: Settings → Camera → Formats → Most Compatible).`)
  const img = await decode(file)
  try {
    if (img.width < 800 && img.height < 800) throw new Error(`${file.name} is too small (${img.width}×${img.height}). Use photos at least 800 px wide.`)
    const scale = Math.min(1, max / Math.max(img.width, img.height))
    const c = document.createElement('canvas')
    c.width = Math.round(img.width * scale)
    c.height = Math.round(img.height * scale)
    const ctx = c.getContext('2d')!
    // White behind transparent PNGs, so they don't turn black as JPEG.
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, c.width, c.height)
    ctx.drawImage(img.source, 0, 0, c.width, c.height)
    return { url: c.toDataURL('image/jpeg', quality), width: img.width, height: img.height }
  } finally {
    img.close()
  }
}

/**
 * Turns the file into pixels. Tries the browser's direct decoder first (needs no web address, so it
 * works even where pages may not load blob: images), then a data: URL, then a blob: URL.
 */
async function decode(file: File): Promise<{ source: CanvasImageSource; width: number; height: number; close: () => void }> {
  if (typeof createImageBitmap === 'function') {
    try {
      const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' })
      return { source: bmp, width: bmp.width, height: bmp.height, close: () => bmp.close() }
    } catch {
      /* fall through */
    }
  }
  const load = (src: string) =>
    new Promise<HTMLImageElement>((ok, fail) => {
      const i = new Image()
      i.onload = () => ok(i)
      i.onerror = () => fail(new Error('decode'))
      i.src = src
    })
  try {
    const dataUrl = await new Promise<string>((ok, fail) => {
      const r = new FileReader()
      r.onload = () => ok(String(r.result))
      r.onerror = () => fail(r.error)
      r.readAsDataURL(file)
    })
    const i = await load(dataUrl)
    return { source: i, width: i.naturalWidth, height: i.naturalHeight, close: () => {} }
  } catch {
    const url = URL.createObjectURL(file)
    try {
      const i = await load(url)
      return { source: i, width: i.naturalWidth, height: i.naturalHeight, close: () => URL.revokeObjectURL(url) }
    } catch {
      URL.revokeObjectURL(url)
      throw new Error(`Couldn’t open ${file.name}. The file may be damaged or not really a JPG/PNG — open it on your computer and save it again as JPG.`)
    }
  }
}

export function dataUrlToBlob(dataUrl: string) {
  const [head, b64] = dataUrl.split(',')
  const mime = head.match(/data:(.*?);/)?.[1] ?? 'image/jpeg'
  const bin = atob(b64)
  const arr = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i)
  return new Blob([arr], { type: mime })
}
