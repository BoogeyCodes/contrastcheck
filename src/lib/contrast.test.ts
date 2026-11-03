import { describe, expect, it } from 'vitest'
import {
  contrastRatio,
  formatRatio,
  grade,
  parseHex,
  relativeLuminance,
  suggestForeground,
  toHex,
  wcag,
} from './contrast'

const BLACK = { r: 0, g: 0, b: 0 }
const WHITE = { r: 255, g: 255, b: 255 }

describe('parseHex', () => {
  it('parses #rrggbb and #rgb, with or without #', () => {
    expect(parseHex('#ff8800')).toEqual({ r: 255, g: 136, b: 0 })
    expect(parseHex('ff8800')).toEqual({ r: 255, g: 136, b: 0 })
    expect(parseHex('#f80')).toEqual({ r: 255, g: 136, b: 0 })
    expect(parseHex('  #FFFFFF ')).toEqual(WHITE)
  })

  it('rejects malformed input', () => {
    expect(parseHex('#ggg')).toBeNull()
    expect(parseHex('#12345')).toBeNull()
    expect(parseHex('not a color')).toBeNull()
  })
})

describe('toHex', () => {
  it('round-trips and clamps out-of-range channels', () => {
    expect(toHex({ r: 255, g: 136, b: 0 })).toBe('#ff8800')
    expect(toHex({ r: -5, g: 300, b: 128 })).toBe('#00ff80')
  })
})

describe('relativeLuminance', () => {
  it('is 0 for black and 1 for white', () => {
    expect(relativeLuminance(BLACK)).toBe(0)
    expect(relativeLuminance(WHITE)).toBeCloseTo(1, 10)
  })
})

describe('contrastRatio', () => {
  it('is 21:1 for black on white', () => {
    expect(contrastRatio(BLACK, WHITE)).toBeCloseTo(21, 2)
  })

  it('is 1:1 for identical colours and order-independent', () => {
    expect(contrastRatio(WHITE, WHITE)).toBe(1)
    const grey = { r: 119, g: 119, b: 119 }
    expect(contrastRatio(grey, WHITE)).toBeCloseTo(contrastRatio(WHITE, grey), 10)
  })

  it('matches a known reference value (#777 on white ~= 4.48)', () => {
    expect(contrastRatio({ r: 119, g: 119, b: 119 }, WHITE)).toBeCloseTo(4.48, 2)
  })
})

describe('wcag', () => {
  it('flags passes at the documented thresholds', () => {
    // #767676 on white is the canonical "just passes AA normal" grey (~4.54).
    const result = wcag({ r: 118, g: 118, b: 118 }, WHITE)
    expect(result.normalAA).toBe(true)
    expect(result.normalAAA).toBe(false)
    expect(result.largeAA).toBe(true)
  })

  it('fails low-contrast pairs', () => {
    const result = wcag({ r: 200, g: 200, b: 200 }, WHITE)
    expect(result.normalAA).toBe(false)
    expect(result.largeAA).toBe(false)
    expect(result.uiAA).toBe(false)
  })

  it('black on white passes everything', () => {
    const result = wcag(BLACK, WHITE)
    expect(result.normalAAA && result.largeAAA && result.uiAA).toBe(true)
  })
})

describe('formatRatio', () => {
  it('formats to two decimals with a :1 suffix', () => {
    expect(formatRatio(4.5)).toBe('4.50:1')
    expect(formatRatio(21)).toBe('21.00:1')
  })
})

describe('suggestForeground', () => {
  it('returns the colour unchanged when it already passes', () => {
    expect(suggestForeground(BLACK, WHITE)).toEqual(BLACK)
  })

  it('finds a passing colour for a failing pair', () => {
    const start = { r: 170, g: 170, b: 170 } // grey on white, fails AA
    const fixed = suggestForeground(start, WHITE, 4.5)
    expect(fixed).not.toBeNull()
    expect(contrastRatio(fixed!, WHITE)).toBeGreaterThanOrEqual(4.5)
  })

  it('can reach a lighter colour against a dark background', () => {
    const start = { r: 90, g: 90, b: 90 } // dim grey on black, fails AA
    const fixed = suggestForeground(start, BLACK, 4.5)
    expect(fixed).not.toBeNull()
    expect(contrastRatio(fixed!, BLACK)).toBeGreaterThanOrEqual(4.5)
  })
})

describe('grade', () => {
  it('returns the strongest WCAG grade for a ratio', () => {
    expect(grade(contrastRatio(BLACK, WHITE))).toBe('AAA') // 21:1
    expect(grade(7)).toBe('AAA')
    expect(grade(4.5)).toBe('AA')
    expect(grade(3)).toBe('AA Large')
    expect(grade(2.9)).toBe('Fail')
  })
})
