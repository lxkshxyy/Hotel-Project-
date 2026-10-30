/** Shrinks a photo to at most `max` px on its long side and returns a JPEG data URL. */
export async function resizeImage(file: File, max = 1400, quality = 0.8): Promise<string> {
  return (await resizePhoto(file, max, quality)).url
}

/** Shrinks a photo for storage and reports its original shape. */
export async function resizePhoto(file: File, max = 1400, quality = 0.8): Promise<{ url: string; width: number; height: number }> {
  if (!file.type.startsWith('image/')) throw new Error(`${file.name} isn’t an image.`)
  const url = URL.createObjectURL(file)
  try {
    const img = await new Promise<HTMLImageElement>((ok, fail) => {
      const i = new Image()
      i.onload = () => ok(i)
      i.onerror = () => fail(new Error(`Couldn’t read ${file.name}. Try a JPG or PNG.`))
      i.src = url
    })
    if (img.width < 800 && img.height < 800) throw new Error(`${file.name} is too small (${img.width}×${img.height}). Use photos at least 800 px wide.`)
    const scale = Math.min(1, max / Math.max(img.width, img.height))
    const c = document.createElement('canvas')
    c.width = Math.round(img.width * scale)
    c.height = Math.round(img.height * scale)
    c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height)
    return { url: c.toDataURL('image/jpeg', quality), width: img.width, height: img.height }
  } finally {
    URL.revokeObjectURL(url)
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
