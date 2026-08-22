import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { EvidenceNote } from './EvidenceNote'

describe('EvidenceNote', () => {
  it('renders the proof badge alongside the source text', () => {
    render(<EvidenceNote level="solid" source="Bosquet et al. 2007" />)
    expect(screen.getByText('SOLIDE')).toBeInTheDocument()
    expect(screen.getByText('Bosquet et al. 2007')).toBeInTheDocument()
  })

  it('renders the note number in mono when provided', () => {
    render(<EvidenceNote level="weak" source="3 effets mal quantifiés" noteNumber={8} />)
    expect(screen.getByText('NOTE 8')).toBeInTheDocument()
  })

  it('omits the note number block when absent', () => {
    render(<EvidenceNote level="moderate" source="Consensus d'entraîneurs" />)
    expect(screen.queryByText(/^NOTE/)).not.toBeInTheDocument()
  })
})
