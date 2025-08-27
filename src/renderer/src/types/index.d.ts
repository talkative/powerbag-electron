export type UserType = {
  id: string
  name: string
}

export type Item = {
  id: string
  timestamps: string[]
  image: string
}

export type Bag = {
  _id: string
  id: string
  imageUrl: string
  videoUrl: string | null
  imageFrameUrls: string[] | null
  borderColor?: string
}

type SingleButtonEvent = {
  event: string
  timestamp: string
  storyId: string
  storylineTitle: string
}

type ButtonEvents = {
  _id: string
  data: SingleButtonEvent[]
  hasExported: boolean
  createDate: string
  updateDate: string
}

export type Event = {
  _id: string
  start: number
  stop: number | null
  action: string
  bags?: string[]
  frames?: string[]
}

export type Info = {
  _id: string
  createDate: string
  updateDate: string
  en: string
  nl: string
}

export type Story = {
  _id?: string
  id: string
  audioSrc: string
  selectedBags: string[]
  events: Event[]
}

export type StoryLine = {
  _id: string
  status: 'preview' | 'published'
  createDate: string
  updateDate: string
  title: string
  bags: {
    firstColumn: Bag[]
    secondColumn: Bag[]
    thirdColumn: Bag[]
  }
  stories: Story[]
}

declare global {
  interface SerialPort {
    readable: ReadableStream<Uint8Array> | null
    writable: WritableStream<Uint8Array> | null
    open(options: { baudRate: number }): Promise<void>
    close(): Promise<void>
  }

  interface Serial {
    getPorts(): Promise<SerialPort[]>
    requestPort(): Promise<SerialPort>
  }

  interface Navigator {
    serial?: Serial
  }
}

export {}

declare global {
  interface Window {
    serial?: {
      list: () => Promise<
        Array<{
          path: string
          manufacturer: string
          vendorId: string
          productId: string
          isArduino: boolean
          friendly: string
        }>
      >
      open: (path: string, baudRate?: number) => Promise<boolean>
      write: (data: Uint8Array | string) => Promise<boolean>
      close: () => Promise<boolean>
    }
  }
}
