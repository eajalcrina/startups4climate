'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  ArrowLeft,
  Download,
  Award,
  Users,
  DollarSign,
  Target,
  TrendingUp,
  CheckCircle2,
  Printer,
  Share2,
  Leaf,
  BarChart3,
  Calendar,
  Link2,
  FileText,
  Zap,
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { TOOLS, STAGE_META } from '@/lib/tools-data'
import { getProgress } from '@/lib/progress'

/* ─── Constants ─── */

const LATAM_VERTICALS: Record<string, string> = {
  fintech: 'Fintech',
  healthtech: 'Healthtech',
  edtech: 'Edtech',
  agritech_foodtech: 'Agritech / Foodtech',
  cleantech_climatech: 'Cleantech / Climatech',
  biotech_deeptech: 'Biotech / Deeptech',
  logistics_mobility: 'Logistica / Movilidad',
  saas_enterprise: 'SaaS / Enterprise',
  social_impact: 'Impacto Social',
  other: 'Otro',
}

const STAGE_NAMES: Record<number, string> = {
  1: 'Pre-incubacion',
  2: 'Incubacion',
  3: 'Aceleracion',
  4: 'Escalamiento',
}

const COUNTRY_FLAGS: Record<string, string> = {
  peru: '🇵🇪', pe: '🇵🇪', 'Peru': '🇵🇪',
  colombia: '🇨🇴', co: '🇨🇴', 'Colombia': '🇨🇴',
  mexico: '🇲🇽', mx: '🇲🇽', 'Mexico': '🇲🇽', 'México': '🇲🇽',
  chile: '🇨🇱', cl: '🇨🇱', 'Chile': '🇨🇱',
  argentina: '🇦🇷', ar: '🇦🇷', 'Argentina': '🇦🇷',
  brasil: '🇧🇷', br: '🇧🇷', 'Brasil': '🇧🇷', 'Brazil': '🇧🇷',
  ecuador: '🇪🇨', ec: '🇪🇨', 'Ecuador': '🇪🇨',
  bolivia: '🇧🇴', bo: '🇧🇴', 'Bolivia': '🇧🇴',
  uruguay: '🇺🇾', uy: '🇺🇾', 'Uruguay': '🇺🇾',
  paraguay: '🇵🇾', py: '🇵🇾', 'Paraguay': '🇵🇾',
  'costa rica': '🇨🇷', 'Costa Rica': '🇨🇷',
  panama: '🇵🇦', 'Panama': '🇵🇦', 'Panamá': '🇵🇦',
  guatemala: '🇬🇹', 'Guatemala': '🇬🇹',
  'republica dominicana': '🇩🇴', 'Republica Dominicana': '🇩🇴',
  venezuela: '🇻🇪', 'Venezuela': '🇻🇪',
}

const SDG_COLORS: Record<number, string> = {
  1: '#E5243B', 2: '#DDA63A', 3: '#4C9F38', 4: '#C5192D', 5: '#FF3A21',
  6: '#26BDE2', 7: '#FCC30B', 8: '#A21942', 9: '#FD6925', 10: '#DD1367',
  11: '#FD9D24', 12: '#BF8B2E', 13: '#3F7E44', 14: '#0A97D9', 15: '#56C02B',
  16: '#00689D', 17: '#19486A',
}

/* ─── Interfaces ─── */

interface PassportData {
  // Identity
  startupName: string
  vertical: string
  country: string
  founderName: string
  founderRole: string
  teamSize: number
  foundedYear: string
  website: string
  description: string

  // Market
  tam: string
  sam: string
  som: string

  // Unit Economics
  ltv: string
  cac: string
  ltvCacRatio: string
  paybackMonths: string

  // Traction
  mrr: string
  payingCustomers: number
  momGrowth: string
  grossMargin: string

  // Financial
  burnRate: string
  runway: string
  totalRaised: string
  lastRound: string

  // Impact
  co2Avoided: string
  beneficiaries: string
  sdgAlignment: number[]

  // Readiness
  unitEconomics: string
  elevatorPitch: string
}

interface StageProgress {
  stage: number
  name: string
  color: string
  total: number
  completed: number
}

/* ─── Utility Functions ─── */

function formatCurrency(val: string | number | undefined): string {
  if (!val) return '—'
  const num = typeof val === 'string' ? parseFloat(val.replace(/[^0-9.-]/g, '')) : val
  if (isNaN(num)) return String(val)
  if (num >= 1_000_000_000) return `$${(num / 1_000_000_000).toFixed(1)}B`
  if (num >= 1_000_000) return `$${(num / 1_000_000).toFixed(1)}M`
  if (num >= 1_000) return `$${(num / 1_000).toFixed(0)}K`
  return `$${num.toLocaleString('es-419')}`
}

function formatPercent(val: string | number | undefined): string {
  if (!val) return '—'
  const num = typeof val === 'string' ? parseFloat(val.replace(/[^0-9.-]/g, '')) : val
  if (isNaN(num)) return String(val)
  return `${num.toFixed(1)}%`
}

function formatRatio(val: string | number | undefined): string {
  if (!val) return '—'
  const num = typeof val === 'string' ? parseFloat(val.replace(/[^0-9.-]/g, '')) : val
  if (isNaN(num)) return String(val)
  return `${num.toFixed(1)}x`
}

function getFlag(country: string): string {
  if (!country) return ''
  return COUNTRY_FLAGS[country] || COUNTRY_FLAGS[country.toLowerCase()] || ''
}

function getLetterGrade(score: number): string {
  if (score >= 90) return 'A+'
  if (score >= 80) return 'A'
  if (score >= 70) return 'B+'
  if (score >= 60) return 'B'
  if (score >= 50) return 'C+'
  if (score >= 40) return 'C'
  if (score >= 30) return 'D'
  return 'F'
}

function getGradeColor(score: number): string {
  if (score >= 70) return '#1F77F6'
  if (score >= 50) return '#F0721D'
  if (score >= 30) return '#DA4E24'
  return '#DC2626'
}

function generatePassportId(userId: string): string {
  const hash = userId.slice(0, 8).toUpperCase()
  return `S4C-${hash}`
}

/* ─── CircularProgress (Enhanced) ─── */

