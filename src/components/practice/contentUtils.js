export function isInlineSvg(value) {
  return typeof value === 'string' && value.trim().toLowerCase().startsWith('<svg');
}

export function isImageUrl(value) {
  if (typeof value !== 'string') return false;
  const candidate = value.trim();
  if (!candidate) return false;

  if (candidate.startsWith('data:image/')) return true;
  if (candidate.startsWith('/')) return true;
  if (/^https?:\/\//i.test(candidate)) return true;

  return /\.(png|jpe?g|gif|webp|avif|bmp|svg)(\?.*)?$/i.test(candidate);
}

export function getImageSrc(value) {
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object') {
    return value.imageUrl || value.url || value.src || '';
  }
  return '';
}

export function hasInlineHtml(value) {
  if (typeof value !== 'string') return false;
  return /<\/?[a-z][\s\S]*>/i.test(value);
}

export function sanitizeInlineHtml(value) {
  if (typeof value !== 'string') return '';

  return value
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, '')
    .replace(/\son[a-z]+\s*=\s*(['"]).*?\1/gi, '')
    .replace(/\son[a-z]+\s*=\s*[^\s>]+/gi, '')
    .replace(/\s(href|src)\s*=\s*(['"])\s*javascript:[\s\S]*?\2/gi, ' $1="#"');
}
