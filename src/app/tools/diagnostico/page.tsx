'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Activity, TrendingUp, TrendingDown, Minus, Plus, ArrowRight, Calendar, ChevronRight } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import DiagnosticForm, { type DiagnosticHistoryEntry } from '@/components/DiagnosticForm'

const STAGE_LABEL: Record<number, string> = {
  1: 'Pre-incubación',
  2: 'Incubación',
  3: 'Aceleración',
  4: 'Escalamiento',
}

function fmtDate(iso: string) {
  try {
    const d = new Date(iso)
    return d.toLocaleDateString('es-419', { day: '2-digit', month: 'short', year: 'numeric' })
  } catch {
    return iso
  }
}

function relDate(iso: string) {
  try {
    const d = new Date(iso).getTime()
    const diff = Date.now() - d
    const days = Math.round(diff / 86400000)
    if (days < 1) return 'hoy'
    if (days === 1) return 'hace 1 día'
    if (days < 30) return `hace ${days} días`
    const months = Math.round(days / 30)
    if (months === 1) return 'hace 1 mes'
    if (months < 12) return `hace ${months} meses`
    const years = Math.round(months / 12)
    return years === 1 ? 'hace 1 año' : `hace ${years} años`
  } catch {
    return ''
  }
}

export default function DiagnosticoPage() {
  const { user, appUser } = useAuth()
  const [view, setView] = useState<'history' | 'new'>('history')

  const userId = user?.id || appUser?.id || null

  // Re-read the local history whenever the view changes (e.g. after a new diagnostic)
  const history = useMemo<DiagnosticHistoryEntry[]>(() => {
    void view
    if (!userId) return []
    try {
      const raw = localStorage.getItem(`s4c_${userId}_diagnostic_history`)
      const list: DiagnosticHistoryEntry[] = raw ? JSON.parse(raw) : []
      // Sort desc by created_at
      list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      return list
    } catch {
      return []
    }
  }, [userId, view])

  const latest = history[0]
  const previous = history[1]
  const delta = latest && previous ? latest.score - previous.score : null

  const prefilledContact = useMemo(() => ({
    nombre: user?.name || appUser?.full_name || '',
    email: user?.email || appUser?.email || '',
    startup_name: user?.startup || appUser?.startup_name || '',
    vertical: 'Cleantech / Energía',
    startup_description: 'Startup de impacto climático',
  }), [user, appUser])

  /* ─── View: new diagnostic ─── */
  if (view === 'new') {
    return (
      <div style={{ padding: '1.5rem 1rem', maxWidth: 900, margin: '0 auto' }}>
        <button
          onClick={() => setView('history')}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            fontFamily: 'var(--font-body)', fontSize: '0.7rem', fontWeight: 600,
            color: 'var(--color-text-secondary)', background: 'transparent',
            border: 'none', cursor: 'pointer', marginBottom: '0.5rem',
          }}
        >
          ← Volver al historial
        </button>
        <DiagnosticForm
          embedded
          userId={userId || undefined as unknown as string}
          prefilledContact={prefilledContact}
          onBack={() => setView('history')}
        />
      </div>
    )
  }

  /* ─── View: history ─── */
  return (
    <div style={{ padding: '1.5rem 1rem 3rem', maxWidth: 1100, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(218,78,36,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Activity size={20} color="#DA4E24" />
          </div>
          <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.6rem', fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--color-ink)', margin: 0 }}>
            Diagnóstico de madurez
          </h1>
        </div>
        <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.82rem', color: 'var(--color-text-secondary)', maxWidth: 700, margin: 0 }}>
          Repite el diagnóstico cada cierto tiempo para ver cómo evoluciona tu Startup Readiness Score y detectar en qué dimensiones estás avanzando.
        </p>
      </div>

      {/* KPI strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: '1.5rem' }}>
        <div style={{ padding: '0.9rem 1rem', borderRadius: 12, background: 'var(--color-paper)', border: '1px solid var(--color-border)' }}>
          <div style={{ fontFamily: 'var(--font-body)', fontSize: '0.65rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 }}>Último score</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
            <span style={{ fontFamily: 'var(--font-heading)', fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-ink)' }}>
              {latest ? latest.score : '—'}
            </span>
            <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>/ 23</span>
          </div>
        </div>
        <div style={{ padding: '0.9rem 1rem', borderRadius: 12, background: 'var(--color-paper)', border: '1px solid var(--color-border)' }}>
          <div style={{ fontFamily: 'var(--font-body)', fontSize: '0.65rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 }}>Evolución</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {delta === null ? (
              <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Sin comparación</span>
            ) : delta > 0 ? (
              <><TrendingUp size={18} color="#1F77F6" /><span style={{ fontFamily: 'var(--font-heading)', fontSize: '1.2rem', fontWeight: 700, color: '#1F77F6' }}>+{delta} pts</span></>
            ) : delta < 0 ? (
              <><TrendingDown size={18} color="#DC2626" /><span style={{ fontFamily: 'var(--font-heading)', fontSize: '1.2rem', fontWeight: 700, color: '#DC2626' }}>{delta} pts</span></>
            ) : (
              <><Minus size={18} color="var(--color-text-muted)" /><span style={{ fontFamily: 'var(--font-heading)', fontSize: '1.2rem', fontWeight: 700, color: 'var(--color-text-muted)' }}>Igual</span></>
            )}
          </div>
        </div>
        <div style={{ padding: '0.9rem 1rem', borderRadius: 12, background: 'var(--color-paper)', border: '1px solid var(--color-border)' }}>
          <div style={{ fontFamily: 'var(--font-body)', fontSize: '0.65rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 }}>Etapa actual</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {latest ? (
              <>
                <span style={{ fontSize: '1.1rem' }}>{latest.profile_emoji}</span>
                <span style={{ fontFamily: 'var(--font-heading)', fontSize: '0.95rem', fontWeight: 700, color: latest.profile_color }}>
                  {latest.profile_tag}
                </span>
              </>
            ) : (
              <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Aún no disponible</span>
            )}
          </div>
        </div>
        <div style={{ padding: '0.9rem 1rem', borderRadius: 12, background: 'var(--color-paper)', border: '1px solid var(--color-border)' }}>
          <div style={{ fontFamily: 'var(--font-body)', fontSize: '0.65rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 }}>Diagnósticos completados</div>
          <div style={{ fontFamily: 'var(--font-heading)', fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-ink)' }}>{history.length}</div>
        </div>
      </div>

      {/* CTA new diagnostic */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '1rem 1.1rem', borderRadius: 12, marginBottom: '1.5rem',
        background: 'linear-gradient(90deg, rgba(218,78,36,0.10), rgba(31,119,246,0.08))',
        border: '1px solid rgba(218,78,36,0.25)',
        flexWrap: 'wrap', gap: 12,
      }}>
        <div>
          <div style={{ fontFamily: 'var(--font-heading)', fontSize: '0.95rem', fontWeight: 700, color: 'var(--color-ink)', marginBottom: 2 }}>
            {history.length === 0 ? 'Realiza tu primer diagnóstico' : 'Actualiza tu diagnóstico'}
          </div>
          <div style={{ fontFamily: 'var(--font-body)', fontSize: '0.72rem', color: 'var(--color-text-secondary)' }}>
            9 preguntas · 3 minutos · puedes repetirlo todas las veces que quieras para medir tu evolución.
          </div>
        </div>
        <button
          onClick={() => setView('new')}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '0.6rem 1rem', borderRadius: 9999,
            background: 'var(--color-accent-primary)', color: '#fff',
            fontFamily: 'var(--font-body)', fontSize: '0.75rem', fontWeight: 700,
            border: 'none', cursor: 'pointer',
            boxShadow: '0 4px 14px rgba(218,78,36,0.25)',
          }}
        >
          <Plus size={15} /> Nuevo diagnóstico
        </button>
      </div>

      {/* History list */}
      <div style={{
        background: 'var(--color-paper)', borderRadius: 14,
        border: '1px solid var(--color-border)', overflow: 'hidden',
      }}>
        <div style={{ padding: '0.9rem 1.1rem', borderBottom: '1px solid var(--color-border)' }}>
          <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '0.9rem', fontWeight: 700, margin: 0, color: 'var(--color-ink)', letterSpacing: '-0.01em' }}>
            Historial de diagnósticos
          </h3>
        </div>

        {history.length === 0 ? (
          <div style={{ padding: '2.5rem 1.5rem', textAlign: 'center' }}>
            <Activity size={36} color="var(--color-text-muted)" style={{ marginBottom: 10 }} />
            <div style={{ fontFamily: 'var(--font-heading)', fontSize: '0.95rem', fontWeight: 700, color: 'var(--color-ink)', marginBottom: 4 }}>
              Aún no has realizado un diagnóstico
            </div>
            <div style={{ fontFamily: 'var(--font-body)', fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginBottom: 14 }}>
              Empieza ahora mismo — te tomará solo 3 minutos.
            </div>
            <button
              onClick={() => setView('new')}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '0.55rem 1rem', borderRadius: 9999,
                background: 'var(--color-accent-primary)', color: '#fff',
                fontFamily: 'var(--font-body)', fontSize: '0.75rem', fontWeight: 700,
                border: 'none', cursor: 'pointer',
              }}
            >
              <Plus size={14} /> Realizar diagnóstico
            </button>
          </div>
        ) : (
          <div>
            {history.map((entry, i) => {
              const prev = history[i + 1]
              const d = prev ? entry.score - prev.score : null
              return (
                <div
                  key={entry.id}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '0.5fr 1fr 1fr 1fr 0.5fr',
                    alignItems: 'center',
                    gap: 10,
                    padding: '0.9rem 1.1rem',
                    borderBottom: i === history.length - 1 ? 'none' : '1px solid var(--color-border)',
                  }}
                >
                  <div style={{
                    width: 34, height: 34, borderRadius: '50%',
                    background: entry.profile_color + '22',
                    border: `1px solid ${entry.profile_color}55`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '1.1rem',
                  }}>
                    {entry.profile_emoji}
                  </div>
                  <div>
                    <div style={{ fontFamily: 'var(--font-body)', fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-ink)' }}>
                      {fmtDate(entry.created_at)}
                    </div>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontFamily: 'var(--font-body)', fontSize: '0.65rem', color: 'var(--color-text-muted)', marginTop: 2 }}>
                      <Calendar size={10} /> {relDate(entry.created_at)}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontFamily: 'var(--font-heading)', fontSize: '0.95rem', fontWeight: 800, color: 'var(--color-ink)' }}>
                      {entry.score} <span style={{ fontFamily: 'var(--font-body)', fontWeight: 500, fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>/ 23</span>
                    </div>
                    <div style={{ fontFamily: 'var(--font-body)', fontSize: '0.65rem', color: 'var(--color-text-muted)' }}>
                      Etapa {entry.profile_etapa} · {STAGE_LABEL[entry.profile_etapa]}
                    </div>
                  </div>
                  <div>
                    {d === null ? (
                      <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>Primer diagnóstico</span>
                    ) : d > 0 ? (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontFamily: 'var(--font-body)', fontSize: '0.72rem', fontWeight: 700, color: '#1F77F6' }}>
                        <TrendingUp size={13} /> +{d} pts
                      </span>
                    ) : d < 0 ? (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontFamily: 'var(--font-body)', fontSize: '0.72rem', fontWeight: 700, color: '#DC2626' }}>
                        <TrendingDown size={13} /> {d} pts
                      </span>
                    ) : (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontFamily: 'var(--font-body)', fontSize: '0.72rem', fontWeight: 700, color: 'var(--color-text-muted)' }}>
                        <Minus size={13} /> Sin cambio
                      </span>
                    )}
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <ChevronRight size={16} color="var(--color-text-muted)" />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Link back */}
      <div style={{ marginTop: '1.25rem', textAlign: 'center' }}>
        <Link
          href="/tools"
          style={{
            fontFamily: 'var(--font-body)', fontSize: '0.72rem',
            color: 'var(--color-text-secondary)', textDecoration: 'none',
            display: 'inline-flex', alignItems: 'center', gap: 4,
          }}
        >
          Volver a herramientas <ArrowRight size={12} />
        </Link>
      </div>
    </div>
  )
}