function CircularProgress({
  score,
  size = 140,
  label,
  grade,
}: {
  score: number
  size?: number
  label?: string
  grade?: string
}) {
  const strokeWidth = 10
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (score / 100) * circumference
  const color = getGradeColor(score)

  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--color-border, #e5e7eb)"
          strokeWidth={strokeWidth}
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.4, ease: 'easeOut' }}
        />
      </svg>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {grade ? (
          <>
            <span
              style={{
                fontFamily: 'var(--font-heading)',
                fontSize: size * 0.28,
                fontWeight: 700,
                color,
                lineHeight: 1,
              }}
            >
              {grade}
            </span>
            <span
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: size * 0.12,
                fontWeight: 600,
                color: 'var(--color-text-secondary)',
                marginTop: 2,
              }}
            >
              {score}/100
            </span>
          </>
        ) : (
          <>
            <span
              style={{
                fontFamily: 'var(--font-heading)',
                fontSize: size * 0.28,
                fontWeight: 400,
                color: 'var(--color-text-primary)',
                lineHeight: 1,
              }}
            >
              {score}
            </span>
            <span
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: size * 0.1,
                color: 'var(--color-text-muted)',
                marginTop: 2,
              }}
            >
              {label || '/100'}
            </span>
          </>
        )}
      </div>
    </div>
  )
}

/* ─── Section Header ─── */

function SectionHeader({
  title,
  icon: Icon,
  color = 'var(--color-text-primary)',
  badge,
}: {
  title: string
  icon: React.ElementType
  color?: string
  badge?: string
}) {
  const isVar = color.startsWith('var(')
  const bgColor = isVar ? 'rgba(255,255,255,0.06)' : `${color}12`
  const badgeBg = isVar ? 'rgba(255,255,255,0.06)' : `${color}10`

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '1rem',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: 7,
            background: bgColor,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <Icon size={14} color={color} />
        </div>
        <h2
          style={{
            fontFamily: 'var(--font-heading)',
            fontSize: 'var(--text-base)',
            fontWeight: 700,
            color: 'var(--color-text-primary)',
            margin: 0,
            letterSpacing: '-0.01em',
          }}
        >
          {title}
        </h2>
      </div>
      {badge && (
        <span
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: 'var(--text-2xs)',
            fontWeight: 700,
            color,
            padding: '0.125rem 0.5rem',
            borderRadius: 6,
            background: badgeBg,
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
          }}
        >
          {badge}
        </span>
      )}
    </div>
  )
}

/* ─── KPI Cell ─── */

function KpiCell({
  label,
  value,
  subtext,
  color,
  health,
}: {
  label: string
  value: string | number
  subtext?: string
  color?: string
  health?: 'green' | 'yellow' | 'red'
}) {
  const healthColors = {
    green: '#1F77F6',
    yellow: '#F0721D',
    red: '#DC2626',
  }
  const healthColor = health ? healthColors[health] : undefined

  return (
    <div
      style={{
        padding: '1rem',
        borderRadius: 10,
        background: 'var(--color-bg-primary)',
        border: '1px solid var(--color-border)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {healthColor && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 3,
            background: healthColor,
          }}
        />
      )}
      <div
        style={{
          fontFamily: 'var(--font-body)',
          fontSize: 'var(--text-2xs)',
          color: 'var(--color-text-muted)',
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          marginBottom: 6,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: 'var(--font-heading)',
          fontSize: 'var(--text-lg)',
          fontWeight: 700,
          color: color || healthColor || 'var(--color-text-primary)',
          lineHeight: 1.2,
        }}
      >
        {value || '—'}
      </div>
      {subtext && (
        <div
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: 'var(--text-2xs)',
            color: healthColor || 'var(--color-text-muted)',
            marginTop: 4,
          }}
        >
          {subtext}
        </div>
      )}
    </div>
  )
}

/* ─── Score Component Bar ─── */

function ScoreBar({
  label,
  score,
  maxScore,
  color,
}: {
  label: string
  score: number
  maxScore: number
  color: string
}) {
  const pct = maxScore > 0 ? (score / maxScore) * 100 : 0

  return (
    <div style={{ marginBottom: '0.625rem' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginBottom: 4,
        }}
      >
        <span
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: 'var(--text-2xs)',
            color: 'var(--color-text-secondary)',
          }}
        >
          {label}
        </span>
        <span
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: 'var(--text-2xs)',
            fontWeight: 700,
            color: 'var(--color-text-primary)',
          }}
        >
          {score}/{maxScore}
        </span>
      </div>
      <div
        style={{
          height: 5,
          borderRadius: 3,
          background: `${color}15`,
          overflow: 'hidden',
        }}
      >
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          style={{
            height: '100%',
            borderRadius: 3,
            background: color,
          }}
        />
      </div>
    </div>
  )
}

/* ─── Stage Progress Bar (Compact) ─── */

function StageProgressBar({ stage }: { stage: StageProgress }) {
  const pct = stage.total > 0 ? (stage.completed / stage.total) * 100 : 0
  const isComplete = stage.completed === stage.total && stage.total > 0

  return (
    <div style={{ marginBottom: '0.5rem' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 3,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
          {isComplete ? (
            <CheckCircle2 size={12} color={stage.color} />
          ) : (
            <div
              style={{
                width: 12,
                height: 12,
                borderRadius: '50%',
                border: `2px solid ${stage.color}50`,
              }}
            />
          )}
          <span
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: 'var(--text-xs)',
              fontWeight: 600,
              color: 'var(--color-text-primary)',
            }}
          >
            {stage.name}
          </span>
        </div>
        <span
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: 'var(--text-2xs)',
            fontWeight: 700,
            color: isComplete ? stage.color : 'var(--color-text-muted)',
          }}
        >
          {stage.completed}/{stage.total}
        </span>
      </div>
      <div
        style={{
          height: 4,
          borderRadius: 2,
          background: `${stage.color}12`,
          overflow: 'hidden',
        }}
      >
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: 'easeOut', delay: stage.stage * 0.05 }}
          style={{
            height: '100%',
            borderRadius: 2,
            background: stage.color,
          }}
        />
      </div>
    </div>
  )
}

/* ─── Market Concentric Visualization ─── */

