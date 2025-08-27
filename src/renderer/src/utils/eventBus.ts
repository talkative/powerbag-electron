/* eslint-disable @typescript-eslint/no-explicit-any */
export default {
  on(eventName: string, listener: EventListenerOrEventListenerObject): void {
    document.addEventListener(eventName, listener)
  },
  dispatch(eventName: string, data?: any): void {
    document.dispatchEvent(new CustomEvent(eventName, { detail: data || {} }))
  },
  remove(eventName: string, listener: EventListenerOrEventListenerObject): void {
    document.removeEventListener(eventName, listener)
  }
}
