/**
 * Client-side image optimization helper.
 * Resizes images exceeding maxDimension and compresses to reasonable quality.
 * Drastically cuts network upload size and Gemini Vision API decoding time
 * without degrading code or equation readability.
 */
export const compressImage = (file, maxDimension = 1600, quality = 0.85) => {
  return new Promise((resolve) => {
    // If not an image or SVG/GIF, return unchanged
    if (!file || !file.type.startsWith('image/') || file.type === 'image/gif' || file.type === 'image/svg+xml') {
      const reader = new FileReader();
      reader.onload = () => resolve({ file, dataUrl: reader.result });
      reader.onerror = () => resolve({ file, dataUrl: null });
      reader.readAsDataURL(file);
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // If already small (< 500KB and within maxDimension), don't re-compress
        if (width <= maxDimension && height <= maxDimension && file.size < 500 * 1024) {
          resolve({ file, dataUrl: e.target.result });
          return;
        }

        // Calculate aspect-ratio preserved dimensions
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        const mimeType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
        canvas.toBlob(
          (blob) => {
            if (!blob || blob.size >= file.size) {
              // If blob creation failed or didn't save size, use original
              resolve({ file, dataUrl: e.target.result });
              return;
            }
            const optimizedFile = new File([blob], file.name, {
              type: mimeType,
              lastModified: Date.now()
            });
            const optimizedDataUrl = canvas.toDataURL(mimeType, quality);
            resolve({ file: optimizedFile, dataUrl: optimizedDataUrl });
          },
          mimeType,
          quality
        );
      };
      img.onerror = () => resolve({ file, dataUrl: e.target.result });
      img.src = e.target.result;
    };
    reader.onerror = () => resolve({ file, dataUrl: null });
    reader.readAsDataURL(file);
  });
};