function MarketCircles({
  tam,
  sam,
  som,
}: {
  tam: string
  sam: string
  som: string
}) {
  if (!tam && !sam && !som) return null

  const items = [
    { label: 'TAM', value: tam, color: '#1F77F620', border: '#1F77F640', size: 140 },
    { label: 'SAM', value: sam, color: '#1F77F620', border: '#1F77F640', size: 100 },
    { label: 'SOM', value: som, color: '#DA4E2425', border: '#DA4E2450', size: 60 },
  ]

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        height: 160,
      }}
    >
      {items.map((item, i) => (
        <motion.div
          key={item.label}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, delay: i * 0.15 }}
          style={{
            position: 'absolute',
            width: item.size,
            height: item.size,
            borderRadius: '50%',
            background: item.color,
            border: `2px solid ${item.border}`,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <span
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: 'var(--text-2xs)',
              fontWeight: 700,
              color: 'var(--color-text-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            {item.label}
          </span>
          {item.value && (
            <span
              style={{
                fontFamily: 'var(--font-heading)',
                fontSize: i === 0 ? 'var(--text-sm)' : 'var(--text-xs)',
                fontWeight: 700,
                color: 'var(--color-text-primary)',
              }}
            >
              {formatCurrency(item.value)}
            </span>
          )}
        </motion.div>
      ))}
    </div>
  )
}

/* ─── Print Styles ─── */

const PRINT_STYLE = `
@media print {
  body * { visibility: hidden !important; }
  #passport-printable, #passport-printable * { visibility: visible !important; }
  #passport-printable {
    position: absolute;
    left: 0;
    top: 0;
    width: 100%;
    padding: 2rem;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }
  nav, header, footer, .no-print { display: none !important; }
}
`

/* ═══════════════════════════════════════════════════
   PASSPORT PAGE
   ═══════════════════════════════════════════════════ */

