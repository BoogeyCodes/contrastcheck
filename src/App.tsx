import { useMemo, useState } from 'react'
import { formatRatio, parseHex, suggestForeground, toHex, wcag } from './lib/contrast'

const PRESETS: Array<{ name: string; fg: string; bg: string }> = [
  { name: 'Passing', fg: '#1a1a1a', bg: '#ffffff' },
  { name: 'Borderline', fg: '#949494', bg: '#ffffff' },
  { name: 'Failing', fg: '#b8b8b8', bg: '#ffffff' },
  { name: 'Dark mode', fg: '#e6edf3', bg: '#0f1419' },
]

export default function App() {
  const [fg, setFg] = useState('#767676')
  const [bg, setBg] = useState('#ffffff')

  const fgRgb = parseHex(fg)
  const bgRgb = parseHex(bg)
  const valid = fgRgb !== null && bgRgb !== null

  const result = useMemo(() => (fgRgb && bgRgb ? wcag(fgRgb, bgRgb) : null), [fgRgb, bgRgb])
  const suggestion = useMemo(
    () => (fgRgb && bgRgb && result && !result.normalAA ? suggestForeground(fgRgb, bgRgb, 4.5) : null),
    [fgRgb, bgRgb, result],
  )

  return (
    <main className="app">
      <header>
        <h1>Contrast Check</h1>
        <p className="muted">
          WCAG colour-contrast checker. Enter a foreground and background colour to see the contrast
          ratio and which accessibility levels it meets.
        </p>
      </header>

      <section className="controls">
        <ColorField label="Foreground (text)" value={fg} onChange={setFg} valid={fgRgb !== null} />
        <button
          type="button"
          className="swap"
          aria-label="Swap foreground and background"
          onClick={() => {
            setFg(bg)
            setBg(fg)
          }}
        >
          ⇅
        </button>
        <ColorField label="Background" value={bg} onChange={setBg} valid={bgRgb !== null} />
      </section>

      <section className="presets" aria-label="Presets">
        {PRESETS.map((p) => (
          <button
            key={p.name}
            type="button"
            className="preset"
            onClick={() => {
              setFg(p.fg)
              setBg(p.bg)
            }}
          >
            {p.name}
          </button>
        ))}
      </section>

      {valid && result ? (
        <>
          <section
            className="preview"
            style={{ background: bg, color: fg }}
            aria-label="Preview of the chosen colours"
          >
            <p className="preview__large">Large text looks like this.</p>
            <p className="preview__normal">
              Normal body text looks like this: the quick brown fox jumps over the lazy dog.
            </p>
          </section>

          <section className="result">
            <div className="ratio" aria-live="polite">
              <span className="ratio__value">{formatRatio(result.ratio)}</span>
              <span className="muted">contrast ratio</span>
            </div>
            <ul className="levels">
              <Level label="Normal text AA" pass={result.normalAA} hint="≥ 4.5" />
              <Level label="Normal text AAA" pass={result.normalAAA} hint="≥ 7" />
              <Level label="Large text AA" pass={result.largeAA} hint="≥ 3" />
              <Level label="Large text AAA" pass={result.largeAAA} hint="≥ 4.5" />
              <Level label="UI components" pass={result.uiAA} hint="≥ 3" />
            </ul>
          </section>

          {suggestion && (
            <section className="suggestion">
              <p>
                Closest accessible foreground that passes normal-text AA:{' '}
                <button type="button" className="chip" onClick={() => setFg(toHex(suggestion))}>
                  <span className="chip__swatch" style={{ background: toHex(suggestion) }} aria-hidden />
                  {toHex(suggestion)}
                </button>
              </p>
            </section>
          )}
        </>
      ) : (
        <p className="error" role="alert">
          Enter two valid hex colours, for example <code>#333</code> and <code>#ffffff</code>.
        </p>
      )}
    </main>
  )
}

function ColorField({
  label,
  value,
  onChange,
  valid,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  valid: boolean
}) {
  const colorValue = valid ? toHex(parseHex(value)!) : '#000000'
  return (
    <label className="field">
      <span>{label}</span>
      <div className="field__row">
        <input
          type="color"
          value={colorValue}
          onChange={(e) => onChange(e.target.value)}
          aria-label={`${label} colour picker`}
        />
        <input
          type="text"
          className={valid ? '' : 'invalid'}
          value={value}
          spellCheck={false}
          onChange={(e) => onChange(e.target.value)}
          aria-label={`${label} hex value`}
        />
      </div>
    </label>
  )
}

function Level({ label, pass, hint }: { label: string; pass: boolean; hint: string }) {
  return (
    <li className={pass ? 'level level--pass' : 'level level--fail'}>
      <span className="level__mark" aria-hidden>
        {pass ? '✓' : '✗'}
      </span>
      <span className="level__label">{label}</span>
      <span className="muted">{hint}</span>
      <span className="level__status">{pass ? 'Pass' : 'Fail'}</span>
    </li>
  )
}
