import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

interface OptimizedImageProps {
  src: string;
  alt: string;
  width: number;
  height: number;
  quality?: number;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export function OptimizedImage({ src, alt, width, height, quality = 85 }: OptimizedImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const optimizedSrc = `${API_URL}/api/optimizeImage?src=${encodeURIComponent(src)}&width=${width}&quality=${quality}`;

    const img = new Image();
    img.src = optimizedSrc;
    img.onload = () => {
      setIsLoaded(true);
      setError(null);
      if (imgRef.current) {
        imgRef.current.src = optimizedSrc;
      }
    };
    img.onerror = () => {
      console.error(`Failed to load optimized image: ${optimizedSrc}`);
      setIsLoaded(true);
      setError('Failed to load image');
      if (imgRef.current) {
        imgRef.current.src = `${API_URL}${src}`;
      }
    };

    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [src, width, quality]);

  return (
      <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: isLoaded ? 1 : 0 }}
          transition={{ duration: 0.3 }}
          style={{ width, height, overflow: 'hidden', position: 'relative' }}
      >
        <img
            ref={imgRef}
            alt={alt}
            width={width}
            height={height}
            style={{
              objectFit: 'cover',
              width: '100%',
              height: '100%',
              filter: isLoaded ? 'none' : 'blur(10px)',
              transition: 'filter 0.3s ease-out',
            }}
        />
        {!isLoaded && (
            <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)',
                  backgroundSize: '200% 100%',
                  animation: 'shimmer 1.5s infinite',
                }}
            />
        )}
        {error && (
            <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'rgba(0, 0, 0, 0.1)',
                  color: 'red',
                  fontSize: '12px',
                  textAlign: 'center',
                  padding: '4px',
                }}
            >
              {error}
            </div>
        )}
      </motion.div>
  );
}

