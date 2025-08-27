import { useEffect, useState } from 'react'

import StoriesLayout from './components/organisms/StoriesLayout'

import { StoryLine } from './types'

function App(): React.JSX.Element {
  const [storyLines, setStoryLines] = useState<StoryLine[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchStoryLines = async (): Promise<void> => {
      try {
        setLoading(true)
        setError(null)

        const data = await window.electron.ipcRenderer.invoke('getStoryLines')

        setStoryLines(data)
      } catch (error) {
        setError('Failed to fetch story lines')
        console.error('Failed to fetch story lines:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchStoryLines()
  }, [])

  return (
    <div className="w-screen h-screen">
      {loading && <div className="flex items-center justify-center h-full">Loading...</div>}
      {error && <div className="flex items-center justify-center h-full">{error}</div>}
      {!loading && !error && <StoriesLayout storyLines={storyLines} />}
    </div>
  )
}

export default App
