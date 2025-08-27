/* eslint-disable @typescript-eslint/explicit-function-return-type */
/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useRef, useEffect } from 'react'
import { Howl } from 'howler'

import type { Story, StoryLine, Bag } from '../types'

type AudioContextType = {
  onPlay: () => void
  onPause: () => void
  onTogglePlay: () => void
  onNextStory: () => void
  onPreviousStory: () => void
  onEnded: () => void
  getNextStory: () => Promise<{
    nextStory: Story
    nextStoryLine: StoryLine
    bags: { firstColumn: Bag[]; secondColumn: Bag[]; thirdColumn: Bag[] }
  }>
  setAttemptsToWin: () => void
  registerEvent: (
    event: string | string[],
    currentStory?: Story | Story[],
    storyLinetitle?: string | string[]
  ) => void
  attemptsToWin: number
  totalStories: number
  story: Story
  storylineTitle: string
  storyIndex: number
  bagsToBeSelected: string[]
  previousDisabled: boolean
  nextDisabled: boolean
  hasReachedEnd: boolean
  highlightedBags: string[]
  wigglingBags: string[]
  pulsingBags: string[]
  videoBags: string[]
  animatedBags: string[]
  isPlaying: boolean
  kiosk: boolean
}

type AudioProviderType = {
  children: React.ReactNode | React.ReactNode[]
  storylineTitle: string
  story: Story
  totalStories: number
  storyIndex: number
  kiosk: boolean
  audio: Howl | null
  bagsToBeSelected: string[]
  onNextStory: () => {
    nextStory: Story
    nextStoryLine: StoryLine
    bags: { firstColumn: Bag[]; secondColumn: Bag[]; thirdColumn: Bag[] }
  }
  onPreviousStory: () => void
  previousDisabled: boolean
  nextDisabled: boolean
}

const getRandomAttemptsToWin = () => Math.floor(Math.random() * 3) + 1

export const AudioContext = createContext<AudioContextType | null>(null)

let timeUpdateInterval: NodeJS.Timeout | null = null

