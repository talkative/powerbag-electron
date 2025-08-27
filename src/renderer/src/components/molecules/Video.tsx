import React, { useState } from 'react'
import ReactPlayer from 'react-player'
import { ReactPlayerProps } from 'react-player/dist/types'

import { cx } from '../../utils/cx'

interface VideoProps extends ReactPlayerProps {
  src: string
  alt?: string
  className?: string
  aspect?: string
  backgroundClassName?: string
}

const VideoComponent: React.FC<VideoProps> = ({
  src,
  className = 'w-full',
  backgroundClassName = 'bg-transparent',
  aspect = 'aspect-[16/9]',
  loop,
  playing,
  muted,
  controls = false,
  playsInline
}) => {
  const [isLoading, setIsLoading] = useState(true)
  const [isError, setIsError] = useState(false)

  return (
    <div
      className={cx('relative bg-black w-full overflow-hidden', aspect, className, {
        'bg-transparent': !isLoading && !isError
      })}
    >
      {isError && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-gray-500 italic">Error</span>
        </div>
      )}

      <div
        className={cx(
          'opacity-0 transition-opacity w-full',
          {
            'opacity-100': !isLoading && !isError
          },
          aspect,
          backgroundClassName
        )}
      >
        <ReactPlayer
          height="100%"
          width="100%"
          src={src}
          onReady={() => setIsLoading(false)}
          onError={() => setIsError(true)}
          playsInline={playsInline}
          muted={muted}
          loop={loop}
          controls={controls}
          playing={playing}
        />
      </div>
    </div>
  )
}

export default VideoComponent
