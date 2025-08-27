// main.ts
import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import 'dotenv/config'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { SerialPort } from 'serialport'
import type { SerialPortOpenOptions } from 'serialport'

process.env.API_BASE_URL = process.env.API_BASE_URL || 'https://powerbag-api.fly.dev/api'

const getStoryLines = async (): Promise<string[]> => {
  const response = await fetch(`${process.env.API_BASE_URL}/storylines`)
  if (!response.ok) {
    console.error('Failed to fetch storylines:', response.statusText)
    throw new Error(`Failed to fetch storylines: ${response.statusText}`)
  }
  return response.json()
}

/* ------------------------------------------------------------------
   SerialPort IPC (recommended for Electron)
------------------------------------------------------------------- */
let currentPort: SerialPort | null = null
let opening = false

ipcMain.handle('serial:list', async () => {
  const ports = await SerialPort.list()
  const ARDUINO_VIDS = new Set(['2341', '2a03', '1b4f', '239a'])
  return ports.map((p) => ({
    path: p.path,
    manufacturer: p.manufacturer ?? '',
    vendorId: p.vendorId?.toLowerCase() ?? '',
    productId: p.productId?.toLowerCase() ?? '',
    isArduino: p.vendorId ? ARDUINO_VIDS.has(p.vendorId.toLowerCase()) : false,
    friendly: `${p.manufacturer ?? 'Unknown'} ${p.path}`
  }))
})

function sleep(ms: number) {
  return new Promise<void>((res) => setTimeout(res, ms))
}

ipcMain.handle(
  'serial:open',
  async (_e, { path, baudRate }: { path: string; baudRate: number }) => {
    // prevent concurrent opens from double-clicks / StrictMode
    if (opening) {
      console.log('[serial] open already in progress; ignoring')
      return currentPort?.isOpen ?? false
    }
    opening = true
    try {
      // Reuse same handle if already open on that path
      if (currentPort?.isOpen && (currentPort as any)?.path === path) {
        console.log('[serial] already open', path)
        return true
      }

      // Close any existing port first
      try {
        if (currentPort?.isOpen) {
          await new Promise<void>((resolve) => currentPort!.close(() => resolve()))
          console.log('[serial] closed previous port')
        }
      } catch (err) {
        console.warn('[serial] error closing previous port', err)
      } finally {
        currentPort = null
      }

      // Options: lock:false avoids OS lock files that can linger (macOS/Linux dev)
      const options: SerialPortOpenOptions<any> = {
        path,
        baudRate,
        autoOpen: false,
        lock: false
      }

      // Retry loop for “Resource temporarily unavailable” (EBUSY/EAGAIN/access denied)
      const maxAttempts = 6
      const backoffMs = 300
      let lastErr: any = null

      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
          currentPort = new SerialPort(options)
          await new Promise<void>((resolve, reject) =>
            currentPort!.open((err) => (err ? reject(err) : resolve()))
          )
          currentPort.on('error', (err) => console.error('[serial] error', err))
          currentPort.on('close', () => console.log('[serial] closed'))
          console.log('[serial] open', path, baudRate, `(attempt ${attempt})`)
          return true
        } catch (err: any) {
          lastErr = err
          const msg = String(err?.message || err)
          const code = String(err?.code || '')
          const transient =
            /temporarily unavailable|EBUSY|EAGAIN|resource busy|access denied/i.test(
              msg + ' ' + code
            )
          console.warn(`[serial] open failed (attempt ${attempt}/${maxAttempts}):`, msg)
          if (attempt < maxAttempts && transient) {
            await sleep(backoffMs * attempt) // linear backoff
            continue
          }
          break
        }
      }

      console.error('[serial] giving up opening port:', lastErr)
      throw lastErr
    } finally {
      opening = false
    }
  }
)

ipcMain.handle('serial:write', async (_e, data: Uint8Array | string) => {
  if (!currentPort || !currentPort.isOpen) return false
  const buf = typeof data === 'string' ? Buffer.from(data, 'utf8') : Buffer.from(data)
  await new Promise<void>((resolve, reject) => {
    currentPort!.write(buf, (err) => (err ? reject(err) : currentPort!.drain(resolve as any)))
  })
  return true
})

ipcMain.handle('serial:close', async () => {
  if (!currentPort) return true
  await new Promise<void>((resolve) => currentPort!.close(() => resolve()))
  currentPort = null
  return true
})

function createWindow(): void {
  const preloadPath = join(__dirname, '../preload/index.js')
  console.log('[main] using preload ->', preloadPath)

  const mainWindow = new BrowserWindow({
    width: 1920,
    height: 1080,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    console.log('[main] ready-to-show')
    mainWindow.show()
  })

  // After load, verify the renderer can see window.serial from preload
  mainWindow.webContents.on('did-finish-load', async () => {
    const hasSerial = await mainWindow.webContents.executeJavaScript('Boolean(window.serial)')
    console.log('[main] renderer sees window.serial =', hasSerial)
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    console.log('[main] loading DEV URL', process.env['ELECTRON_RENDERER_URL'])
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL']!)
  } else {
    const file = join(__dirname, '../renderer/index.html')
    console.log('[main] loading FILE', file)
    mainWindow.loadFile(file)
  }
}

app.whenReady().then(() => {
  console.log('[versions]', process.versions) // electron/node/chrome
  electronApp.setAppUserModelId('com.electron')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // your existing IPC
  ipcMain.on('ping', () => console.log('pong'))
  ipcMain.handle('getStoryLines', getStoryLines)

  createWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('before-quit', async () => {
  try {
    if (currentPort?.isOpen) {
      await new Promise<void>((resolve) => currentPort!.close(() => resolve()))
      currentPort = null
      console.log('[serial] closed on before-quit')
    }
  } catch {}
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
