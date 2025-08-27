import React, { useState } from 'react'

import { cx } from '../../utils/cx'

interface ImageProps {
  src: string
  alt: string
  className?: string
  imageClassName?: string
  aspect?: string
}

const ImageComponent: React.FC<ImageProps> = ({
  src,
  alt,
  className = 'w-full',
  imageClassName,
  aspect = 'aspect-square'
}) => {
  const [isLoading, setIsLoading] = useState(true)
  const [isError, setIsError] = useState(false)

  return (
    <div className={cx('relative bg-gray-100', aspect, className)}>
      {isError && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-gray-500 italic">Error</span>
        </div>
      )}

      <img
        className={cx(
          'opacity-0 transition-opacity object-contain',
          {
            'opacity-100': !isLoading && !isError
          },
          aspect,
          imageClassName
        )}
        height="100%"
        width="100%"
        onLoad={() => setIsLoading(false)}
        onError={() => setIsError(true)}
        src={src}
        alt={alt}
      />
    </div>
  )
}

export default ImageComponent
