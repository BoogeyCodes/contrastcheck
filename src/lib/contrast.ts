/**
 * WCAG 2.x colour-contrast maths.
 *
 * The contrast ratio between two colours is `(L1 + 0.05) / (L2 + 0.05)`, where L1 and L2 are the
 * relative luminances of the lighter and darker colour. Relative luminance is a gamma-corrected,
 * perceptually weighted sum of the sRGB channels, exactly as defined by WCAG.
 */

export interface Rgb {
  r: number
  g: number
  b: number
}

const HEX3 = /^#?([0-9a-f])([0-9a-f])([0-9a-f])$/i
const HEX6 = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i

/** Parse `#rgb` or `#rrggbb` (with or without the leading '#') into channel values, or null. */
export function parseHex(input: string): Rgb | null {
  const short = HEX3.exec(input.trim())
  if (short) {
    return {
      r: parseInt(short[1] + short[1], 16),
      g: parseInt(short[2] + short[2], 16),
      b: parseInt(short[3] + short[3], 16),
    }
  }
  const long = HEX6.exec(input.trim())
  if (long) {
    return { r: parseInt(long[1], 16), g: parseInt(long[2], 16), b: parseInt(long[3], 16) }
  }
  return null
}

export function toHex({ r, g, b }: Rgb): string {
  const part = (n: number) => clampChannel(n).toString(16).padStart(2, '0')
  return `#${part(r)}${part(g)}${part(b)}`
}

function clampChannel(n: number): number {
  return Math.max(0, Math.min(255, Math.round(n)))
}

/** Gamma-expand one 0-255 channel to its linear 0-1 value. */
function linearise(channel: number): number {
  const c = channel / 255
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
}

/** WCAG relative luminance, 0 (black) to 1 (white). */
export function relativeLuminance(color: Rgb): number {
  return 0.2126 * linearise(color.r) + 0.7152 * linearise(color.g) + 0.0722 * linearise(color.b)
}

/** The WCAG contrast ratio between two colours, from 1:1 to 21:1. Order does not matter. */
export function contrastRatio(a: Rgb, b: Rgb): number {
  const la = relativeLuminance(a)
  const lb = relativeLuminance(b)
  const lighter = Math.max(la, lb)
  const darker = Math.min(la, lb)
  return (lighter + 0.05) / (darker + 0.05)
}

export interface WcagResult {
  ratio: number
  normalAA: boolean
  normalAAA: boolean
  largeAA: boolean
  largeAAA: boolean
  uiAA: boolean
}

/** Evaluate a ratio against the WCAG success criteria for text and UI components. */
export function wcag(a: Rgb, b: Rgb): WcagResult {
  const ratio = contrastRatio(a, b)
  return {
    ratio,
    normalAA: ratio >= 4.5,
    normalAAA: ratio >= 7,
    largeAA: ratio >= 3,
    largeAAA: ratio >= 4.5,
    uiAA: ratio >= 3,
  }
}

/** Round a ratio to two decimals for display, e.g. 4.5 -> "4.50". */
export function formatRatio(ratio: number): string {
  return `${ratio.toFixed(2)}:1`
}

/**
 * Nudge `foreground` toward black or white until it meets `target` contrast against `background`,
 * returning whichever adjusted colour reaches the target with the smaller perceptual change.
 * Returns null if neither pure black nor pure white would satisfy the target (impossible for
 * target <= 21, but guards against odd inputs).
 */
export function suggestForeground(foreground: Rgb, background: Rgb, target = 4.5): Rgb | null {
  if (contrastRatio(foreground, background) >= target) return foreground

  const darker = marchToTarget(foreground, { r: 0, g: 0, b: 0 }, background, target)
  const lighter = marchToTarget(foreground, { r: 255, g: 255, b: 255 }, background, target)

  const candidates = [darker, lighter].filter((c): c is Rgb => c !== null)
  if (candidates.length === 0) return null

  return candidates.reduce((best, c) =>
    distance(c, foreground) < distance(best, foreground) ? c : best,
  )
}

function marchToTarget(from: Rgb, toward: Rgb, background: Rgb, target: number): Rgb | null {
  const steps = 255
  for (let i = 1; i <= steps; i++) {
    const t = i / steps
    // Round first, then test, so the integer colour we return actually meets the target.
    const candidate: Rgb = {
      r: Math.round(from.r + (toward.r - from.r) * t),
      g: Math.round(from.g + (toward.g - from.g) * t),
      b: Math.round(from.b + (toward.b - from.b) * t),
    }
    if (contrastRatio(candidate, background) >= target) {
      return candidate
    }
  }
  return null
}

function distance(a: Rgb, b: Rgb): number {
  return Math.hypot(a.r - b.r, a.g - b.g, a.b - b.b)
}
