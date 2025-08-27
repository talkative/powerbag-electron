/* eslint-disable @typescript-eslint/explicit-function-return-type */
import { useState, useEffect, useRef, forwardRef, useCallback, useImperativeHandle } from 'react'
import { useResizeDetector } from 'react-resize-detector'
import { Howl } from 'howler'

import Autoscroll from 'embla-carousel-auto-scroll'

import { Carousel, CarouselContent, CarouselItem, CarouselApi } from '../Carousel'

import BagItem from '../../../molecules/Bag'

// import PlayButton from '~/components/atoms/PlayButton'
// import KioskButton from '~/components/atoms/KioskButton'
// import SpinButton from '~/components/atoms/SpinButton'

import { useArduinoSerial } from '../../../../hooks/useArduinoSerial/useArduinoSerial'
import { useAudioContext } from '../../../../stores/AudioProvider'
import useForceRerender from '../../../../hooks/useForceRerender'

import { cx } from '../../../../utils/cx'
import { delay } from '../../../../utils/helpers'
import eventBus from '../../../../utils/eventBus'

import type { AutoScrollType } from 'embla-carousel-auto-scroll'
import type { Bag } from '../../../../types'

type ReelRefType = {
  spin: () => void
  stop: (stopAt: number) => Promise<boolean>
  isSpinning: () => boolean
}

const borderColors = ['blue', 'green', 'gray', 'purple']

