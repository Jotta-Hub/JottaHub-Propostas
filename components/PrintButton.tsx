'use client'

// Botão "Baixar PDF" — usa a impressão do navegador (Salvar como PDF).
// O CSS @media print no globals formata a página pra papel e esconde a UI.
export default function PrintButton() {
  return (
    <button
      className="pdf-btn"
      onClick={() => window.print()}
      style={{
        position: 'fixed', top: 18, right: 18, zIndex: 500,
        display: 'inline-flex', alignItems: 'center', gap: 8,
        background: 'var(--grad-btn)', color: 'var(--white)',
        fontFamily: 'var(--fd)', fontWeight: 800, fontSize: '0.72rem',
        letterSpacing: '0.1em', textTransform: 'uppercase',
        padding: '10px 16px', borderRadius: 3, border: 'none', cursor: 'pointer',
        boxShadow: '0 4px 18px rgba(134,54,242,0.45)',
      }}
    >
      ↓ Baixar PDF
    </button>
  )
}
