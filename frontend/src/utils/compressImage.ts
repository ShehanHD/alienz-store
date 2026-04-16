/**
 * Compresses an image file using the Canvas API before upload.
 * Resizes to maxWidth (default 1200px) and encodes as WebP at the given quality.
 */
export async function compressImage(
  file: File,
  maxWidth = 1200,
  quality = 0.82,
): Promise<File> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)

    img.onload = () => {
      URL.revokeObjectURL(url)

      const scale = Math.min(1, maxWidth / img.width)
      const width = Math.round(img.width * scale)
      const height = Math.round(img.height * scale)

      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height

      const ctx = canvas.getContext('2d')
      if (!ctx) { reject(new Error('Canvas not supported')); return }

      ctx.drawImage(img, 0, 0, width, height)

      canvas.toBlob(
        (blob) => {
          if (!blob) { reject(new Error('Compression failed')); return }
          const compressed = new File(
            [blob],
            file.name.replace(/\.[^.]+$/, '.webp'),
            { type: 'image/webp' },
          )
          resolve(compressed)
        },
        'image/webp',
        quality,
      )
    }

    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Failed to load image')) }
    img.src = url
  })
}
