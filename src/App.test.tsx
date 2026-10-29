import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import App from './App'

describe('<App>', () => {
  it('shows the ratio and pass/fail for the default colours', () => {
    render(<App />)
    // #767676 on white is ~4.54, which passes normal-text AA but not AAA.
    expect(screen.getByText(/^\d+\.\d{2}:1$/)).toBeInTheDocument()
    const normalAA = screen.getByText('Normal text AA').closest('li')!
    expect(within(normalAA).getByText('Pass')).toBeInTheDocument()
    const normalAAA = screen.getByText('Normal text AAA').closest('li')!
    expect(within(normalAAA).getByText('Fail')).toBeInTheDocument()
  })

  it('updates results when a preset is chosen', async () => {
    render(<App />)
    await userEvent.click(screen.getByRole('button', { name: 'Failing' }))

    const normalAA = screen.getByText('Normal text AA').closest('li')!
    expect(within(normalAA).getByText('Fail')).toBeInTheDocument()
    // A failing pair offers a suggested accessible colour.
    expect(screen.getByText(/Closest accessible foreground/i)).toBeInTheDocument()
  })

  it('shows an error for invalid hex input', async () => {
    render(<App />)
    const fgInput = screen.getByLabelText(/Foreground \(text\) hex value/i)
    await userEvent.clear(fgInput)
    await userEvent.type(fgInput, 'nonsense')

    expect(screen.getByRole('alert')).toHaveTextContent(/valid hex colours/i)
  })
})
