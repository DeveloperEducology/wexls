'use client';

import Image from 'next/image';

const ALLOWED_REMOTE_HOSTS = new Set([
  'cdn-icons-png.flaticon.com',
  'plus.unsplash.com',
  'images.unsplash.com',
  'pub-6d655d3564544704a2d99beb0760355e.r2.dev',
]);

function canUseNextImage(src) {
  if (typeof src !== 'string' || !src.trim()) return false;

  const value = src.trim();
  if (value.startsWith('/')) return true;
  if (value.startsWith('data:image/')) return false;

  try {
    const parsed = new URL(value);
    if (!/^https?:$/i.test(parsed.protocol)) return false;
    return ALLOWED_REMOTE_HOSTS.has(parsed.hostname);
  } catch {
    return false;
  }
}

export default function SafeImage({
  src,
  alt,
  width,
  height,
  className,
  sizes,
  style,
  priority = false,
  loading = 'lazy',
}) {
  if (!src) return null;

  if (canUseNextImage(src)) {
    return (
      <Image
        src={src}
        alt={alt || ''}
        width={width}
        height={height}
        className={className}
        sizes={sizes}
        style={style}
        priority={priority}
        loading={priority ? 'eager' : loading}
      />
    );
  }

  return (
    <img
      src={src}
      alt={alt || ''}
      width={width}
      height={height}
      className={className}
      style={style}
      loading={priority ? 'eager' : loading}
    />
  );
}
