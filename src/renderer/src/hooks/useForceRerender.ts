/* eslint-disable @typescript-eslint/explicit-function-return-type */
import { useState, useCallback } from 'react'

const useForceRerender = () => {
  const [, setTick] = useState(0)

  const forceRerender = useCallback(() => {
    return new Promise<void>((resolve) => {
      setTick((tick) => {
        resolve()
        console.log('Rerendered!', tick)

        return tick + 1
      })
    })
  }, [])

  return forceRerender
}

export default useForceRerender
