declare module 'canvas-confetti' {
  interface ConfettiOptions {
    particleCount?: number
    spread?: number
    origin?: {
      x?: number
      y?: number
    }
    [key: string]: unknown
  }

  function confetti(options?: ConfettiOptions): Promise<void>
  export default confetti
}
