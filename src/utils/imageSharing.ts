// Utility for sharing, copying and downloading image cards cleanly to WhatsApp, Clipboard, or Web Share API

export async function getImageBlob(imageUrl: string): Promise<Blob | null> {
  try {
    if (!imageUrl) return null;

    if (imageUrl.startsWith('data:')) {
      const parts = imageUrl.split(',');
      const mime = parts[0].match(/:(.*?);/)?.[1] || 'image/png';
      const bstr = atob(parts[1]);
      let n = bstr.length;
      const u8arr = new Uint8Array(n);
      while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
      }
      return new Blob([u8arr], { type: mime });
    }

    // Try fetch with cors
    try {
      const response = await fetch(imageUrl, { mode: 'cors' });
      if (response.ok) {
        return await response.blob();
      }
    } catch {
      // Fallback to canvas below
    }

    // Canvas fallback to convert image
    return await new Promise<Blob | null>((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = img.naturalWidth || img.width || 600;
          canvas.height = img.naturalHeight || img.height || 600;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0);
            canvas.toBlob((b) => resolve(b), 'image/png', 0.95);
          } else {
            resolve(null);
          }
        } catch (e) {
          console.warn('Canvas export failed:', e);
          resolve(null);
        }
      };
      img.onerror = () => resolve(null);
      img.src = imageUrl;
    });
  } catch (err) {
    console.error('Failed to get image blob:', err);
    return null;
  }
}

export async function copyImageDataUrlToClipboard(imageUrl: string): Promise<boolean> {
  try {
    const blob = await getImageBlob(imageUrl);
    if (!blob) return false;

    // Convert to image/png if needed
    let pngBlob = blob;
    if (blob.type !== 'image/png') {
      const blobUrl = URL.createObjectURL(blob);
      const converted = await new Promise<Blob | null>((resolve) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = img.naturalWidth || img.width;
          canvas.height = img.naturalHeight || img.height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0);
            canvas.toBlob((b) => {
              URL.revokeObjectURL(blobUrl);
              resolve(b);
            }, 'image/png');
          } else {
            URL.revokeObjectURL(blobUrl);
            resolve(null);
          }
        };
        img.onerror = () => {
          URL.revokeObjectURL(blobUrl);
          resolve(null);
        };
        img.src = blobUrl;
      });
      if (converted) {
        pngBlob = converted;
      }
    }

    if (navigator.clipboard && typeof window.ClipboardItem !== 'undefined') {
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': pngBlob })
      ]);
      return true;
    }
  } catch (e) {
    console.warn('Clipboard write image failed:', e);
  }
  return false;
}

export function isWebShareFileSupported(): boolean {
  try {
    if (typeof navigator !== 'undefined' && navigator.share && navigator.canShare) {
      const testFile = new File(['test'], 'test.png', { type: 'image/png' });
      return navigator.canShare({ files: [testFile] });
    }
  } catch {
    return false;
  }
  return false;
}

export async function shareImageFile(title: string, imageUrl: string, text?: string): Promise<boolean> {
  try {
    if (typeof navigator !== 'undefined' && navigator.share) {
      const blob = await getImageBlob(imageUrl);
      if (!blob) return false;

      const cleanTitle = (title || 'Card_WhatsApp').replace(/[^a-zA-Z0-9_-]/g, '_');
      const file = new File([blob], `${cleanTitle}.png`, { type: 'image/png' });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: title || 'Card de Agendamento',
          text: text || '',
          files: [file]
        });
        return true;
      } else if (navigator.canShare && navigator.canShare({ text })) {
        await navigator.share({
          title: title || 'Card de Agendamento',
          text: text || ''
        });
        return true;
      }
    }
  } catch (e) {
    console.log('Web Share not executed or dismissed:', e);
  }
  return false;
}

export function downloadImageFile(imageUrl: string, filename = 'card-whatsapp.png'): boolean {
  try {
    const a = document.createElement('a');
    a.href = imageUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    return true;
  } catch (e) {
    console.error('Failed to download image:', e);
    return false;
  }
}

export function formatCardWhatsAppMessage(cards: { title: string; imageUrl: string }[]): string {
  if (cards.length === 0) return '';

  const cardListText = cards.map((c) => {
    if (c.imageUrl.startsWith('http://') || c.imageUrl.startsWith('https://')) {
      return `📸 *${c.title}*\n${c.imageUrl}`;
    } else {
      return `📸 *${c.title}*\n_(Foto anexada - caso não apareça, toque no anexo 📎 para enviar da galeria)_`;
    }
  }).join('\n\n');

  return `Confira os cards selecionados:\n\n${cardListText}`;
}
