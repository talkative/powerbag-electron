/* eslint-disable @typescript-eslint/explicit-function-return-type */
import { useCallback, useRef } from 'react'

// Types for the preload API
type SerialDevice = {
  path: string
  manufacturer: string
  vendorId: string
  productId: string
  isArduino: boolean
  friendly: string
}
declare global {
  interface Window {
    serial?: {
      list: () => Promise<SerialDevice[]>
      open: (path: string, baudRate?: number) => Promise<boolean>
      write: (data: Uint8Array | string) => Promise<boolean>
      close: () => Promise<boolean>
    }
  }
}

export function useArduinoSerial() {
  const isOpenRef = useRef(false)
  const portPathRef = useRef<string | null>(null)

  const ensureConnection = useCallback(async ({ baudRate = 115200 } = {}) => {
    if (!window.serial) {
      console.warn('[ArduinoSerial] IPC serial API missing (preload not loaded)')
      return false
    }
    if (isOpenRef.current) return true

    // List ports and auto-pick Arduino if present, else first port
    const ports = await window.serial.list()
    if (!ports.length) {
      console.warn('[ArduinoSerial] No serial ports found')
      return false
    }
    const arduino = ports.find((p) => p.isArduino) ?? ports[0]
    const ok = await window.serial.open(arduino.path, baudRate)
    if (ok) {
      portPathRef.current = arduino.path
      isOpenRef.current = true
      console.log('[ArduinoSerial] Connected via', arduino.friendly)
    }
    return ok
  }, [])

  const sendArduinoEvent = useCallback(
    async (payload: string | Uint8Array) => {
      if (!window.serial) return false
      const ok = await ensureConnection()
      if (!ok) return false
      const res = await window.serial.write(payload)
      if (!res) console.warn('[ArduinoSerial] write failed')
      return res
    },
    [ensureConnection]
  )

  const close = useCallback(async () => {
    if (!window.serial) return
    await window.serial.close()
    isOpenRef.current = false
    portPathRef.current = null
    console.log('[ArduinoSerial] Disconnected')
  }, [])

  return { ensureConnection, sendArduinoEvent, close }
}