export default function PassportPage() {
  const { user } = useAuth()
  const [passportData, setPassportData] = useState<PassportData | null>(null)
  const [completedCount, setCompletedCount] = useState(0)
  const [stageCertificates, setStageCertificates] = useState<number[]>([])
  const [stageProgressList, setStageProgressList] = useState<StageProgress[]>([])
  const [readinessScore, setReadinessScore] = useState(0)
  const [scoreBreakdown, setScoreBreakdown] = useState({
    diagnostic: 0,
    tools: 0,
    unitEcon: 0,
    traction: 0,
    team: 0,
  })
  const printRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!user) return

    try {
      const extra = JSON.parse(
        localStorage.getItem(`s4c_${user.id}_profile_extra`) ||
        '{}'
      )
      const progress = getProgress(user.id)

      // Pull data from completed tools
      const tamData = progress['tam-calculator']?.data
      const ltvData = progress['ltv-unit-economics']?.data || progress['ltv-calculator']?.data || progress['unit-economics']?.data
      const finData = progress['financial-model-builder']?.data || progress['financial-projections']?.data
      const impactData = progress['impact-metrics']?.data
      const capData = progress['cap-table-fundraising']?.data
      const pitchData = progress['pitch-deck-builder']?.data
      const custData = progress['first-10-customers']?.data

      const hasData = user.startup || extra.vertical || extra.country

      if (hasData || Object.keys(progress).length > 0) {
        // Parse SDG alignment
        let sdgs: number[] = []
        const rawSdgs = impactData?.sdgs || impactData?.sdgAlignment || extra.sdgs
        if (Array.isArray(rawSdgs)) {
          sdgs = rawSdgs.map((s: unknown) => Number(s)).filter((n: number) => !isNaN(n) && n >= 1 && n <= 17)
        }

        // Parse LTV/CAC ratio
        let ltvCacRatio = ''
        const ltvNum = parseFloat(String(ltvData?.ltv || extra.ltv || '0').replace(/[^0-9.-]/g, ''))
        const cacNum = parseFloat(String(ltvData?.cac || extra.cac || '0').replace(/[^0-9.-]/g, ''))
        if (ltvNum > 0 && cacNum > 0) {
          ltvCacRatio = (ltvNum / cacNum).toFixed(1)
        } else if (ltvData?.ltvCacRatio) {
          ltvCacRatio = String(ltvData.ltvCacRatio)
        }

        const data: PassportData = {
          startupName: user.startup || extra.startupName || '',
          vertical: extra.vertical || '',
          country: extra.country || '',
          founderName: user.name || '',
          founderRole: extra.role || extra.founderRole || 'CEO / Founder',
          teamSize: extra.teamSize ? Number(extra.teamSize) : 0,
          foundedYear: extra.foundedYear || extra.founded || '',
          website: extra.website || '',
          description: extra.description || extra.bio || '',

          tam: String(tamData?.tam || extra.tam || ''),
          sam: String(tamData?.sam || extra.sam || ''),
          som: String(tamData?.som || extra.som || ''),

          ltv: String(ltvData?.ltv || extra.ltv || ''),
          cac: String(ltvData?.cac || extra.cac || ''),
          ltvCacRatio,
          paybackMonths: String(ltvData?.paybackMonths || ltvData?.payback || extra.paybackMonths || ''),

          mrr: String(finData?.mrr || extra.mrr || ''),
          payingCustomers: Number(custData?.payingCustomers || custData?.totalCustomers || extra.payingCustomers || 0),
          momGrowth: String(finData?.momGrowth || finData?.growthRate || extra.momGrowth || ''),
          grossMargin: String(finData?.grossMargin || extra.grossMargin || ''),

          burnRate: String(finData?.burnRate || extra.burnRate || ''),
          runway: String(finData?.runway || extra.runway || ''),
          totalRaised: String(capData?.totalRaised || extra.totalRaised || ''),
          lastRound: String(capData?.lastRound || capData?.roundType || extra.lastRound || ''),

          co2Avoided: String(impactData?.co2Avoided || impactData?.co2 || extra.co2Avoided || ''),
          beneficiaries: String(impactData?.beneficiaries || extra.beneficiaries || ''),
          sdgAlignment: sdgs,

          unitEconomics: String(ltvData?.unitEconomics || extra.unitEconomics || ''),
          elevatorPitch: String(pitchData?.elevatorPitch || pitchData?.oneLiner || extra.elevatorPitch || ''),
        }

        setPassportData(data)

        // ─── Compute Investment Readiness Score ───
        const diagScore = user.diagnosticScore ?? 0

        // Tools completion
        const completedTools = Object.values(progress).filter((v) => v.completed)
        const totalT = TOOLS.length
        const toolsPct = totalT > 0 ? (completedTools.length / totalT) * 100 : 0

        // Unit economics health: LTV/CAC > 3 is ideal
        const ratioNum = parseFloat(data.ltvCacRatio || '0')
        let unitEconScore = 0
        if (ratioNum >= 3) unitEconScore = 100
        else if (ratioNum >= 2) unitEconScore = 75
        else if (ratioNum >= 1) unitEconScore = 50
        else if (ratioNum > 0) unitEconScore = 25

        // Traction: MRR > 0 and customers > 0
        const mrrNum = parseFloat(String(data.mrr).replace(/[^0-9.-]/g, '') || '0')
        let tractionScore = 0
        if (mrrNum > 0) tractionScore += 50
        if (data.payingCustomers > 0) tractionScore += 50

        // Team: > 3 is ideal
        let teamScore = 0
        if (data.teamSize >= 4) teamScore = 100
        else if (data.teamSize >= 3) teamScore = 75
        else if (data.teamSize >= 2) teamScore = 50
        else if (data.teamSize >= 1) teamScore = 25

        // Weighted composite
        const diagComponent = Math.round(diagScore * 0.25)
        const toolsComponent = Math.round(toolsPct * 0.20)
        const unitEconComponent = Math.round(unitEconScore * 0.20)
        const tractionComponent = Math.round(tractionScore * 0.20)
        const teamComponent = Math.round(teamScore * 0.15)
        const composite = diagComponent + toolsComponent + unitEconComponent + tractionComponent + teamComponent

        setReadinessScore(Math.min(100, composite))
        setScoreBreakdown({
          diagnostic: diagComponent,
          tools: toolsComponent,
          unitEcon: unitEconComponent,
          traction: tractionComponent,
          team: teamComponent,
        })

        setCompletedCount(completedTools.length)
      }

      // Stage progress
      const completedIds = new Set(
        Object.entries(progress)
          .filter(([, v]) => v.completed)
          .map(([k]) => k)
      )

      const stageList: StageProgress[] = []
      const certs: number[] = []

      for (const stageNum of [1, 2, 3, 4] as const) {
        const stageTools = TOOLS.filter((t) => t.stage === stageNum)
        const stageCompleted = stageTools.filter((t) => completedIds.has(t.id)).length
        const meta = STAGE_META[stageNum]

        stageList.push({
          stage: stageNum,
          name: meta.name,
          color: meta.color,
          total: stageTools.length,
          completed: stageCompleted,
        })

        if (stageTools.length > 0 && stageTools.every((t) => completedIds.has(t.id))) {
          certs.push(stageNum)
        }
      }

      setStageProgressList(stageList)
      setStageCertificates(certs)
    } catch {
      // ignore
    }
  }, [user])

  const handlePrint = useCallback(() => {
    window.print()
  }, [])

  if (!user) return null

  const diagnosticScore = user.diagnosticScore ?? 0
  const stageNum = user.stage ? Number(user.stage) : 1
  const stageMeta = STAGE_META[stageNum as 1 | 2 | 3 | 4] || STAGE_META[1]
  const totalTools = TOOLS.length
  const passportId = generatePassportId(user.id)

  // Derived health indicators
  const ltvCacNum = parseFloat(passportData?.ltvCacRatio || '0')
  const ltvCacHealth: 'green' | 'yellow' | 'red' = ltvCacNum >= 3 ? 'green' : ltvCacNum >= 1 ? 'yellow' : 'red'

  const runwayNum = parseFloat(String(passportData?.runway || '0').replace(/[^0-9.-]/g, ''))
  const runwayHealth: 'green' | 'yellow' | 'red' = runwayNum >= 12 ? 'green' : runwayNum >= 6 ? 'yellow' : 'red'

  // Card style helper
  const cardStyle: React.CSSProperties = {
    borderRadius: 12,
    background: 'var(--color-bg-card)',
    border: '1px solid var(--color-border)',
    padding: '1.25rem',
    marginBottom: '1rem',
    boxShadow: 'var(--shadow-card)',
  }

  // ─── Empty State ───
  if (!passportData && !diagnosticScore) {
    return (
      <div style={{ padding: '2rem', maxWidth: 960, margin: '0 auto' }}>
        <Link
          href="/tools"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.375rem',
            fontFamily: 'var(--font-body)',
            fontSize: 'var(--text-sm)',
            color: 'var(--color-text-muted)',
            textDecoration: 'none',
            marginBottom: '1.5rem',
          }}
        >
          <ArrowLeft size={14} />
          Volver al dashboard
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          style={{ marginBottom: '2rem' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
            <div
              style={{
                width: 40, height: 40, borderRadius: 12,
                background: 'rgba(59,130,246,0.08)',
                border: '1px solid rgba(59,130,246,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}
            >
              <Award size={20} color="#1F77F6" />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <h1
                style={{
                  fontFamily: 'var(--font-heading)',
                  fontSize: 'var(--text-xl)',
                  fontWeight: 700,
                  color: 'var(--color-text-primary)',
                  letterSpacing: '-0.02em',
                  lineHeight: 1.3,
                  margin: 0,
                }}
              >
                Startup Passport
              </h1>
              <p
                style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: 'var(--text-sm)',
                  color: 'var(--color-text-secondary)',
                  lineHeight: 1.5,
                  margin: 0,
                }}
              >
                Tu instrumento de identidad de startup para inversores
              </p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          style={{
            textAlign: 'center',
            padding: '4rem 2rem',
            borderRadius: 12,
            background: 'var(--color-bg-card)',
            border: '1px solid var(--color-border)',
            boxShadow: 'var(--shadow-card)',
          }}
        >
          <div
            style={{
              width: 64, height: 64, borderRadius: 12,
              background: 'rgba(59,130,246,0.08)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 1.5rem',
            }}
          >
            <Award size={28} color="#1F77F6" />
          </div>
          <p
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: '0.8125rem',
              color: 'var(--color-text-secondary)',
              maxWidth: 420,
              margin: '0 auto',
              lineHeight: 1.6,
            }}
          >
            Completa el diagnóstico y las herramientas para generar tu Startup Passport con métricas de inversión
          </p>
          <Link
            href="/tools"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              marginTop: '1.5rem',
              padding: '0.5rem 1rem',
              borderRadius: 8,
              background: '#1F77F6',
              color: 'white',
              fontFamily: 'var(--font-body)',
              fontSize: '0.8125rem',
              fontWeight: 600,
              textDecoration: 'none',
              boxShadow: '0 2px 10px rgba(59,130,246,0.25)',
            }}
          >
            Ir al diagnóstico
          </Link>
        </motion.div>
      </div>
    )
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: PRINT_STYLE }} />

      <div style={{ padding: '2rem', maxWidth: 960, margin: '0 auto' }}>
        {/* Back link */}
        <div className="no-print">
          <Link
            href="/tools"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.375rem',
              fontFamily: 'var(--font-body)',
              fontSize: 'var(--text-sm)',
              color: 'var(--color-text-muted)',
              textDecoration: 'none',
              marginBottom: '1.5rem',
            }}
          >
            <ArrowLeft size={14} />
            Volver al dashboard
          </Link>
        </div>

        {/* Page header */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          style={{ marginBottom: '1.5rem' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
            <div
              style={{
                width: 40, height: 40, borderRadius: 12,
                background: `${stageMeta.color}12`,
                border: `1px solid ${stageMeta.color}30`,
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}
            >
              <Award size={20} color={stageMeta.color} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <h1
                style={{
                  fontFamily: 'var(--font-heading)',
                  fontSize: 'var(--text-xl)',
                  fontWeight: 700,
                  color: 'var(--color-text-primary)',
                  letterSpacing: '-0.02em',
                  lineHeight: 1.3,
                  margin: 0,
                }}
              >
                Startup Passport
              </h1>
              <p
                style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: 'var(--text-sm)',
                  color: 'var(--color-text-secondary)',
                  lineHeight: 1.5,
                  margin: 0,
                }}
              >
                Instrumento de identidad para evaluacion de inversion
              </p>
            </div>
          </div>
        </motion.div>

        {/* ═══ Printable Passport Area ═══ */}
        <div id="passport-printable" ref={printRef}>

          {/* ──────────── 1. HEADER CARD ──────────── */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            style={{
              borderRadius: 14,
              background: 'var(--color-bg-card)',
              border: `2px solid ${stageMeta.color}25`,
              overflow: 'hidden',
              boxShadow: 'var(--shadow-float)',
              marginBottom: '1rem',
            }}
          >
            {/* Top band */}
            <div
              style={{
                background: `linear-gradient(135deg, ${stageMeta.color}, ${stageMeta.color}CC)`,
                padding: '1.25rem clamp(1.25rem, 3vw, 2rem)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '0.75rem',
              }}
            >
              <div>
                <div
                  style={{
                    fontFamily: 'var(--font-body)',
                    fontSize: 'var(--text-2xs)',
                    fontWeight: 700,
                    color: 'rgba(255,255,255,0.6)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.12em',
                    marginBottom: 4,
                  }}
                >
                  Startup Passport
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', flexWrap: 'wrap' }}>
                  <span
                    style={{
                      fontFamily: 'var(--font-heading)',
                      fontSize: 'var(--text-2xl)',
                      fontWeight: 700,
                      color: 'white',
                      lineHeight: 1.2,
                    }}
                  >
                    {passportData?.startupName || user.startup || 'Mi Startup'}
                  </span>
                  {passportData?.vertical && (
                    <span
                      style={{
                        padding: '0.125rem 0.5rem',
                        borderRadius: 6,
                        background: 'rgba(255,255,255,0.2)',
                        fontFamily: 'var(--font-body)',
                        fontSize: 'var(--text-2xs)',
                        fontWeight: 600,
                        color: 'white',
                      }}
                    >
                      {LATAM_VERTICALS[passportData.vertical] || passportData.vertical}
                    </span>
                  )}
                </div>
                {passportData?.country && (
                  <div
                    style={{
                      fontFamily: 'var(--font-body)',
                      fontSize: 'var(--text-sm)',
                      color: 'rgba(255,255,255,0.8)',
                      marginTop: 4,
                    }}
                  >
                    {getFlag(passportData.country)} {passportData.country}
                  </div>
                )}
              </div>

              {/* ID Badge */}
              <div style={{ textAlign: 'right' }}>
                <div
                  style={{
                    padding: '0.375rem 0.875rem',
                    borderRadius: 8,
                    background: 'rgba(255,255,255,0.15)',
                    backdropFilter: 'blur(8px)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    marginBottom: 6,
                  }}
                >
                  <div
                    style={{
                      fontFamily: 'var(--font-body)',
                      fontSize: 'var(--text-2xs)',
                      color: 'rgba(255,255,255,0.6)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.08em',
                    }}
                  >
                    {stageMeta.name}
                  </div>
                </div>
                <div
                  style={{
                    fontFamily: 'var(--font-body)',
                    fontSize: 'var(--text-2xs)',
                    fontWeight: 700,
                    color: 'rgba(255,255,255,0.5)',
                    letterSpacing: '0.15em',
                  }}
                >
                  {passportId}
                </div>
              </div>
            </div>

            {/* Body: Founder info */}
            <div style={{ padding: '1.25rem 1.5rem' }}>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(min(140px, 100%), 1fr))',
                  gap: '1rem',
                }}
              >
                <div>
                  <div
                    style={{
                      fontFamily: 'var(--font-body)',
                      fontSize: 'var(--text-2xs)',
                      color: 'var(--color-text-muted)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                      marginBottom: 3,
                    }}
                  >
                    Founder
                  </div>
                  <div
                    style={{
                      fontFamily: 'var(--font-heading)',
                      fontSize: 'var(--text-md)',
                      fontWeight: 700,
                      color: 'var(--color-text-primary)',
                    }}
                  >
                    {passportData?.founderName || user.name}
                  </div>
                  {passportData?.founderRole && (
                    <div
                      style={{
                        fontFamily: 'var(--font-body)',
                        fontSize: 'var(--text-2xs)',
                        color: 'var(--color-text-muted)',
                      }}
                    >
                      {passportData.founderRole}
                    </div>
                  )}
                </div>

                {passportData?.foundedYear && (
                  <div>
                    <div
                      style={{
                        fontFamily: 'var(--font-body)',
                        fontSize: 'var(--text-2xs)',
                        color: 'var(--color-text-muted)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.06em',
                        marginBottom: 3,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                      }}
                    >
                      <Calendar size={9} />
                      Fundada
                    </div>
                    <div
                      style={{
                        fontFamily: 'var(--font-heading)',
                        fontSize: 'var(--text-md)',
                        fontWeight: 700,
                        color: 'var(--color-text-primary)',
                      }}
                    >
                      {passportData.foundedYear}
                    </div>
                  </div>
                )}

                {(passportData?.teamSize ?? 0) > 0 && (
                  <div>
                    <div
                      style={{
                        fontFamily: 'var(--font-body)',
                        fontSize: 'var(--text-2xs)',
                        color: 'var(--color-text-muted)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.06em',
                        marginBottom: 3,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                      }}
                    >
                      <Users size={9} />
                      Equipo
                    </div>
                    <div
                      style={{
                        fontFamily: 'var(--font-heading)',
                        fontSize: 'var(--text-md)',
                        fontWeight: 700,
                        color: 'var(--color-text-primary)',
                      }}
                    >
                      {passportData?.teamSize} personas
                    </div>
                  </div>
                )}

                <div>
                  <div
                    style={{
                      fontFamily: 'var(--font-body)',
                      fontSize: 'var(--text-2xs)',
                      color: 'var(--color-text-muted)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                      marginBottom: 3,
                    }}
                  >
                    Etapa
                  </div>
                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                      padding: '0.125rem 0.5rem',
                      borderRadius: 6,
                      background: `${stageMeta.color}12`,
                      border: `1px solid ${stageMeta.color}25`,
                    }}
                  >
                    <div
                      style={{ width: 5, height: 5, borderRadius: '50%', background: stageMeta.color }}
                    />
                    <span
                      style={{
                        fontFamily: 'var(--font-body)',
                        fontSize: 'var(--text-xs)',
                        fontWeight: 700,
                        color: stageMeta.color,
                      }}
                    >
                      {stageMeta.name}
                    </span>
                  </div>
                </div>

                {passportData?.website && (
                  <div>
                    <div
                      style={{
                        fontFamily: 'var(--font-body)',
                        fontSize: 'var(--text-2xs)',
                        color: 'var(--color-text-muted)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.06em',
                        marginBottom: 3,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                      }}
                    >
                      <Link2 size={9} />
                      Web
                    </div>
                    <div
                      style={{
                        fontFamily: 'var(--font-body)',
                        fontSize: 'var(--text-sm)',
                        fontWeight: 600,
                        color: 'var(--color-text-primary)',
                        wordBreak: 'break-all',
                      }}
                    >
                      {passportData.website}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>

          {/* ──────────── 2. INVESTMENT READINESS SCORE ──────────── */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.05 }}
            style={cardStyle}
          >
            <SectionHeader
              title="Investment Readiness Score"
              icon={Zap}
              color={getGradeColor(readinessScore)}
              badge={getLetterGrade(readinessScore)}
            />

            <div
              style={{
                display: 'flex',
                gap: '2rem',
                alignItems: 'center',
                flexWrap: 'wrap',
              }}
            >
              {/* Circular score */}
              <div style={{ flexShrink: 0, display: 'flex', justifyContent: 'center' }}>
                <CircularProgress
                  score={readinessScore}
                  size={140}
                  grade={getLetterGrade(readinessScore)}
                />
              </div>

              {/* Breakdown bars */}
              <div style={{ flex: 1, minWidth: 200 }}>
                <ScoreBar
                  label="Diagnóstico (25%)"
                  score={scoreBreakdown.diagnostic}
                  maxScore={25}
                  color="#1F77F6"
                />
                <ScoreBar
                  label="Herramientas completadas (20%)"
                  score={scoreBreakdown.tools}
                  maxScore={20}
                  color="#1F77F6"
                />
                <ScoreBar
                  label="Unit Economics (20%)"
                  score={scoreBreakdown.unitEcon}
                  maxScore={20}
                  color="#F0721D"
                />
                <ScoreBar
                  label="Traccion (20%)"
                  score={scoreBreakdown.traction}
                  maxScore={20}
                  color="#DA4E24"
                />
                <ScoreBar
                  label="Equipo (15%)"
                  score={scoreBreakdown.team}
                  maxScore={15}
                  color="#8B5CF6"
                />
              </div>
            </div>
          </motion.div>

          {/* ──────────── 3. UNIT ECONOMICS DASHBOARD ──────────── */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            style={cardStyle}
          >
            <SectionHeader title="Unit Economics" icon={BarChart3} color="#1F77F6" />

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(min(160px, 100%), 1fr))',
                gap: '0.625rem',
                marginBottom: '0.75rem',
              }}
            >
              <KpiCell
                label="LTV"
                value={formatCurrency(passportData?.ltv)}
              />
              <KpiCell
                label="CAC"
                value={formatCurrency(passportData?.cac)}
              />
              <KpiCell
                label="LTV / CAC"
                value={passportData?.ltvCacRatio ? formatRatio(passportData.ltvCacRatio) : '—'}
                health={passportData?.ltvCacRatio ? ltvCacHealth : undefined}
                subtext={
                  passportData?.ltvCacRatio
                    ? ltvCacHealth === 'green'
                      ? 'Saludable'
                      : ltvCacHealth === 'yellow'
                      ? 'Mejorable'
                      : 'Critico'
                    : undefined
                }
              />
              <KpiCell
                label="Payback"
                value={passportData?.paybackMonths ? `${passportData.paybackMonths} meses` : '—'}
              />
            </div>

            {/* Unit Economics Health Bar */}
            {passportData?.ltvCacRatio && (
              <div
                style={{
                  padding: '0.625rem 0.75rem',
                  borderRadius: 8,
                  background: `${ltvCacHealth === 'green' ? '#1F77F6' : ltvCacHealth === 'yellow' ? '#F0721D' : '#DC2626'}08`,
                  border: `1px solid ${ltvCacHealth === 'green' ? '#1F77F6' : ltvCacHealth === 'yellow' ? '#F0721D' : '#DC2626'}20`,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}
              >
                <div
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: ltvCacHealth === 'green' ? '#1F77F6' : ltvCacHealth === 'yellow' ? '#F0721D' : '#DC2626',
                  }}
                />
                <span
                  style={{
                    fontFamily: 'var(--font-body)',
                    fontSize: 'var(--text-2xs)',
                    fontWeight: 600,
                    color: ltvCacHealth === 'green' ? '#1F77F6' : ltvCacHealth === 'yellow' ? '#F0721D' : '#DC2626',
                  }}
                >
                  {ltvCacHealth === 'green'
                    ? 'Unit Economics saludable — LTV/CAC >= 3x'
                    : ltvCacHealth === 'yellow'
                    ? 'Unit Economics mejorable — LTV/CAC entre 1x y 3x'
                    : 'Unit Economics critico — LTV/CAC < 1x'}
                </span>
              </div>
            )}
          </motion.div>

          {/* ──────────── 4. TRACTION SCORECARD ──────────── */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15 }}
            style={cardStyle}
          >
            <SectionHeader title="Traccion" icon={TrendingUp} color="#DA4E24" />

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(min(160px, 100%), 1fr))',
                gap: '0.625rem',
              }}
            >
              <KpiCell
                label="MRR"
                value={formatCurrency(passportData?.mrr)}
                color={parseFloat(String(passportData?.mrr || '0').replace(/[^0-9.-]/g, '')) > 0 ? '#1F77F6' : undefined}
              />
              <KpiCell
                label="Clientes pagando"
                value={passportData?.payingCustomers || '—'}
                color={
                  (passportData?.payingCustomers ?? 0) > 0 ? '#1F77F6' : undefined
                }
              />
              <KpiCell
                label="Crecimiento MoM"
                value={formatPercent(passportData?.momGrowth)}
              />
              <KpiCell
                label="Margen bruto"
                value={formatPercent(passportData?.grossMargin)}
              />
            </div>
          </motion.div>

          {/* ──────────── 5. MARKET OPPORTUNITY ──────────── */}
          {(passportData?.tam || passportData?.sam || passportData?.som) && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              style={cardStyle}
            >
              <SectionHeader title="Oportunidad de mercado" icon={Target} color="#1F77F6" />

              <MarketCircles
                tam={passportData?.tam || ''}
                sam={passportData?.sam || ''}
                som={passportData?.som || ''}
              />

              {/* Legend below */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'center',
                  gap: '1.5rem',
                  marginTop: '0.75rem',
                  flexWrap: 'wrap',
                }}
              >
                {[
                  { label: 'TAM', value: passportData?.tam, desc: 'Total Addressable Market' },
                  { label: 'SAM', value: passportData?.sam, desc: 'Serviceable Addressable Market' },
                  { label: 'SOM', value: passportData?.som, desc: 'Serviceable Obtainable Market' },
                ].filter(i => i.value).map((item) => (
                  <div key={item.label} style={{ textAlign: 'center' }}>
                    <div
                      style={{
                        fontFamily: 'var(--font-heading)',
                        fontSize: 'var(--text-base)',
                        fontWeight: 700,
                        color: 'var(--color-text-primary)',
                      }}
                    >
                      {formatCurrency(item.value)}
                    </div>
                    <div
                      style={{
                        fontFamily: 'var(--font-body)',
                        fontSize: 'var(--text-2xs)',
                        color: 'var(--color-text-muted)',
                      }}
                    >
                      {item.desc}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* ──────────── 6. FINANCIAL POSITION ──────────── */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.25 }}
            style={cardStyle}
          >
            <SectionHeader title="Posicion financiera" icon={DollarSign} color="var(--color-text-primary)" />

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(min(160px, 100%), 1fr))',
                gap: '0.625rem',
              }}
            >
              <KpiCell
                label="Burn rate mensual"
                value={formatCurrency(passportData?.burnRate)}
              />
              <KpiCell
                label="Runway"
                value={passportData?.runway ? `${passportData.runway} meses` : '—'}
                health={passportData?.runway ? runwayHealth : undefined}
                subtext={
                  passportData?.runway
                    ? runwayHealth === 'green'
                      ? '+12 meses'
                      : runwayHealth === 'yellow'
                      ? '6-12 meses'
                      : '<6 meses'
                    : undefined
                }
              />
              <KpiCell
                label="Capital levantado"
                value={formatCurrency(passportData?.totalRaised)}
              />
              <KpiCell
                label="Ultima ronda"
                value={passportData?.lastRound || '—'}
              />
            </div>
          </motion.div>

          {/* ──────────── 7. IMPACT & ESG ──────────── */}
          {(passportData?.co2Avoided || passportData?.beneficiaries || (passportData?.sdgAlignment && passportData.sdgAlignment.length > 0)) && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              style={cardStyle}
            >
              <SectionHeader title="Impacto & ESG" icon={Leaf} color="#1F77F6" />

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(min(180px, 100%), 1fr))',
                  gap: '0.625rem',
                  marginBottom: passportData?.sdgAlignment && passportData.sdgAlignment.length > 0 ? '1rem' : 0,
                }}
              >
                {passportData?.co2Avoided && (
                  <KpiCell
                    label="CO2 evitado"
                    value={passportData.co2Avoided}
                    color="#1F77F6"
                  />
                )}
                {passportData?.beneficiaries && (
                  <KpiCell
                    label="Beneficiarios"
                    value={passportData.beneficiaries}
                    color="#1F77F6"
                  />
                )}
              </div>

              {/* SDG Badges */}
              {passportData?.sdgAlignment && passportData.sdgAlignment.length > 0 && (
                <div>
                  <div
                    style={{
                      fontFamily: 'var(--font-body)',
                      fontSize: 'var(--text-2xs)',
                      color: 'var(--color-text-muted)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                      marginBottom: 8,
                    }}
                  >
                    Alineacion con ODS
                  </div>
                  <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap' }}>
                    {passportData.sdgAlignment.map((sdg) => (
                      <motion.div
                        key={sdg}
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ duration: 0.3, delay: sdg * 0.03 }}
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 6,
                          background: SDG_COLORS[sdg] || '#666',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontFamily: 'var(--font-heading)',
                          fontSize: 'var(--text-xs)',
                          fontWeight: 700,
                          color: 'white',
                        }}
                      >
                        {sdg}
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* ──────────── 8. STARTUP DESCRIPTION ──────────── */}
          {passportData?.description && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.35 }}
              style={cardStyle}
            >
              <SectionHeader title="Descripcion" icon={FileText} color="var(--color-text-primary)" />
              <p
                style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: 'var(--text-sm)',
                  color: 'var(--color-text-secondary)',
                  lineHeight: 1.7,
                  margin: 0,
                }}
              >
                {passportData.description}
              </p>
              {passportData?.elevatorPitch && (
                <div
                  style={{
                    marginTop: '0.75rem',
                    padding: '0.75rem',
                    borderRadius: 8,
                    background: `${stageMeta.color}10`,
                    border: `1px solid ${stageMeta.color}30`,
                  }}
                >
                  <div
                    style={{
                      fontFamily: 'var(--font-body)',
                      fontSize: 'var(--text-2xs)',
                      fontWeight: 700,
                      color: 'var(--color-text-muted)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                      marginBottom: 4,
                    }}
                  >
                    Elevator Pitch
                  </div>
                  <p
                    style={{
                      fontFamily: 'var(--font-body)',
                      fontSize: 'var(--text-sm)',
                      color: 'var(--color-text-primary)',
                      fontWeight: 500,
                      lineHeight: 1.6,
                      margin: 0,
                    }}
                  >
                    &ldquo;{passportData.elevatorPitch}&rdquo;
                  </p>
                </div>
              )}
            </motion.div>
          )}

          {/* ──────────── 9. TOOLS PROGRESS BY STAGE ──────────── */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            style={cardStyle}
          >
            <SectionHeader
              title="Progreso por etapa"
              icon={BarChart3}
              color="#1F77F6"
              badge={`${completedCount}/${totalTools}`}
            />

            {/* Overall progress */}
            <div style={{ marginBottom: '1rem' }}>
              <div
                style={{
                  height: 6,
                  borderRadius: 3,
                  background: 'rgba(31,119,246,0.10)',
                  overflow: 'hidden',
                }}
              >
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${totalTools > 0 ? (completedCount / totalTools) * 100 : 0}%` }}
                  transition={{ duration: 1, ease: 'easeOut' }}
                  style={{
                    height: '100%',
                    borderRadius: 3,
                    background: '#1F77F6',
                  }}
                />
              </div>
            </div>

            {stageProgressList.map((sp) => (
              <StageProgressBar key={sp.stage} stage={sp} />
            ))}
          </motion.div>

          {/* ──────────── 10. STAGE CERTIFICATES ──────────── */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.45 }}
            style={cardStyle}
          >
            <SectionHeader title="Certificados de etapa" icon={Award} color="#1F77F6" />

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(min(140px, 100%), 1fr))',
                gap: '0.625rem',
              }}
            >
              {([1, 2, 3, 4] as const).map((s) => {
                const meta = STAGE_META[s]
                const earned = stageCertificates.includes(s)
                const stageInfo = stageProgressList.find((sp) => sp.stage === s)
                const pct = stageInfo && stageInfo.total > 0
                  ? Math.round((stageInfo.completed / stageInfo.total) * 100)
                  : 0

                return (
                  <motion.div
                    key={s}
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.45 + s * 0.08 }}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '0.375rem',
                      padding: '1rem 0.75rem',
                      borderRadius: 10,
                      background: earned ? `${meta.color}08` : 'var(--color-bg-primary)',
                      border: `1.5px solid ${earned ? meta.color : 'var(--color-border)'}`,
                      opacity: earned ? 1 : 0.5,
                      position: 'relative',
                      overflow: 'hidden',
                    }}
                  >
                    {earned && (
                      <div
                        style={{
                          position: 'absolute',
                          top: -15,
                          right: -15,
                          width: 40,
                          height: 40,
                          borderRadius: '50%',
                          background: `${meta.color}12`,
                          filter: 'blur(15px)',
                        }}
                      />
                    )}
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 10,
                        background: earned ? `${meta.color}15` : 'var(--color-bg-primary)',
                        border: `1.5px solid ${earned ? meta.color + '40' : 'var(--color-border)'}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Award
                        size={18}
                        color={earned ? meta.color : 'var(--color-text-muted)'}
                        strokeWidth={earned ? 2.5 : 1.5}
                      />
                    </div>
                    <span
                      style={{
                        fontFamily: 'var(--font-body)',
                        fontSize: 'var(--text-2xs)',
                        fontWeight: 700,
                        color: earned ? meta.color : 'var(--color-text-muted)',
                        textAlign: 'center',
                      }}
                    >
                      {meta.name}
                    </span>
                    <span
                      style={{
                        fontFamily: 'var(--font-body)',
                        fontSize: 'var(--text-2xs)',
                        color: earned ? meta.color : 'var(--color-text-muted)',
                      }}
                    >
                      {earned ? 'Completado' : `${pct}%`}
                    </span>
                  </motion.div>
                )
              })}
            </div>
          </motion.div>

          {/* ──────────── DIAGNOSTIC SCORE (compact) ──────────── */}
          {diagnosticScore > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.5 }}
              style={{
                ...cardStyle,
                display: 'flex',
                alignItems: 'center',
                gap: '1.25rem',
                flexWrap: 'wrap',
              }}
            >
              <CircularProgress score={diagnosticScore} size={80} label="Diagnóstico" />
              <div>
                <div
                  style={{
                    fontFamily: 'var(--font-heading)',
                    fontSize: 'var(--text-base)',
                    fontWeight: 700,
                    color: 'var(--color-text-primary)',
                    marginBottom: 2,
                  }}
                >
                  Puntaje de diagnóstico
                </div>
                <div
                  style={{
                    fontFamily: 'var(--font-body)',
                    fontSize: 'var(--text-xs)',
                    color: 'var(--color-text-muted)',
                  }}
                >
                  Evaluacion inicial de startup readiness
                </div>
              </div>
            </motion.div>
          )}
        </div>

        {/* ──────────── 11. ACTIONS BAR ──────────── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.55 }}
          className="no-print"
          style={{
            display: 'flex',
            gap: '0.625rem',
            flexWrap: 'wrap',
            marginTop: '0.5rem',
          }}
        >
          <button
            onClick={handlePrint}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.5rem 1rem',
              borderRadius: 8,
              background: stageMeta.color,
              color: 'white',
              fontFamily: 'var(--font-body)',
              fontSize: 'var(--text-sm)',
              fontWeight: 600,
              border: 'none',
              cursor: 'pointer',
              boxShadow: `0 2px 12px ${stageMeta.color}40`,
              transition: 'all 0.2s',
            }}
          >
            <Printer size={15} />
            Descargar Passport
          </button>
          <button
            onClick={handlePrint}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.5rem 1rem',
              borderRadius: 8,
              background: 'var(--color-bg-primary)',
              color: 'var(--color-text-primary)',
              fontFamily: 'var(--font-body)',
              fontSize: 'var(--text-sm)',
              fontWeight: 600,
              border: '1px solid var(--color-border)',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            <Download size={15} />
            Imprimir
          </button>
          <button
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.5rem 1rem',
              borderRadius: 8,
              background: 'var(--color-bg-primary)',
              color: 'var(--color-text-secondary)',
              fontFamily: 'var(--font-body)',
              fontSize: 'var(--text-sm)',
              fontWeight: 600,
              border: '1px solid var(--color-border)',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            <Share2 size={15} />
            Compartir
          </button>
        </motion.div>
      </div>
    </>
  )
}