export const AudioProvider = ({
  children,
  storylineTitle,
  story,
  totalStories,
  storyIndex,
  previousDisabled,
  nextDisabled,
  kiosk,
  audio,
  bagsToBeSelected,
  onNextStory,
  onPreviousStory
}: AudioProviderType) => {
  const attemptsToWin = useRef<number>(getRandomAttemptsToWin())

  const [isPlaying, setIsPlaying] = useState(false),
    [hasReachedEnd, setHasReachedEnd] = useState(false),
    [wigglingBags, setWigglingBags] = useState<string[]>([]),
    [highlightedBags, setHighlightedBags] = useState<string[]>([]),
    [pulsingBags, setPulsingBags] = useState<string[]>([]),
    [videoBags, setVideoBags] = useState<string[]>([]),
    [animatedBags, setAnimatedBags] = useState<string[]>([])

  const registerEvent = (
    _event: string | string[],
    _story?: Story | Story[],
    _storylineTitle?: string | string[]
  ) => {
    _story = _story ?? story
    _storylineTitle = _storylineTitle ?? storylineTitle

    const date = new Date().toISOString()

    const event = {
      event: _event,
      timestamp: date,
      storyId: Array.isArray(_story) ? _story.map((s) => s.id) : _story.id,
      storylineTitle: _storylineTitle
    }

    console.log('register kiosk event', event)

    // submit(event, {
    //   method: 'post',
    //   action: '/register-event',
    //   preventScrollReset: false
    // })
  }

  const handleTogglePlay = () => {
    if (!audio) return

    if (isPlaying) {
      audio.pause()
    } else {
      audio.play()
    }
  }

  const handlePlay = async () => {
      if (!audio) return

      audio.play()
    },
    handlePause = () => {
      if (!audio) return

      if (timeUpdateInterval) {
        clearInterval(timeUpdateInterval)
      }

      audio.pause()
    },
    handleLoadedMetadata = () => {
      if (!audio) return

      console.log('duration', audio.duration())
    },
    handleAudioPlaying = () => {
      setIsPlaying(true)
      setHasReachedEnd(false)
    },
    handleStop = () => {
      if (timeUpdateInterval) {
        clearInterval(timeUpdateInterval)
      }
      setIsPlaying(false)
    },
    handleTimeUpdate = () => {
      if (!audio) return

      const currentTime = Math.floor(audio.seek())

      let _highlightedBags: string[] = [],
        _wigglingBags: string[] = [],
        _pulsingBags: string[] = [],
        _videoBags: string[] = [],
        _animatedBags: string[] = []

      const currentEvents = story.events.filter((event) =>
        event.stop
          ? event.start <= currentTime && currentTime <= event.stop
          : event.start <= currentTime
      )

      currentEvents.forEach((event) => {
        const bags = event.bags ?? []

        if (event.action === 'highlight') {
          _highlightedBags = [..._highlightedBags, ...bags]
        }

        if (event.action === 'wiggle') {
          _wigglingBags = [..._wigglingBags, ...bags]
        }

        if (event.action === 'pulse') {
          _pulsingBags = [..._pulsingBags, ...bags]
        }

        if (event.action === 'video') {
          _videoBags = [..._videoBags, ...bags]
        }

        if (event.action === 'animation') {
          _animatedBags = [..._animatedBags, ...bags]
        }
      })

      setHighlightedBags(_highlightedBags)
      setWigglingBags(_wigglingBags)
      setPulsingBags(_pulsingBags)
      setVideoBags(_videoBags)
      setAnimatedBags(_animatedBags)
    },
    handleEnded = () => {
      setHasReachedEnd(true)

      console.log('ended!')

      registerEvent('story-ended')

      onNextStory()

      reset()
    },
    getNextStory = async () => {
      setHasReachedEnd(true)

      const { nextStory, nextStoryLine, bags } = onNextStory()

      reset()

      return { nextStory, nextStoryLine, bags }
    },
    setAttemptsToWin = () => {
      attemptsToWin.current = getRandomAttemptsToWin()
    }

  const reset = () => {
    if (audio) {
      audio.stop()
    }

    setIsPlaying(false)
    setHasReachedEnd(false)
    setHighlightedBags([])
    setWigglingBags([])
    setPulsingBags([])
    setVideoBags([])
    setAnimatedBags([])
  }

  useEffect(() => {
    if (!audio) return

    audio.on('load', handleLoadedMetadata)
    audio.on('play', () => {
      if (timeUpdateInterval) clearInterval(timeUpdateInterval)
      timeUpdateInterval = setInterval(handleTimeUpdate, 1000)
    })
    audio.on('play', handleAudioPlaying)
    audio.on('stop', handleStop)
    audio.on('pause', handlePause)
    audio.on('end', handleEnded)

    return () => {
      if (timeUpdateInterval) {
        clearInterval(timeUpdateInterval)
      }

      audio.off('load', handleLoadedMetadata)
      audio.off('play', handleAudioPlaying)
      audio.off('stop', handleStop)
      audio.off('pause', handlePause)
      audio.off('end', handleEnded)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audio])

  const values = {
    onPlay: handlePlay,
    onPause: handlePause,
    onTogglePlay: handleTogglePlay,
    onNextStory,
    onPreviousStory,
    onEnded: handleEnded,
    getNextStory,
    setAttemptsToWin,
    registerEvent,
    attemptsToWin: attemptsToWin.current,
    bagsToBeSelected,
    totalStories,
    story,
    storylineTitle,
    storyIndex,
    previousDisabled,
    nextDisabled,
    hasReachedEnd,
    highlightedBags,
    wigglingBags,
    pulsingBags,
    videoBags,
    animatedBags,
    isPlaying,
    kiosk
  }

  return <AudioContext.Provider value={values}>{children}</AudioContext.Provider>
}

export const useAudioContext = () => {
  const context = useContext(AudioContext)

  if (!context) {
    throw new Error('useAudioContext must be used within the correct provider')
  }

  return context
}
