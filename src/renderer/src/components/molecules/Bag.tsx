/* eslint-disable @typescript-eslint/explicit-function-return-type */
import { motion } from 'framer-motion'

import Image from './Image'
import Video from './Video'

import { useAudioContext } from '../../stores/AudioProvider'
import { cx } from '../../utils/cx'

import type { Bag as BagType } from '../../types'

interface BagComponentType extends BagType {
  className?: string
  winningBag: boolean
  borderColor?: string
}

const variants = {
  wiggle: {
    scale: [1, 1.03],
    rotate: [0, 5, -5, 0],
    opacity: 1,
    transition: {
      scale: { duration: 0.6 },
      rotate: {
        delay: 0.6,
        duration: 0.3,
        yoyo: Infinity,
        repeat: Infinity,
        repeatDelay: 0.3
      }
    }
  },
  highlighted: {
    opacity: 1,
    scale: 1.03,
    transition: { duration: 0.6 }
  },
  pulse: {
    opacity: 1,
    scale: [1, 1.03, 1],
    transition: {
      scale: {
        duration: 1,
        yoyo: Infinity,
        repeat: Infinity
      }
    }
  },
  default: {
    opacity: 1,
    scale: 1
  }
}

const opacityVariants = {
  default: {
    opacity: 1
  },
  active: { opacity: 1 }
}

const Bag = ({ className, winningBag, borderColor = 'red', ...bag }: BagComponentType) => {
  const { highlightedBags, wigglingBags, pulsingBags, videoBags, animatedBags, isPlaying } =
    useAudioContext()

  const isAnimatable = winningBag

  return (
    <motion.div
      className={cx(
        'bg-transparent flex items-center justify-center text-white overflow-hidden w-full border-2 lg:border-[3px] border-dashed rounded-xl shadow-md',

        {
          'border-primary': borderColor == 'red',
          'border-purple': borderColor == 'purple',
          'border-secondary': borderColor == 'green',
          'border-blue-500': borderColor == 'blue',
          'border-gray-400': borderColor == 'gray'
        },
        className
      )}
      variants={variants}
      initial={{ opacity: 0 }}
      animate={
        isAnimatable
          ? wigglingBags.includes(bag.id)
            ? 'wiggle'
            : pulsingBags.includes(bag.id)
              ? 'pulse'
              : highlightedBags.includes(bag.id) ||
                  videoBags.includes(bag.id) ||
                  animatedBags.includes(bag.id)
                ? 'highlighted'
                : 'default'
          : 'default'
      }
    >
      <motion.div
        className="w-full h-full relative"
        variants={opacityVariants}
        animate={
          isAnimatable &&
          [
            ...wigglingBags,
            ...highlightedBags,
            ...pulsingBags,
            ...videoBags,
            ...animatedBags
          ].includes(bag.id)
            ? 'active'
            : 'default'
        }
      >
        <Image
          className={cx('w-full h-full bg-transparent opacity-100 transition-opacity rounded-md', {
            'opacity-0':
              isAnimatable && (videoBags.includes(bag.id) || animatedBags.includes(bag.id))
          })}
          src={bag.imageUrl}
          alt="Bag Image"
        />
        {bag.videoUrl && isAnimatable ? (
          <Video
            className={cx('w-full h-full bg-black absolute inset-0 opacity-0 rounded-md', {
              'opacity-100': videoBags.includes(bag.id)
            })}
            backgroundClassName="bg-black"
            src={bag.videoUrl}
            playsInline
            playing={isPlaying}
            muted
            loop
            aspect="aspect-square"
          />
        ) : null}
      </motion.div>
    </motion.div>
  )
}

export default Bag
