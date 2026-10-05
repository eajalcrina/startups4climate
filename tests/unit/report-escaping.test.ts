import { afterEach, describe, expect, it, vi } from 'vitest'
import { formatContent, generateToolReport } from '@/lib/pdf-generator'
import { generateGlobalReport } from '@/lib/global-report'
import { TOOLS } from '@/lib/tools-data'

const XSS = '<img src=x onerror=alert(1)>'

/** Stub window.open() and capture what the report writes into it. */
function captureWindow(): { html: () => string } {
  let written = ''
  const fakeWindow = {
    document: {
      write: (s: string) => {
        written += s
      },
      close: () => {},
    },
  }
  vi.stubGlobal('window', { open: () => fakeWindow })
  return { html: () => written }
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('pdf-generator formatContent', () => {
  it('escapes markup in founder-provided content', () => {
    const html = formatContent(`Nota: ${XSS}`)
    expect(html).not.toContain('<img')
    expect(html).toContain('&lt;img')
  })

  it('still turns uppercase lines (including &) into section titles', () => {
    const html = formatContent('UNIT ECONOMICS & GREEN PREMIUM\n\nTexto')
    expect(html).toMatch(/<h2 class="section-title">UNIT ECONOMICS &amp; GREEN PREMIUM\s*<\/h2>/)
  })

  it('keeps list and question markers', () => {
    const html = formatContent('▶ ¿Pregunta?\n- punto <b>\n→ flecha')
    expect(html).toContain('<h3 class="question">¿Pregunta?</h3>')
    expect(html).toContain('<div class="list-item bullet">punto &lt;b&gt;</div>')
    expect(html).toContain('<div class="list-item">→ flecha</div>')
  })
})

describe('generateToolReport', () => {
  it('escapes user name, startup and content', () => {
    const cap = captureWindow()
    generateToolReport(TOOLS[0], { name: XSS, email: 'a@b.co', startup: `"><script>x()</script>` }, TOOLS[0].id, XSS)
    const html = cap.html()
    expect(html).not.toContain('<img')
    expect(html).not.toContain('<script>x()')
    expect(html).toContain('&lt;img')
    expect(html).toContain('mailto:a@b.co?subject=')
  })
})

describe('generateGlobalReport', () => {
  it('escapes user name, startup and tool data', () => {
    const tool = TOOLS[0]
    const key = 's4c_u1_tool_progress'
    const store = new Map<string, string>()
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => store.set(k, v),
      removeItem: (k: string) => store.delete(k),
    })
    store.set(key, JSON.stringify({ [tool.id]: { completed: true, reportGenerated: false, data: { values: { nota: XSS } }, completedAt: null, lastSaved: '' } }))
    const cap = captureWindow()
    generateGlobalReport({ id: 'u1', name: XSS, email: 'a@b.co', startup: `</title><script>x()</script>` })
    const html = cap.html()
    expect(html).not.toContain('<img')
    expect(html).not.toContain('<script>x()')
    expect(html).toContain('&lt;/title&gt;&lt;script&gt;')
  })
})