const Reel = forwardRef(
  (
    {
      bags,
      winningBag,
      columnIndex
    }: {
      bags: Bag[]
      winningBag: number
      columnIndex: number
    },
    ref: React.Ref<ReelRefType>
  ) => {
    const [api, setApi] = useState<CarouselApi>(),
      [stopAt, setStopAt] = useState<number | null>(null)

    const stoppingTimestamp = useRef(0)

    const autoScroll = useRef<AutoScrollType | null>(null)

    const stopFlag = useRef(false),
      stopped = useRef(false)

    const handleSpin = () => {
        if (!autoScroll.current) return

        stopFlag.current = false
        stopped.current = false
        autoScroll.current.play()
      },
      handleStop = async (stopAt: number) => {
        stopFlag.current = true

        stoppingTimestamp.current = Date.now()

        setStopAt(stopAt)

        while (!stopped.current) {
          // Wait for 100ms before the next check
          await delay(100)
        }

        return Promise.resolve(true)
      }

    const handleSlidesInView = useCallback(
      (api: CarouselApi) => {
        if (!api || stopFlag.current === false || stopAt == null) return

        const scrollSnapList = api.scrollSnapList()
        const scrollProgress = api.scrollProgress()

        let aimValue = scrollSnapList[stopAt]

        const stoppingFallback = Date.now() - stoppingTimestamp.current > 3000

        const threshold = scrollSnapList.length < 10 ? 0.15 : 0.1

        if (Object.is(aimValue, -0) || aimValue === 0) {
          aimValue = 0.1
        }

        if (
          (stopFlag.current === true &&
            scrollProgress < aimValue &&
            Math.abs(scrollProgress - aimValue) <= threshold) ||
          stoppingFallback
        ) {
          stopped.current = true
          autoScroll.current?.stop()

          api.scrollTo(stopAt)
        }
      },
      [stopAt]
    )

    const checkIfSpinning = () => {
      if (!autoScroll.current) return false

      return autoScroll.current.isPlaying()
    }

    useImperativeHandle(ref, () => ({
      spin: handleSpin,
      stop: handleStop,
      isSpinning: checkIfSpinning
    }))

    useEffect(() => {
      if (api) {
        api.on('slidesInView', handleSlidesInView)
        autoScroll.current = api.plugins().autoScroll as AutoScrollType
      }

      return () => {
        api?.off('slidesInView', handleSlidesInView)
        stopped.current = false
        autoScroll.current = null
      }
    }, [api, handleSlidesInView])

    return (
      <Carousel
        setApi={setApi}
        className="h-full w-1/3"
        orientation="vertical"
        opts={{
          loop: true,
          align: 'center',
          watchDrag: false,
          duration: 20
        }}
        plugins={[
          Autoscroll({
            speed: 40,
            stopOnInteraction: false,
            startDelay: 0,
            direction: 'forward',
            playOnInit: false
          })
        ]}
      >
        <CarouselContent className="h-full w-full">
          {bags.map((bag, index) => (
            <CarouselItem key={bag.id} className={cx('p-1 md:p-2 aspect-square basis-auto')}>
              <BagItem
                {...bag}
                borderColor={borderColors[(index + columnIndex) % borderColors.length]}
                className={cx({
                  'border-solid border-primary border-[3px] lg:border-[5px]': index === winningBag
                })}
                winningBag={index === winningBag}
              />
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>
    )
  }
)

Reel.displayName = 'Reel'

const generateUniqueRandomArray = (excludedArray: number[], reelsLength: number[]) => {
  const generateRandomNumber = (maxValue: number) => Math.floor(Math.random() * maxValue)

  let newArray: number[] = []
  do {
    newArray = [
      generateRandomNumber(reelsLength[0]),
      generateRandomNumber(reelsLength[1]),
      generateRandomNumber(reelsLength[2])
    ]
  } while (JSON.stringify(newArray) === JSON.stringify(excludedArray))

  return newArray
}

const getRandomAttemptsToWin = () => Math.floor(Math.random() * 3) + 1

const getWinningBags = ({
  reels,
  bagsToBeSelected
}: {
  reels: Bag[][]
  bagsToBeSelected: string[]
}) =>
  reels.reduce((acc: number[], reel: Bag[], index: number) => {
    const stopAt = reel.findIndex((b) => b.id === bagsToBeSelected[index])

    return [...acc, stopAt]
  }, [])

const SlotMachine = ({
  columns
}: {
  columns: { firstColumn: Bag[]; secondColumn: Bag[]; thirdColumn: Bag[] }
}) => {
  const reels = Object.values(columns)

  const attemptsToWin = useRef<number>(getRandomAttemptsToWin())

  const forceRerender = useForceRerender()
  const { sendArduinoEvent } = useArduinoSerial()

  function sendIdleEvent() {
    sendArduinoEvent('i')
  }

  function sendOffEvent() {
    sendArduinoEvent('o')
  }

  const setAttemptsToWin = () => {
    console.log('SETTING NEW ATTEMPTS!')

    attemptsToWin.current = getRandomAttemptsToWin()
  }

  const {
    story,
    storylineTitle,
    storyIndex,
    bagsToBeSelected,
    isPlaying,
    kiosk,
    registerEvent,
    onPlay,
    getNextStory
  } = useAudioContext()

  const { ref, height, width } = useResizeDetector()
  const aspectRatio = 3.4 / 3

  const reelRefs = useRef<ReelRefType[]>([])

  const winningSoundRef = useRef<Howl | undefined>(undefined),
    reelStopSoundRefs = useRef<Howl[] | undefined>(undefined),
    slotMachineSoundRef = useRef<Howl | undefined>(undefined)

  const playSound = (type: 'start' | 'reel-stop' | 'win', index?: number | null) => {
    let audio: Howl | undefined = undefined

    switch (type) {
      case 'start':
        audio = slotMachineSoundRef.current
        break
      case 'reel-stop':
        audio = index ? reelStopSoundRefs.current?.[index] : reelStopSoundRefs.current?.[0]
        break
      case 'win':
        audio = winningSoundRef.current
        break
    }

    if (!audio) return

    audio.play()
  }

  const [isRunning, setIsRunning] = useState(false),
    [didWin, setDidWin] = useState(false),
    [attempt, setAttempt] = useState(0)

  const [playAfterWin, setPlayAfterWin] = useState(false)

  const audioPlayRef = useRef<NodeJS.Timeout | null>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  let winningBags = getWinningBags({ reels, bagsToBeSelected })

  const setRef = (ref: ReelRefType | null, index: number) => {
    if (ref && !reelRefs.current[index]) {
      reelRefs.current[index] = ref
    }
  }

  const handleWin = async () => {
      playSound('win')

      await sendArduinoEvent('w')
      setAttemptsToWin()
      setAttempt(0)
      setDidWin(true)

      eventBus.dispatch('onWinning')

      if (kiosk) {
        console.log('setting play after win')

        setPlayAfterWin(true)
      }
    },
    handleLost = () => {
      eventBus.dispatch('onLosing')
    }

  const handlePlay = async () => {
    onPlay()

    registerEvent('story-played')
    if (kiosk) {
      // sendRaspberryEvent('on')
    } else {
      setDidWin(false)
    }
  }

  const runSlotMachine = async (isPlayingTrack: boolean = false) => {
    setIsRunning(true)
    setDidWin(false)

    // if (kiosk) sendRaspberryEvent('off')

    if (audioPlayRef.current) {
      clearTimeout(audioPlayRef.current)
      audioPlayRef.current = null
    }

    // if (showKioskButtonTimer.current) {
    //   clearTimeout(showKioskButtonTimer.current);
    //   showKioskButtonTimer.current = undefined;
    // }

    if (isPlayingTrack || playAfterWin) {
      setPlayAfterWin(false)

      const { nextStory, nextStoryLine, bags } = await getNextStory()

      await forceRerender()

      winningBags = getWinningBags({
        reels: Object.values(bags),
        bagsToBeSelected: nextStory?.selectedBags
      })

      registerEvent(
        ['story-cancelled', 'spin'],
        [story, nextStory],
        [storylineTitle, nextStoryLine.title]
      )
    } else {
      registerEvent('spin')
    }

    reelRefs.current.forEach((reel) => {
      reel.spin()
    })

    const currentAttempt = attempt + 1

    const timeToWin = currentAttempt == attemptsToWin.current ? true : false
    const reelsLength = reels.map((reel) => reel.length)

    const bagsToBeStoppedAt = timeToWin
      ? winningBags
      : generateUniqueRandomArray(winningBags, reelsLength)

    await delay(1000)

    for (let index = 0; index < reelRefs.current.length; index++) {
      const reel = reelRefs.current[index]

      const stopAt = bagsToBeStoppedAt[index]

      if (!reel.isSpinning()) continue

      await reel.stop(stopAt)

      // if (kiosk) sendRaspberryEvent('reel-stop')

      playSound('reel-stop', index)

      await delay(600)
    }

    if (intervalRef.current) clearInterval(intervalRef.current)

    setAttempt(currentAttempt)
    setIsRunning(false)

    if (timeToWin) {
      handleWin()
    } else {
      handleLost()
    }

    return Promise.resolve()
  }

  const handleRunSlotMachine = async (isPlayingTrack: boolean = false) => {
    playSound('start')
    console.log('[SlotMachine] handleRunSlotMachine ->')
    await runSlotMachine(isPlayingTrack)
  }

  const handleSpaceClick = (event: KeyboardEvent) => {
    if (isRunning) return

    const { key } = event

    if (key == 'r') {
      handleReloadApp()
      return
    }
    if (key == ' ') {
      if (didWin && !isPlaying && !kiosk) {
        handlePlay()

        return
      }

      handleRunSlotMachine(isPlaying)
    }
  }

  function handleReloadApp() {
    console.log('running')
    location.reload()
  }

  useEffect(() => {
    console.log('isRunning:', isRunning)
    if (isRunning) {
      sendOffEvent()
    } else {
      if (!didWin) {
        sendIdleEvent()
      }
    }
  }, [isRunning, didWin])

  useEffect(() => {
    winningSoundRef.current = new Howl({
      src: 'assets/audio/jackpot.mp3',
      preload: true
    })
    reelStopSoundRefs.current = [
      new Howl({ src: 'assets/audio/timbale-hit.mp3', preload: true }),
      new Howl({ src: 'assets/audio/timbale-hit.mp3', preload: true }),
      new Howl({ src: 'assets/audio/timbale-hit.mp3', preload: true })
    ]
    slotMachineSoundRef.current = new Howl({
      src: 'assets/audio/vibraslap.mp3',
      preload: true
    })
  }, [])

  useEffect(() => {
    if (playAfterWin) {
      audioPlayRef.current = setTimeout(() => {
        handlePlay()
        setPlayAfterWin(false)
      }, 4000)

      return () => {
        if (audioPlayRef.current) {
          clearTimeout(audioPlayRef.current)
          audioPlayRef.current = null
        }
      }
    }

    return () => {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playAfterWin])

  useEffect(() => {
    document.addEventListener('keydown', handleSpaceClick)

    return () => {
      document.removeEventListener('keydown', handleSpaceClick)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    storyIndex,
    attempt,
    attemptsToWin.current,
    didWin,
    isPlaying,
    isRunning,
    bagsToBeSelected,
    kiosk
  ])

  return (
    <>
      <div className="flex m-auto w-full h-full max-w-8xl relative" ref={ref}>
        {height && width ? (
          <div
            style={{ aspectRatio }}
            className={cx('m-auto', {
              'w-full': width / aspectRatio < height,
              'h-full': width / aspectRatio > height
            })}
          >
            <div className="w-full h-full flex lg:flex-row flex-col space-y-6 space-x-0 lg:space-y-0 lg:space-x-12">
              <div className="grow overflow-hidden">
                <div className="flex relative h-full w-full">
                  <div className="bg-gradient-to-b from-[#e1e1e1] to-transparent absolute top-0 inset-x-0 h-10 lg:h-20 z-10" />
                  {reels.map((_, index) => (
                    <Reel
                      key={index}
                      ref={(ref) => setRef(ref, index)}
                      winningBag={winningBags[index]}
                      bags={reels[index]}
                      columnIndex={index}
                    />
                  ))}
                  <div className="bg-gradient-to-t from-[#e1e1e1] to-transparent absolute bottom-0 inset-x-0 h-10 lg:h-30 z-10" />
                </div>
              </div>
            </div>
          </div>
        ) : null}
        {/* {!kiosk ? (
          <div className="fixed bottom-0 z-20 left-1/2 transform -translate-x-1/2 flex">
            <PlayButton
              className="mb-4 lg:mb-6"
              show={!isRunning && didWin && !isPlaying}
              disabled={isRunning}
              onClick={handlePlay}
            />
            <SpinButton
              wrapperClassName="absolute left-0"
              className="mb-4 lg:mb-6"
              show={!isRunning && !didWin}
              disabled={isRunning}
              onClick={() => handleRunSlotMachine(isPlaying)}
            />
          </div>
        ) : (
          <div className="fixed top-1/2 -translate-y-1/2 z-20 right-20 flex">
            <KioskButton
              className="mb-4 lg:mb-6"
              show={(!isRunning && !didWin && !isPlaying) || showKioskButtonAfterWin}
              disabled={isRunning}
              type="spin"
              onClick={() => handleRunSlotMachine(isPlaying)}
            />
          </div>
        )} */}
      </div>
      <div className="z-50">
        {/* <ParticleExplosion explode={didWin || (kiosk && isPlaying)} /> */}
      </div>
    </>
  )
}

export default SlotMachine
