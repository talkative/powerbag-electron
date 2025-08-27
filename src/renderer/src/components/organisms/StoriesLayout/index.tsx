/* eslint-disable @typescript-eslint/explicit-function-return-type */
import { useState, useEffect } from 'react'
import { Howl } from 'howler'

import { AudioProvider } from '../../../stores/AudioProvider'

import SlotMachine from './SlotMachine'

import type { Story, StoryLine, Bag } from '../../../types'

const shuffleStoryLines = (array: StoryLine[]) => {
  return array
    .map((value) => ({ value, sort: Math.random() }))
    .sort((a, b) => a.sort - b.sort)
    .map(({ value }) => value)
}

const shuffleStories = (array: Story[]) => {
  return array
    .map((value) => ({ value, sort: Math.random() }))
    .sort((a, b) => a.sort - b.sort)
    .map(({ value }) => value)
}

const shuffleBags = (bags: { firstColumn: Bag[]; secondColumn: Bag[]; thirdColumn: Bag[] }) => {
  const shuffle = (array: Bag[]) => {
    return array
      .map((value) => ({ value, sort: Math.random() }))
      .sort((a, b) => a.sort - b.sort)
      .map(({ value }) => value)
  }

  return {
    firstColumn: shuffle(bags.firstColumn),
    secondColumn: shuffle(bags.secondColumn),
    thirdColumn: shuffle(bags.thirdColumn)
  }
}

const StoriesLayout = ({
  storyLines: _storyLines,
  kiosk = false
}: {
  storyLines: StoryLine[]
  kiosk?: boolean
}) => {
  const [storyLines, setStoryLines] = useState(shuffleStoryLines(_storyLines))
  const [currentStoryLineIndex, setCurrentStoryLineIndex] = useState(0)

  const [audio, setAudio] = useState<Howl | null>(null),
    [bagsToBeSelected, setBagsToBeSelected] = useState<string[]>([])

  const currentStoryLine = storyLines[currentStoryLineIndex]

  const [stories, setStories] = useState(
      storyLines[currentStoryLineIndex]
        ? shuffleStories(storyLines[currentStoryLineIndex].stories)
        : []
    ),
    [bags, setBags] = useState(
      currentStoryLine?.bags
        ? shuffleBags(currentStoryLine.bags)
        : { firstColumn: [], secondColumn: [], thirdColumn: [] }
    )

  const [currentStoryIndex, setCurrentStoryIndex] = useState(0)

  const currentStory = stories.length > 0 ? stories[currentStoryIndex] : null

  const handleNextStory = () => {
      if (currentStoryIndex + 1 < stories.length) {
        setCurrentStoryIndex(currentStoryIndex + 1)

        setAudio(
          new Howl({
            src: stories[currentStoryIndex + 1].audioSrc,
            preload: true
          })
        )
        setBagsToBeSelected(stories[currentStoryIndex + 1].selectedBags)

        return {
          nextStory: stories[currentStoryIndex + 1],
          nextStoryLine: storyLines[currentStoryLineIndex],
          bags: bags
        }
      } else {
        const nextStoryLineIndex =
          storyLines.length > currentStoryLineIndex + 1 ? currentStoryLineIndex + 1 : 0

        const updatedStoryLines =
          nextStoryLineIndex == 0 ? shuffleStoryLines([...storyLines]) : storyLines

        const newSuffledStories = shuffleStories(updatedStoryLines[nextStoryLineIndex].stories)

        const newBags = shuffleBags(updatedStoryLines[nextStoryLineIndex].bags)

        setStoryLines(updatedStoryLines)
        setStories(newSuffledStories)
        setBags(newBags)
        setCurrentStoryLineIndex(nextStoryLineIndex)
        setCurrentStoryIndex(0)

        setAudio(new Howl({ src: newSuffledStories[0].audioSrc, preload: true }))
        setBagsToBeSelected(newSuffledStories[0].selectedBags)

        return {
          nextStory: newSuffledStories[0],
          nextStoryLine: updatedStoryLines[nextStoryLineIndex],
          bags: newBags
        }
      }
    },
    handlePreviousStory = () => {
      if (currentStoryIndex > 0) {
        setCurrentStoryIndex(currentStoryIndex - 1)
      }
    }

  useEffect(() => {
    if (!audio && currentStory) {
      setAudio(new Howl({ src: currentStory.audioSrc, preload: true }))
      setBagsToBeSelected(currentStory.selectedBags)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStory])

  return currentStory ? (
    <AudioProvider
      audio={audio}
      bagsToBeSelected={bagsToBeSelected}
      storylineTitle={currentStoryLine.title}
      story={currentStory}
      storyIndex={currentStoryIndex}
      totalStories={stories.length}
      kiosk={kiosk}
      onNextStory={handleNextStory}
      onPreviousStory={handlePreviousStory}
      previousDisabled={stories.findIndex((story) => story.id === currentStory.id) === 0}
      nextDisabled={
        stories.findIndex((story) => story.id === currentStory.id) === stories.length - 1
      }
    >
      <main className="w-full h-full grow overflow-hidden relative">
        <div className="absolute inset-0 bg-black/10" />
        <div className="mx-auto w-full h-full max-w-9xl grow p-4 sm:p-6 lg:px-10 lg:py-0">
          <div className="relative w-full h-full">
            <SlotMachine columns={bags} />
          </div>
        </div>
      </main>
    </AudioProvider>
  ) : (
    <div className="h-full flex items-center justify-center font-bold">No stories found</div>
  )
}

export default StoriesLayout
