import { useState, useEffect, useRef } from 'react';
import { Loader2, ImageOff } from 'lucide-react';

interface ImageThumbnailProps {
  fetchBlob: () => Promise<Blob>;
  alt: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

/**
 * Lazy-loading image thumbnail component.
 * Fetches image blob via provided callback, displays as thumbnail.
 * Revokes object URL on unmount to prevent memory leaks.
 */
export function ImageThumbnail({ fetchBlob, alt, className = '', size = 'md' }: ImageThumbnailProps) {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const urlRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    setLoading(true);
    setError(false);

    fetchBlob()
      .then((blob) => {
        if (cancelled) return;
        const objectUrl = URL.createObjectURL(blob);
        urlRef.current = objectUrl;
        setUrl(objectUrl);
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setError(true);
        setLoading(false);
      });

    return () => {
      cancelled = true;
      if (urlRef.current) {
        URL.revokeObjectURL(urlRef.current);
        urlRef.current = null;
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-10 h-10',
  };

  const containerClass = `${sizeClasses[size]} rounded overflow-hidden flex-shrink-0 flex items-center justify-center bg-gray-100 dark:bg-gray-700 ${className}`;

  if (loading) {
    return (
      <div className={containerClass}>
        <Loader2 className="w-3 h-3 animate-spin text-gray-400" />
      </div>
    );
  }

  if (error || !url) {
    return (
      <div className={containerClass}>
        <ImageOff className="w-3 h-3 text-gray-400" />
      </div>
    );
  }

  return (
    <img
      src={url}
      alt={alt}
      className={`${sizeClasses[size]} rounded object-cover flex-shrink-0 ${className}`}
    />
  );
}
