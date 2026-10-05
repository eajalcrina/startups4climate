'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { TrendingUp, TrendingDown, Minus, Loader2 } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { loadBenchmark, DEMO_STARTUPS, type BenchmarkMetric } from '@/lib/admin-data/benchmarking'

function getTrend(org: number, platform: number) {
  const diff = org - platform
  const pct = platform > 0 ? ((diff / platform) * 100).toFixed(0) : '0'
  if (diff > 0) return { icon: TrendingUp, color: '#1F77F6', text: `+${pct}% vs promedio` }
  if (diff < 0) return { icon: TrendingDown, color: '#DC2626', text: `${pct}% vs promedio` }
  return { icon: Minus, color: '#6B7280', text: 'Igual al promedio' }
}

const cardStyle: React.CSSProperties = {
  background: 'var(--color-bg-card)',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-md)',
  padding: '1.5rem',
  boxShadow: 'var(--shadow-card)',
}

const fadeUp = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, ease: 'easeOut' as const },
}

export default function BenchmarkingPage() {
  const { appUser, isDemo } = useAuth()
  const [loading, setLoading] = useState(true)
  const [benchmarkData, setBenchmarkData] = useState<BenchmarkMetric[]>([])
  const [chartData, setChartData] = useState<{ name: string; tuOrg: number; promedio: number }[]>([])

  // Show the spinner again when the org/demo context changes (adjusted during render)
  const fetchKey = `${isDemo}|${appUser?.org_id ?? ''}`
  const [prevFetchKey, setPrevFetchKey] = useState(fetchKey)
  if (prevFetchKey !== fetchKey) {
    setPrevFetchKey(fetchKey)
    if (isDemo || appUser?.org_id) setLoading(true)
  }

  useEffect(() => {
    if (!isDemo && !appUser?.org_id) return

    loadBenchmark({ isDemo, orgId: appUser?.org_id })
      .then((result) => {
        setBenchmarkData(result.metrics)
        setChartData(result.chart)
      })
      .catch((err) => console.error('[S4C Admin] Error loading benchmark:', err))
      .finally(() => setLoading(false))
  }, [appUser?.org_id, isDemo])

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <Loader2 size={28} color="var(--color-accent-primary)" style={{ animation: 'spin 1s linear infinite' }} />

      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      style={{ padding: '2rem 1.5rem', maxWidth: 1200, margin: '0 auto' }}
    >
      {isDemo && (
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.375rem 0.75rem',
            borderRadius: 999,
            background: 'var(--color-warning-light)',
            border: '1px solid var(--color-warning-border)',
            color: 'var(--color-warning)',
            fontFamily: 'var(--font-body)',
            fontSize: 'var(--text-xs)',
            fontWeight: 500,
            marginBottom: '1rem',
          }}
        >
          Modo demo — los datos son ilustrativos
        </div>
      )}

      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{
          fontFamily: 'var(--font-heading)', fontWeight: 700,
          fontSize: '1.25rem', color: 'var(--color-text-primary)',
          marginBottom: '0.25rem',
        }}>
          Benchmarking
        </h1>
        <p style={{
          fontFamily: 'var(--font-body)', fontSize: '0.875rem',
          color: 'var(--color-text-secondary)',
        }}>
          Compara las métricas de tu organización con el promedio de la plataforma
        </p>
      </div>

      {/* Comparison cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '1rem',
        marginBottom: '2rem',
      }}>
        {benchmarkData.map((item, i) => {
          const trend = getTrend(item.org, item.platform)
          const TrendIcon = trend.icon
          return (
            <motion.div
              key={item.metric}
              {...fadeUp}
              transition={{ ...fadeUp.transition, delay: i * 0.08 }}
              style={cardStyle}
            >
              <h3 style={{
                fontFamily: 'var(--font-body)', fontSize: '0.8125rem',
                fontWeight: 500, color: 'var(--color-text-secondary)',
                marginBottom: '1rem',
              }}>
                {item.metric}
              </h3>

              <div style={{
                display: 'flex', alignItems: 'flex-end',
                justifyContent: 'space-between', marginBottom: '0.75rem',
              }}>
                <div>
                  <div style={{
                    fontFamily: 'var(--font-body)', fontSize: '0.625rem',
                    fontWeight: 600, color: 'var(--color-text-muted)',
                    textTransform: 'uppercase', letterSpacing: '0.05em',
                    marginBottom: '0.25rem',
                  }}>
                    Tu organización
                  </div>
                  <div style={{
                    fontFamily: 'var(--font-heading)', fontWeight: 700,
                    fontSize: '1.75rem', color: 'var(--color-text-primary)',
                    lineHeight: 1,
                  }}>
                    {item.org}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{
                    fontFamily: 'var(--font-body)', fontSize: '0.625rem',
                    fontWeight: 600, color: 'var(--color-text-muted)',
                    textTransform: 'uppercase', letterSpacing: '0.05em',
                    marginBottom: '0.25rem',
                  }}>
                    Promedio plataforma
                  </div>
                  <div style={{
                    fontFamily: 'var(--font-heading)', fontWeight: 700,
                    fontSize: '1.75rem', color: 'var(--color-text-muted)',
                    lineHeight: 1,
                  }}>
                    {item.platform}
                  </div>
                </div>
              </div>

              {/* Progress bars */}
              <div style={{ marginBottom: '0.75rem' }}>
                <div style={{
                  height: 6, borderRadius: 3,
                  background: 'var(--color-bg-muted)',
                  position: 'relative', overflow: 'hidden',
                }}>
                  <div style={{
                    position: 'absolute', top: 0, left: 0, height: '100%',
                    borderRadius: 3, background: 'var(--color-accent-primary)',
                    width: `${Math.max(item.org, item.platform) > 0 ? Math.min((item.org / Math.max(item.org, item.platform)) * 100, 100) : 0}%`,
                    transition: 'width 0.6s ease',
                  }} />
                </div>
                <div style={{
                  height: 4, borderRadius: 2,
                  background: 'var(--color-bg-muted)',
                  marginTop: 4, position: 'relative', overflow: 'hidden',
                }}>
                  <div style={{
                    position: 'absolute', top: 0, left: 0, height: '100%',
                    borderRadius: 2, background: 'var(--color-text-muted)',
                    width: `${Math.max(item.org, item.platform) > 0 ? Math.min((item.platform / Math.max(item.org, item.platform)) * 100, 100) : 0}%`,
                    transition: 'width 0.6s ease',
                  }} />
                </div>
              </div>

              <div style={{
                display: 'flex', alignItems: 'center', gap: '0.375rem',
              }}>
                <TrendIcon size={14} color={trend.color} />
                <span style={{
                  fontFamily: 'var(--font-body)', fontSize: '0.75rem',
                  fontWeight: 600, color: trend.color,
                }}>
                  {trend.text}
                </span>
              </div>
            </motion.div>
          )
        })}
      </div>

      {/* Chart */}
      <motion.div
        {...fadeUp}
        transition={{ ...fadeUp.transition, delay: 0.3 }}
        style={cardStyle}
      >
        <h3 style={{
          fontFamily: 'var(--font-heading)', fontWeight: 600,
          fontSize: '1rem', color: 'var(--color-text-primary)',
          marginBottom: '1.5rem',
        }}>
          Comparación visual
        </h3>
        <div style={{ width: '100%', height: 320 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} barGap={8}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis
                dataKey="name"
                tick={{ fontFamily: 'var(--font-body)', fontSize: 12, fill: 'var(--color-text-secondary)' }}
                axisLine={{ stroke: 'var(--color-border)' }}
                tickLine={false}
              />
              <YAxis
                tick={{ fontFamily: 'var(--font-body)', fontSize: 12, fill: 'var(--color-text-secondary)' }}
                axisLine={{ stroke: 'var(--color-border)' }}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  background: 'var(--color-bg-card)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 8,
                  fontFamily: 'var(--font-body)',
                  fontSize: '0.8125rem',
                }}
              />
              <Legend
                wrapperStyle={{ fontFamily: 'var(--font-body)', fontSize: '0.8125rem' }}
              />
              <Bar dataKey="tuOrg" name="Tu organización" fill="#1F77F6" radius={[4, 4, 0, 0]} />
              <Bar dataKey="promedio" name="Promedio plataforma" fill="#94A3B8" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      {/* Demo: Startups comparison table */}
      {isDemo && (
        <motion.div
          {...fadeUp}
          transition={{ ...fadeUp.transition, delay: 0.4 }}
          style={{ ...cardStyle, marginTop: '1.5rem' }}
        >
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem',
          }}>
            <h3 style={{
              fontFamily: 'var(--font-heading)', fontWeight: 600,
              fontSize: '1rem', color: 'var(--color-text-primary)',
            }}>
              Comparativo por startup ({DEMO_STARTUPS.length})
            </h3>
            <span style={{
              fontFamily: 'var(--font-body)', fontSize: '0.72rem',
              color: 'var(--color-text-muted)',
            }}>
              Ordenado por readiness · USD MRR · Crecimiento MoM
            </span>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{
              width: '100%', borderCollapse: 'collapse',
              fontFamily: 'var(--font-body)', fontSize: '0.8rem',
            }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                  {['Startup', 'Vertical', 'Etapa', 'Readiness', 'MRR (USD)', 'TAM (USD)', '↑ MoM', 'Estado'].map((h) => (
                    <th key={h} style={{
                      padding: '0.6rem 0.5rem', textAlign: 'left',
                      fontWeight: 600, color: 'var(--color-text-muted)',
                      fontSize: '0.7rem', textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                    }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...DEMO_STARTUPS]
                  .sort((a, b) => b.readiness - a.readiness)
                  .map((s) => {
                    const statusColor = s.status === 'on_track' ? '#1F77F6' : s.status === 'at_risk' ? '#F59E0B' : '#DC2626'
                    const statusLabel = s.status === 'on_track' ? 'On track' : s.status === 'at_risk' ? 'En riesgo' : 'Alerta'
                    return (
                      <tr key={s.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                        <td style={{ padding: '0.55rem 0.5rem', fontWeight: 500, color: 'var(--color-text-primary)' }}>
                          {s.name}
                        </td>
                        <td style={{ padding: '0.55rem 0.5rem', color: 'var(--color-text-secondary)' }}>
                          {s.verticalLabel}
                        </td>
                        <td style={{ padding: '0.55rem 0.5rem', color: 'var(--color-text-secondary)' }}>
                          {s.stageLabel}
                        </td>
                        <td style={{ padding: '0.55rem 0.5rem', color: 'var(--color-text-primary)', fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>
                          {s.readiness}
                        </td>
                        <td style={{ padding: '0.55rem 0.5rem', color: 'var(--color-text-secondary)', fontVariantNumeric: 'tabular-nums' }}>
                          {s.mrr > 0 ? `$${s.mrr.toLocaleString('en-US')}` : '—'}
                        </td>
                        <td style={{ padding: '0.55rem 0.5rem', color: 'var(--color-text-secondary)', fontVariantNumeric: 'tabular-nums' }}>
                          ${(s.tam / 1_000_000).toFixed(0)}M
                        </td>
                        <td style={{ padding: '0.55rem 0.5rem', color: 'var(--color-text-secondary)', fontVariantNumeric: 'tabular-nums' }}>
                          {s.growthRate > 0 ? `+${s.growthRate}%` : '—'}
                        </td>
                        <td style={{ padding: '0.55rem 0.5rem' }}>
                          <span style={{
                            padding: '0.15rem 0.5rem', borderRadius: 'var(--radius-xl)',
                            background: `${statusColor}1A`, color: statusColor,
                            fontSize: '0.65rem', fontWeight: 600,
                          }}>
                            {statusLabel}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}
    </motion.div>
  )
}
