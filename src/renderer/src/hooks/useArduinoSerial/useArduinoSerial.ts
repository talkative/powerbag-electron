/* eslint-disable @typescript-eslint/explicit-function-return-type */
import { useCallback, useRef } from 'react'

export function useArduinoSerial() {
  const portRef = useRef<SerialPort | null>(null)
  const writerRef = useRef<WritableStreamDefaultWriter<Uint8Array> | null>(null)

  const openIfNeeded = useCallback(async () => {
    if (!portRef.current) return
    if (!portRef.current.readable || !portRef.current.writable) {
      await portRef.current.open({ baudRate: 115200 })
    }
    if (!writerRef.current) {
      writerRef.current = portRef.current.writable!.getWriter()
    }
  }, [])

  const ensureConnection = useCallback(
    async ({ userGesture = false }: { userGesture?: boolean } = {}) => {
      if (typeof navigator === 'undefined') return false
      const nav = navigator
      if (!nav.serial) return false

      if (writerRef.current) return true

      if (!portRef.current) {
        const ports = await nav.serial.getPorts()
        if (ports.length > 0) portRef.current = ports[0]
      }

      if (!portRef.current && userGesture) {
        portRef.current = await nav.serial.requestPort()
      }

      if (!portRef.current) return false

      await openIfNeeded()
      return true
    },
    [openIfNeeded]
  )

  const sendArduinoEvent = useCallback(
    async (payload: string | Uint8Array) => {
      const ok = await ensureConnection({ userGesture: false })
      if (!ok || !writerRef.current) return

      const bytes = typeof payload === 'string' ? new TextEncoder().encode(payload) : payload

      await writerRef.current.write(bytes)
    },
    [ensureConnection]
  )

  return { ensureConnection, sendArduinoEvent }
}
