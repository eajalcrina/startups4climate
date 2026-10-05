'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  ScrollText, Building2, Shield, Users, Mail, LifeBuoy,
  Activity, Calendar, ChevronDown, Loader2, LogIn, UserCog,
  Wrench, FileSpreadsheet, Bot, KeyRound, Settings, UserPlus,
  CheckCircle2, AlertTriangle, XCircle, Clock,
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'

interface ActivityEntry {
  id: string
  actor_id: string | null
  actor_name?: string
  actor_role?: string
  actor_org?: string
  action: string
  entity_type: string
  entity_id: string | null
  metadata: Record<string, unknown> | null
  created_at: string
  result?: 'success' | 'warning' | 'error'
  ip?: string
}

const ACTION_ICONS: Record<string, typeof Building2> = {
  'auth.login': LogIn,
  'auth.password_reset': KeyRound,
  'profile.updated': UserCog,
  'tool.completed': Wrench,
  'cohort.created': Users,
  'cohort.member_added': UserPlus,
  'invitation.sent': Mail,
  'invitation.accepted': CheckCircle2,
  'report.generated': FileSpreadsheet,
  'settings.changed': Settings,
  'user.role_changed': Shield,
  'ticket.opened': LifeBuoy,
  'ticket.resolved': CheckCircle2,
  'ai.chat_started': Bot,
  'org.created': Building2,
}

const ACTION_COLORS: Record<string, string> = {
  'auth.login': '#1F77F6',
  'auth.password_reset': '#8B5CF6',
  'profile.updated': '#1F77F6',
  'tool.completed': '#1F77F6',
  'cohort.created': '#1F77F6',
  'cohort.member_added': '#0EA5E9',
  'invitation.sent': '#EA580C',
  'invitation.accepted': '#10B981',
  'report.generated': '#1F77F6',
  'settings.changed': '#6B7280',
  'user.role_changed': '#8B5CF6',
  'ticket.opened': '#DC2626',
  'ticket.resolved': '#10B981',
  'ai.chat_started': '#7C3AED',
  'org.created': '#1F77F6',
}

const ACTION_LABELS: Record<string, string> = {
  'auth.login': 'Inició sesión',
  'auth.password_reset': 'Solicitó reset de contraseña',
  'profile.updated': 'Actualizó su perfil',
  'tool.completed': 'Completó una herramienta',
  'cohort.created': 'Creó una cohorte',
  'cohort.member_added': 'Agregó startup a cohorte',
  'invitation.sent': 'Envió invitación',
  'invitation.accepted': 'Aceptó invitación',
  'report.generated': 'Generó reporte',
  'settings.changed': 'Modificó configuración',
  'user.role_changed': 'Cambió rol de usuario',
  'ticket.opened': 'Abrió incidencia',
  'ticket.resolved': 'Resolvió incidencia',
  'ai.chat_started': 'Inició chat con mentor AI',
  'org.created': 'Creó organización',
}

const EVENT_TYPES = [
  { value: 'all', label: 'Todos los eventos' },
  { value: 'auth.login', label: 'Logins' },
  { value: 'auth.password_reset', label: 'Reset de contraseña' },
  { value: 'profile.updated', label: 'Actualizaciones de perfil' },
  { value: 'tool.completed', label: 'Tools completados' },
  { value: 'cohort.created', label: 'Cohortes creadas' },
  { value: 'cohort.member_added', label: 'Startups agregadas' },
  { value: 'invitation.sent', label: 'Invitaciones enviadas' },
  { value: 'invitation.accepted', label: 'Invitaciones aceptadas' },
  { value: 'report.generated', label: 'Reportes generados' },
  { value: 'settings.changed', label: 'Cambios de settings' },
  { value: 'user.role_changed', label: 'Cambios de rol' },
  { value: 'ticket.opened', label: 'Incidencias abiertas' },
  { value: 'ticket.resolved', label: 'Incidencias resueltas' },
  { value: 'ai.chat_started', label: 'Chats AI' },
]

const RESULT_CONFIG: Record<NonNullable<ActivityEntry['result']>, { color: string; bg: string; label: string; Icon: typeof CheckCircle2 }> = {
  success: { color: '#10B981', bg: 'rgba(16,185,129,0.12)', label: 'Éxito', Icon: CheckCircle2 },
  warning: { color: '#F59E0B', bg: 'rgba(245,158,11,0.12)', label: 'Atención', Icon: AlertTriangle },
  error:   { color: '#DC2626', bg: 'rgba(220,38,38,0.12)', label: 'Error', Icon: XCircle },
}

const cardStyle: React.CSSProperties = {
  background: 'var(--color-bg-card)',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-md)',
  padding: '1.5rem',
  boxShadow: 'var(--shadow-card)',
}

const selectStyle: React.CSSProperties = {
  padding: '0.5rem 0.75rem',
  borderRadius: 'var(--radius-md)',
  border: '1px solid var(--color-border)',
  background: 'var(--color-bg-card)',
  fontFamily: 'var(--font-body)',
  fontSize: '0.8125rem',
  color: 'var(--color-text-primary)',
  outline: 'none',
  cursor: 'pointer',
  appearance: 'none' as const,
  backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'12\' height=\'12\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%236B7280\' stroke-width=\'2\'%3E%3Cpath d=\'M6 9l6 6 6-6\'/%3E%3C/svg%3E")',
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'right 0.75rem center',
  paddingRight: '2rem',
}

const inputStyle: React.CSSProperties = {
  padding: '0.5rem 0.75rem',
  borderRadius: 'var(--radius-md)',
  border: '1px solid var(--color-border)',
  background: 'var(--color-bg-card)',
  fontFamily: 'var(--font-body)',
  fontSize: '0.8125rem',
  color: 'var(--color-text-primary)',
  outline: 'none',
}

const fadeUp = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, ease: 'easeOut' as const },
}

function relativeTime(dateStr: string): string {
  const now = new Date()
  const date = new Date(dateStr)
  const diffMs = now.getTime() - date.getTime()
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHour = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHour / 24)

  if (diffSec < 60) return 'hace unos segundos'
  if (diffMin < 60) return `hace ${diffMin} min`
  if (diffHour < 24) return `hace ${diffHour}h`
  if (diffDay < 7) return `hace ${diffDay}d`
  return date.toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' })
}

function dayLabel(dateStr: string): string {
  const date = new Date(dateStr)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)

  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()

  if (sameDay(date, today)) return 'Hoy'
  if (sameDay(date, yesterday)) return 'Ayer'

  return date.toLocaleDateString('es-CL', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: date.getFullYear() === today.getFullYear() ? undefined : 'numeric',
  })
}

function dayKey(dateStr: string): string {
  const d = new Date(dateStr)
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
}

// ────────────────────────────────────────────────────────────
// DEMO DATA
// ────────────────────────────────────────────────────────────

function hoursAgo(h: number): string {
  return new Date(Date.now() - h * 60 * 60 * 1000).toISOString()
}
function minutesAgo(m: number): string {
  return new Date(Date.now() - m * 60 * 1000).toISOString()
}
function daysAgo(d: number, hours = 9): string {
  const date = new Date()
  date.setDate(date.getDate() - d)
  date.setHours(hours, Math.floor(Math.random() * 60), 0, 0)
  return date.toISOString()
}

const DEMO_ACTORS = {
  ana: { id: 'demo-ana', name: 'Ana Quispe', role: 'founder', org: 'BioInnova UNAMAD', ip: '190.235.18.42' },
  carlos: { id: 'demo-carlos', name: 'Carlos Mamani', role: 'founder', org: 'UNAMAD', ip: '190.232.55.18' },
  rosa: { id: 'demo-rosa', name: 'Rosa Choque', role: 'founder', org: 'Universidad Wiener', ip: '190.233.12.91' },
  diego: { id: 'demo-diego', name: 'Diego Huamán', role: 'founder', org: 'Hub UDEP', ip: '200.121.44.7' },
  valeria: { id: 'demo-valeria', name: 'Valeria Salas', role: 'founder', org: 'Innóvate Cusco', ip: '190.232.88.44' },
  jorge: { id: 'demo-jorge', name: 'Jorge Linares', role: 'founder', org: 'AceleraGap', ip: '200.48.225.31' },
  lucia: { id: 'demo-lucia', name: 'Lucía Paredes', role: 'founder', org: 'Energía Verde Arequipa', ip: '190.235.66.12' },
  pablo: { id: 'demo-pablo', name: 'Pablo Quintana', role: 'founder', org: 'AgriHub La Libertad', ip: '190.236.41.55' },
  maria: { id: 'demo-maria', name: 'María Fernández', role: 'admin_org', org: 'BioInnova UNAMAD', ip: '190.232.18.4' },
  hector: { id: 'demo-hector', name: 'Héctor Ríos', role: 'admin_org', org: 'Universidad Wiener', ip: '190.235.12.7' },
  patricia: { id: 'demo-patricia', name: 'Patricia Vega', role: 'admin_org', org: 'UNAMAD', ip: '190.232.55.66' },
  ricardo: { id: 'demo-ricardo', name: 'Ricardo Fuentes', role: 'admin_org', org: 'Hub UDEP', ip: '200.121.44.18' },
  sandra: { id: 'demo-sandra', name: 'Sandra Pacheco', role: 'admin_org', org: 'Innóvate Cusco', ip: '190.232.88.91' },
  lorenzo: { id: 'demo-lorenzo', name: 'Lorenzo Ortiz', role: 'superadmin', org: 'Redesign Lab', ip: '186.30.18.55' },
  eddie: { id: 'demo-eddie', name: 'Eddie Ajalcriña', role: 'superadmin', org: 'Redesign Lab', ip: '186.30.18.61' },
  system: { id: null, name: 'Sistema', role: 'system', org: '—', ip: '—' },
}

type Actor = typeof DEMO_ACTORS[keyof typeof DEMO_ACTORS]

function evt(
  id: string,
  actor: Actor,
  action: string,
  entity_type: string,
  entity_id: string | null,
  metadata: Record<string, unknown>,
  created_at: string,
  result: ActivityEntry['result'] = 'success',
): ActivityEntry {
  return {
    id,
    actor_id: actor.id,
    actor_name: actor.name,
    actor_role: actor.role,
    actor_org: actor.org,
    action,
    entity_type,
    entity_id,
    metadata,
    created_at,
    result,
    ip: actor.ip,
  }
}

const A = DEMO_ACTORS

const DEMO_ACTIVITY: ActivityEntry[] = [
  // ─── Hoy ───
  evt('a-001', A.ana, 'tool.completed', 'tool', 'pitch-deck-builder', { tool_name: 'Pitch Deck Builder', completed_in: '23 min' }, minutesAgo(8)),
  evt('a-002', A.lorenzo, 'auth.login', 'session', null, { method: 'email', browser: 'Chrome 134' }, minutesAgo(15)),
  evt('a-003', A.maria, 'report.generated', 'report', 'cohort-bioinnova-2026-1', { format: 'xlsx', startups: 12, file_size: '48 KB' }, minutesAgo(34)),
  evt('a-004', A.diego, 'ai.chat_started', 'chat', 'chat-8821', { tool_id: 'unit-economics', messages: 6 }, minutesAgo(42)),
  evt('a-005', A.carlos, 'tool.completed', 'tool', 'lean-canvas', { tool_name: 'Lean Canvas', completed_in: '18 min' }, hoursAgo(1)),
  evt('a-006', A.hector, 'invitation.sent', 'invitation', 'inv-2026-0188', { email: 'jhonny.romero@ucsm.edu.pe', cohort: 'Wiener Health Tech 2026' }, hoursAgo(2)),
  evt('a-007', A.rosa, 'profile.updated', 'profile', A.rosa.id, { fields: ['businessModel', 'currentMRR', 'sdgImpact'] }, hoursAgo(2)),
  evt('a-008', A.valeria, 'tool.completed', 'tool', 'cap-table-fundraising', { tool_name: 'Cap Table & Fundraising', completed_in: '31 min' }, hoursAgo(3)),
  evt('a-009', A.system, 'ticket.opened', 'ticket', 'INC-2026-0341', { reporter: 'Carlos Mamani', priority: 'high', category: 'ai' }, hoursAgo(3), 'warning'),
  evt('a-010', A.eddie, 'auth.login', 'session', null, { method: 'email', browser: 'Safari 18' }, hoursAgo(4)),
  evt('a-011', A.lucia, 'invitation.accepted', 'invitation', 'inv-2026-0181', { invited_by: 'Sandra Pacheco', cohort: 'Innóvate Cusco Q2' }, hoursAgo(5)),
  evt('a-012', A.patricia, 'cohort.member_added', 'cohort', 'cohort-unamad-2026-1', { startup_name: 'EcoBio Perú', founder: 'Ana Quispe' }, hoursAgo(6)),
  evt('a-013', A.ana, 'auth.login', 'session', null, { method: 'email', browser: 'Chrome 134 (Android)' }, hoursAgo(7)),
  evt('a-014', A.system, 'ai.chat_started', 'chat', 'chat-8819', { tool_id: 'go-to-market', actor_name: 'Pablo Quintana', messages: 4 }, hoursAgo(7)),
  evt('a-015', A.ricardo, 'settings.changed', 'organization', 'org-udep', { fields: ['mainContactPhone', 'cohortFrequency'] }, hoursAgo(8)),

  // ─── Ayer ───
  evt('a-016', A.sandra, 'cohort.created', 'cohort', 'cohort-cusco-2026-2', { name: 'Innóvate Cusco Energía Q3', startups: 0, start_date: '2026-05-04' }, daysAgo(1, 16)),
  evt('a-017', A.maria, 'invitation.sent', 'invitation', 'inv-2026-0175', { email: 'felix.condori@bioinnova.pe', cohort: 'BioInnova MdD 2026' }, daysAgo(1, 15)),
  evt('a-018', A.lorenzo, 'user.role_changed', 'profile', 'demo-hector', { from: 'founder', to: 'admin_org', target: 'Héctor Ríos' }, daysAgo(1, 14)),
  evt('a-019', A.jorge, 'tool.completed', 'tool', 'mvbp-definition', { tool_name: 'MVBP Definition', completed_in: '27 min' }, daysAgo(1, 13)),
  evt('a-020', A.ana, 'tool.completed', 'tool', 'data-room-builder', { tool_name: 'Data Room Builder', completed_in: '44 min' }, daysAgo(1, 12)),
  evt('a-021', A.system, 'ticket.resolved', 'ticket', 'INC-2026-0322', { priority: 'high', resolved_by: 'Eddie Ajalcriña', mttr: '4h 12m' }, daysAgo(1, 11)),
  evt('a-022', A.diego, 'ai.chat_started', 'chat', 'chat-8801', { tool_id: 'pitch-deck-builder', messages: 9 }, daysAgo(1, 10)),
  evt('a-023', A.pablo, 'profile.updated', 'profile', A.pablo.id, { fields: ['region', 'foundedYear', 'totalFunding'] }, daysAgo(1, 9)),
  evt('a-024', A.hector, 'report.generated', 'report', 'cohort-wiener-2026-1', { format: 'xlsx', startups: 18 }, daysAgo(1, 9)),

  // ─── Hace 2 días ───
  evt('a-025', A.rosa, 'tool.completed', 'tool', 'unit-economics', { tool_name: 'Unit Economics', completed_in: '38 min' }, daysAgo(2, 17)),
  evt('a-026', A.ricardo, 'cohort.member_added', 'cohort', 'cohort-udep-2026-1', { startup_name: 'CleanLab Piura', founder: 'Diego Huamán' }, daysAgo(2, 15)),
  evt('a-027', A.system, 'auth.password_reset', 'session', null, { actor_name: 'Lucía Paredes', email: 'lucia.paredes@energiaverde.pe' }, daysAgo(2, 13)),
  evt('a-028', A.sandra, 'invitation.sent', 'invitation', 'inv-2026-0163', { email: 'rocio.vasquez@ucsm.edu.pe', cohort: 'Innóvate Cusco Q2' }, daysAgo(2, 11)),
  evt('a-029', A.maria, 'settings.changed', 'organization', 'org-bioinnova', { fields: ['programGoals', 'description', 'verticalFocus'] }, daysAgo(2, 10)),
  evt('a-030', A.carlos, 'invitation.accepted', 'invitation', 'inv-2026-0148', { invited_by: 'Patricia Vega', cohort: 'UNAMAD AgroBio 2026' }, daysAgo(2, 9)),

  // ─── Hace 3 días ───
  evt('a-031', A.valeria, 'tool.completed', 'tool', 'product-plan-scaling', { tool_name: 'Product Plan & Scaling', completed_in: '29 min' }, daysAgo(3, 18)),
  evt('a-032', A.eddie, 'auth.login', 'session', null, { method: 'email', browser: 'Chrome 134' }, daysAgo(3, 16)),
  evt('a-033', A.system, 'ticket.opened', 'ticket', 'INC-2026-0314', { reporter: 'Rosa Choque', priority: 'medium', category: 'bug' }, daysAgo(3, 14), 'warning'),
  evt('a-034', A.lorenzo, 'org.created', 'organization', 'org-energia-verde', { name: 'Energía Verde Arequipa', plan: 'professional' }, daysAgo(3, 12)),
  evt('a-035', A.jorge, 'profile.updated', 'profile', A.jorge.id, { fields: ['pricingModel', 'mainCustomers'] }, daysAgo(3, 10)),
  evt('a-036', A.ana, 'tool.completed', 'tool', 'traction-validation', { tool_name: 'Traction & Validation', completed_in: '41 min' }, daysAgo(3, 9)),

  // ─── Hace 4-7 días ───
  evt('a-037', A.patricia, 'cohort.created', 'cohort', 'cohort-unamad-2026-2', { name: 'UNAMAD Climate Q3', startups: 0, start_date: '2026-05-15' }, daysAgo(4, 15)),
  evt('a-038', A.hector, 'report.generated', 'report', 'cohort-wiener-2025-4', { format: 'xlsx', startups: 22 }, daysAgo(4, 11)),
  evt('a-039', A.pablo, 'tool.completed', 'tool', 'financial-model-builder', { tool_name: 'Financial Model Builder', completed_in: '52 min' }, daysAgo(4, 10)),
  evt('a-040', A.system, 'auth.password_reset', 'session', null, { actor_name: 'Carlos Mamani', email: 'carlos.mamani@unamad.edu.pe' }, daysAgo(5, 17)),
  evt('a-041', A.lucia, 'invitation.accepted', 'invitation', 'inv-2026-0142', { invited_by: 'Lorenzo Ortiz', cohort: 'Energía Verde Q2' }, daysAgo(5, 14)),
  evt('a-042', A.diego, 'tool.completed', 'tool', 'lean-canvas', { tool_name: 'Lean Canvas', completed_in: '21 min' }, daysAgo(5, 12)),
  evt('a-043', A.sandra, 'settings.changed', 'organization', 'org-cusco', { fields: ['cohortFrequency', 'mainContactName'] }, daysAgo(5, 10)),
  evt('a-044', A.eddie, 'user.role_changed', 'profile', 'demo-sandra', { from: 'founder', to: 'admin_org', target: 'Sandra Pacheco' }, daysAgo(6, 16)),
  evt('a-045', A.system, 'ticket.resolved', 'ticket', 'INC-2026-0298', { priority: 'medium', resolved_by: 'Lorenzo Ortiz', mttr: '6h 22m' }, daysAgo(6, 13)),
  evt('a-046', A.ricardo, 'invitation.sent', 'invitation', 'inv-2026-0135', { email: 'estefania.gomez@udep.pe', cohort: 'Hub UDEP Q2' }, daysAgo(6, 11)),
  evt('a-047', A.ana, 'profile.updated', 'profile', A.ana.id, { fields: ['currentMRR', 'totalFunding', 'certifications'] }, daysAgo(7, 18)),
  evt('a-048', A.valeria, 'ai.chat_started', 'chat', 'chat-8722', { tool_id: 'go-to-market', messages: 12 }, daysAgo(7, 15)),
  evt('a-049', A.maria, 'cohort.member_added', 'cohort', 'cohort-bioinnova-2026-1', { startup_name: 'BioPlast Madre de Dios', founder: 'Félix Condori' }, daysAgo(7, 12)),
  evt('a-050', A.jorge, 'tool.completed', 'tool', 'cap-table-fundraising', { tool_name: 'Cap Table & Fundraising', completed_in: '34 min' }, daysAgo(7, 10)),

  // ─── Hace 8-15 días ───
  evt('a-051', A.lorenzo, 'org.created', 'organization', 'org-agrihub', { name: 'AgriHub La Libertad', plan: 'starter' }, daysAgo(8, 14)),
  evt('a-052', A.system, 'ticket.opened', 'ticket', 'INC-2026-0276', { reporter: 'Diego Huamán', priority: 'critical', category: 'data' }, daysAgo(8, 11), 'error'),
  evt('a-053', A.rosa, 'tool.completed', 'tool', 'pitch-deck-builder', { tool_name: 'Pitch Deck Builder', completed_in: '28 min' }, daysAgo(9, 16)),
  evt('a-054', A.patricia, 'report.generated', 'report', 'cohort-unamad-2025-4', { format: 'xlsx', startups: 14 }, daysAgo(9, 13)),
  evt('a-055', A.carlos, 'profile.updated', 'profile', A.carlos.id, { fields: ['region', 'businessModel', 'sdgImpact'] }, daysAgo(10, 12)),
  evt('a-056', A.eddie, 'settings.changed', 'organization', 'org-redesign-lab', { fields: ['emailFooter', 'supportEmail'] }, daysAgo(10, 9)),
  evt('a-057', A.hector, 'cohort.created', 'cohort', 'cohort-wiener-2026-2', { name: 'Wiener Health Tech Q3', startups: 0, start_date: '2026-06-01' }, daysAgo(11, 15)),
  evt('a-058', A.system, 'ticket.resolved', 'ticket', 'INC-2026-0241', { priority: 'high', resolved_by: 'Eddie Ajalcriña', mttr: '8h 04m' }, daysAgo(12, 14)),
  evt('a-059', A.lucia, 'tool.completed', 'tool', 'unit-economics', { tool_name: 'Unit Economics', completed_in: '42 min' }, daysAgo(13, 11)),
  evt('a-060', A.diego, 'invitation.accepted', 'invitation', 'inv-2026-0098', { invited_by: 'Ricardo Fuentes', cohort: 'Hub UDEP Q1' }, daysAgo(14, 10)),

  // ─── Hace 16-30 días ───
  evt('a-061', A.lorenzo, 'org.created', 'organization', 'org-aceleragap', { name: 'AceleraGap', plan: 'professional' }, daysAgo(16, 14)),
  evt('a-062', A.maria, 'invitation.sent', 'invitation', 'inv-2026-0061', { email: 'ana.quispe@bioinnova.pe', cohort: 'BioInnova MdD 2026' }, daysAgo(18, 12)),
  evt('a-063', A.ana, 'invitation.accepted', 'invitation', 'inv-2026-0061', { invited_by: 'María Fernández', cohort: 'BioInnova MdD 2026' }, daysAgo(18, 13)),
  evt('a-064', A.eddie, 'user.role_changed', 'profile', 'demo-patricia', { from: 'founder', to: 'admin_org', target: 'Patricia Vega' }, daysAgo(20, 11)),
  evt('a-065', A.system, 'ticket.opened', 'ticket', 'INC-2026-0188', { reporter: 'Valeria Salas', priority: 'low', category: 'ui' }, daysAgo(22, 15), 'warning'),
  evt('a-066', A.lorenzo, 'org.created', 'organization', 'org-innovate-cusco', { name: 'Innóvate Cusco', plan: 'professional' }, daysAgo(25, 10)),
  evt('a-067', A.system, 'ticket.resolved', 'ticket', 'INC-2026-0144', { priority: 'medium', resolved_by: 'Lorenzo Ortiz', mttr: '5h 48m' }, daysAgo(27, 13)),
  evt('a-068', A.lorenzo, 'org.created', 'organization', 'org-udep', { name: 'Hub UDEP', plan: 'enterprise' }, daysAgo(29, 9)),
]

// ────────────────────────────────────────────────────────────

const ROLE_BADGES: Record<string, { color: string; bg: string; label: string }> = {
  founder: { color: '#1F77F6', bg: 'rgba(31,119,246,0.12)', label: 'Founder' },
  admin_org: { color: '#1F77F6', bg: 'rgba(59,130,246,0.12)', label: 'Admin org' },
  superadmin: { color: '#8B5CF6', bg: 'rgba(139,92,246,0.12)', label: 'Superadmin' },
  system: { color: '#6B7280', bg: 'rgba(107,114,128,0.12)', label: 'Sistema' },
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

export default function ActividadPage() {
  const { appUser, isDemo } = useAuth()
  // Reference time for relative KPIs, captured once on mount (keeps render pure)
  const [now] = useState(() => Date.now())
  const [entries, setEntries] = useState<ActivityEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)

  // Filters
  const [eventFilter, setEventFilter] = useState('all')
  const [actorFilter, setActorFilter] = useState('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const isSuperadmin = appUser?.role === 'superadmin'
  const PAGE_SIZE = 50

  const loadDemoEntries = useCallback(() => {
    setLoading(true)
    let filtered = [...DEMO_ACTIVITY]
    if (eventFilter !== 'all') {
      filtered = filtered.filter((e) => e.action === eventFilter)
    }
    if (actorFilter !== 'all') {
      filtered = filtered.filter((e) => e.actor_role === actorFilter)
    }
    if (dateFrom) {
      const from = new Date(dateFrom).getTime()
      filtered = filtered.filter((e) => new Date(e.created_at).getTime() >= from)
    }
    if (dateTo) {
      const to = new Date(dateTo)
      to.setHours(23, 59, 59, 999)
      filtered = filtered.filter((e) => new Date(e.created_at).getTime() <= to.getTime())
    }
    filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    setEntries(filtered)
    setHasMore(false)
    setLoading(false)
  }, [eventFilter, actorFilter, dateFrom, dateTo])

  const loadEntries = useCallback(async (offset: number, append: boolean) => {
    if (offset === 0) setLoading(true)
    else setLoadingMore(true)

    let query = supabase
      .from('activity_log')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + PAGE_SIZE - 1)

    if (eventFilter !== 'all') {
      query = query.eq('action', eventFilter)
    }
    if (dateFrom) {
      query = query.gte('created_at', new Date(dateFrom).toISOString())
    }
    if (dateTo) {
      const endDate = new Date(dateTo)
      endDate.setHours(23, 59, 59, 999)
      query = query.lte('created_at', endDate.toISOString())
    }

    const { data } = await query

    if (!data) {
      if (!append) setEntries([])
      setHasMore(false)
      setLoading(false)
      setLoadingMore(false)
      return
    }

    // Resolve actor names
    const actorIds = [...new Set(data.map((e) => e.actor_id).filter(Boolean))]
    let actorMap: Record<string, string> = {}
    if (actorIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', actorIds)
      if (profiles) {
        actorMap = Object.fromEntries(profiles.map((p) => [p.id, p.full_name || 'Sin nombre']))
      }
    }

    const enriched: ActivityEntry[] = data.map((e) => ({
      ...e,
      metadata: e.metadata || null,
      actor_name: e.actor_id ? actorMap[e.actor_id] || 'Usuario desconocido' : 'Sistema',
    }))

    if (append) {
      setEntries((prev) => [...prev, ...enriched])
    } else {
      setEntries(enriched)
    }

    setHasMore(data.length === PAGE_SIZE)
    setLoading(false)
    setLoadingMore(false)
  }, [eventFilter, dateFrom, dateTo])

  // Reload when filters change
  /* eslint-disable react-hooks/set-state-in-effect -- (re)load on filter/auth change: demo fixtures or an async query whose state is set after awaits */
  useEffect(() => {
    if (!isSuperadmin) return
    if (isDemo) {
      loadDemoEntries()
    } else {
      loadEntries(0, false)
    }
  }, [isSuperadmin, isDemo, loadEntries, loadDemoEntries])
  /* eslint-enable react-hooks/set-state-in-effect */

  const handleLoadMore = () => {
    loadEntries(entries.length, true)
  }

  const getActionIcon = (action: string) => {
    const Icon = ACTION_ICONS[action] || Activity
    const color = ACTION_COLORS[action] || 'var(--color-text-muted)'
    return { Icon, color }
  }

  const getActionDescription = (entry: ActivityEntry): string => {
    const meta = entry.metadata || {}
    const label = ACTION_LABELS[entry.action]
    if (label) {
      // Append context based on metadata
      switch (entry.action) {
        case 'tool.completed':
          return `${label}: ${meta.tool_name || entry.entity_id || ''}`
        case 'cohort.created':
          return `${label}: "${meta.name || meta.cohort_name || entry.entity_id || ''}"`
        case 'cohort.member_added':
          return `${label}: ${meta.startup_name || ''}${meta.founder ? ` (${meta.founder})` : ''}`
        case 'invitation.sent':
          return `${label} a ${meta.email || ''}`
        case 'invitation.accepted':
          return `${label} de ${meta.invited_by || ''}`
        case 'report.generated':
          return `${label} ${meta.format ? `(${String(meta.format).toUpperCase()})` : ''}${meta.startups ? ` · ${meta.startups} startups` : ''}`
        case 'settings.changed':
          return `${label}${Array.isArray(meta.fields) ? `: ${(meta.fields as string[]).join(', ')}` : ''}`
        case 'user.role_changed':
          return `${label}: ${meta.target || ''} → ${meta.to || ''}`
        case 'ticket.opened':
          return `${label} (${meta.priority || 'normal'} · ${meta.category || ''})`
        case 'ticket.resolved':
          return `${label} en ${meta.mttr || ''}`
        case 'ai.chat_started':
          return `${label}${meta.tool_id ? ` · ${meta.tool_id}` : ''}`
        case 'org.created':
          return `${label}: "${meta.name || ''}"${meta.plan ? ` (${meta.plan})` : ''}`
        default:
          return label
      }
    }
    return entry.action.replace(/[._]/g, ' ')
  }

  // KPIs (demo data)
  const kpis = useMemo(() => {
    const day = 24 * 60 * 60 * 1000

    const today = DEMO_ACTIVITY.filter((e) => now - new Date(e.created_at).getTime() < day).length
    const logins24h = DEMO_ACTIVITY.filter(
      (e) => e.action === 'auth.login' && now - new Date(e.created_at).getTime() < day,
    ).length
    const adminActions7d = DEMO_ACTIVITY.filter(
      (e) =>
        (e.actor_role === 'admin_org' || e.actor_role === 'superadmin') &&
        now - new Date(e.created_at).getTime() < 7 * day,
    ).length
    const errors24h = DEMO_ACTIVITY.filter(
      (e) => e.result === 'error' && now - new Date(e.created_at).getTime() < day,
    ).length

    return { today, logins24h, adminActions7d, errors24h }
  }, [now])

  // Group entries by day
  const grouped = useMemo(() => {
    const groups: { key: string; label: string; items: ActivityEntry[] }[] = []
    const map = new Map<string, { label: string; items: ActivityEntry[] }>()
    for (const e of entries) {
      const key = dayKey(e.created_at)
      if (!map.has(key)) {
        map.set(key, { label: dayLabel(e.created_at), items: [] })
      }
      map.get(key)!.items.push(e)
    }
    for (const [key, val] of map) {
      groups.push({ key, label: val.label, items: val.items })
    }
    return groups
  }, [entries])

  if (!isSuperadmin) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <p style={{ fontFamily: 'var(--font-body)', color: 'var(--color-text-secondary)' }}>
          Acceso restringido a superadmins.
        </p>
      </div>
    )
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          style={{
            width: 32, height: 32,
            border: '3px solid var(--color-border)',
            borderTopColor: '#1F77F6',
            borderRadius: '50%',
          }}
        />
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.35 }}
      style={{ padding: '2rem 1.5rem', maxWidth: 1200, margin: '0 auto' }}
    >
      {/* Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
          <ScrollText size={20} color="#1F77F6" />
          <h1 style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '1.25rem', color: 'var(--color-text-primary)' }}>
            Actividad
          </h1>
        </div>
        <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>
          Registro de actividad y auditoría de la plataforma
        </p>
      </div>

      {/* KPI strip */}
      <motion.div
        {...fadeUp}
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '0.75rem',
          marginBottom: '1.5rem',
        }}
      >
        {[
          { label: 'Eventos hoy', value: kpis.today, Icon: Activity, color: '#1F77F6' },
          { label: 'Logins 24h', value: kpis.logins24h, Icon: LogIn, color: '#1F77F6' },
          { label: 'Acciones admin 7d', value: kpis.adminActions7d, Icon: Shield, color: '#8B5CF6' },
          { label: 'Errores 24h', value: kpis.errors24h, Icon: AlertTriangle, color: kpis.errors24h > 0 ? '#DC2626' : '#10B981' },
        ].map((k, i) => (
          <div
            key={i}
            style={{
              ...cardStyle,
              padding: '1rem 1.25rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.875rem',
            }}
          >
            <div
              style={{
                width: 36, height: 36, borderRadius: 10,
                background: `${k.color}14`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <k.Icon size={16} color={k.color} />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontFamily: 'var(--font-body)', fontSize: '0.6875rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>
                {k.label}
              </div>
              <div style={{ fontFamily: 'var(--font-heading)', fontSize: '1.375rem', fontWeight: 700, color: 'var(--color-text-primary)', lineHeight: 1.1 }}>
                {k.value}
              </div>
            </div>
          </div>
        ))}
      </motion.div>

      {/* Filters */}
      <motion.div {...fadeUp} style={{ ...cardStyle, marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div>
            <label style={{ fontFamily: 'var(--font-body)', fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-secondary)', display: 'block', marginBottom: '0.375rem' }}>
              Tipo de evento
            </label>
            <select value={eventFilter} onChange={(e) => setEventFilter(e.target.value)} style={{ ...selectStyle, minWidth: 200 }}>
              {EVENT_TYPES.map((et) => (
                <option key={et.value} value={et.value}>{et.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ fontFamily: 'var(--font-body)', fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-secondary)', display: 'block', marginBottom: '0.375rem' }}>
              Actor
            </label>
            <select value={actorFilter} onChange={(e) => setActorFilter(e.target.value)} style={{ ...selectStyle, minWidth: 160 }}>
              <option value="all">Todos los roles</option>
              <option value="founder">Founders</option>
              <option value="admin_org">Admins org</option>
              <option value="superadmin">Superadmins</option>
              <option value="system">Sistema</option>
            </select>
          </div>
          <div>
            <label style={{ fontFamily: 'var(--font-body)', fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-secondary)', display: 'block', marginBottom: '0.375rem' }}>
              Desde
            </label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              style={inputStyle}
            />
          </div>
          <div>
            <label style={{ fontFamily: 'var(--font-body)', fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-secondary)', display: 'block', marginBottom: '0.375rem' }}>
              Hasta
            </label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              style={inputStyle}
            />
          </div>
        </div>
      </motion.div>

      {/* Timeline */}
      <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.1 }} style={cardStyle}>
        {entries.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 200, textAlign: 'center', padding: '2rem' }}>
            <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--color-bg-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '0.75rem' }}>
              <ScrollText size={20} color="var(--color-text-muted)" />
            </div>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>
              No hay actividad registrada con esos filtros
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {grouped.map((group) => (
              <div key={group.key} style={{ marginBottom: '1.5rem' }}>
                {/* Day header */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.5rem 0',
                    marginBottom: '0.5rem',
                    borderBottom: '1px solid var(--color-border)',
                  }}
                >
                  <Calendar size={12} color="var(--color-text-muted)" />
                  <span style={{
                    fontFamily: 'var(--font-body)',
                    fontSize: '0.6875rem',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    color: 'var(--color-text-muted)',
                  }}>
                    {group.label}
                  </span>
                  <span style={{
                    fontFamily: 'var(--font-body)',
                    fontSize: '0.6875rem',
                    color: 'var(--color-text-muted)',
                  }}>
                    · {group.items.length} {group.items.length === 1 ? 'evento' : 'eventos'}
                  </span>
                </div>

                {group.items.map((entry, i) => {
                  const { Icon, color } = getActionIcon(entry.action)
                  const role = ROLE_BADGES[entry.actor_role || 'system'] || ROLE_BADGES.system
                  const result = entry.result ? RESULT_CONFIG[entry.result] : null
                  return (
                    <div
                      key={entry.id}
                      style={{
                        display: 'flex',
                        gap: '0.875rem',
                        padding: '0.875rem 0',
                        borderBottom: i < group.items.length - 1 ? '1px solid var(--color-border)' : 'none',
                      }}
                    >
                      {/* Action icon */}
                      <div style={{ flexShrink: 0 }}>
                        <div
                          style={{
                            width: 32, height: 32, borderRadius: 10,
                            background: `${color}14`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}
                        >
                          <Icon size={14} color={color} />
                        </div>
                      </div>

                      {/* Avatar */}
                      <div style={{ flexShrink: 0 }}>
                        <div
                          style={{
                            width: 32, height: 32, borderRadius: '50%',
                            background: `${role.color}20`,
                            color: role.color,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontFamily: 'var(--font-body)',
                            fontSize: '0.6875rem',
                            fontWeight: 700,
                          }}
                        >
                          {getInitials(entry.actor_name || 'S')}
                        </div>
                      </div>

                      {/* Content */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.25rem' }}>
                          <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                            {entry.actor_name}
                          </span>
                          <span style={{
                            padding: '0.0625rem 0.4375rem', borderRadius: 999,
                            fontSize: '0.625rem', fontWeight: 600,
                            background: role.bg, color: role.color,
                            fontFamily: 'var(--font-body)',
                          }}>
                            {role.label}
                          </span>
                          {entry.actor_org && entry.actor_org !== '—' && (
                            <span style={{
                              fontFamily: 'var(--font-body)',
                              fontSize: '0.6875rem',
                              color: 'var(--color-text-muted)',
                            }}>
                              · {entry.actor_org}
                            </span>
                          )}
                        </div>
                        <div style={{
                          fontFamily: 'var(--font-body)',
                          fontSize: '0.8125rem',
                          color: 'var(--color-text-secondary)',
                          marginBottom: '0.375rem',
                        }}>
                          {getActionDescription(entry)}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                          <span style={{
                            fontFamily: 'var(--font-body)', fontSize: '0.6875rem',
                            color: 'var(--color-text-muted)',
                            display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
                          }}>
                            <Clock size={10} />
                            {relativeTime(entry.created_at)}
                          </span>
                          {entry.ip && entry.ip !== '—' && (
                            <span style={{
                              fontFamily: 'var(--font-mono, ui-monospace)', fontSize: '0.6875rem',
                              color: 'var(--color-text-muted)',
                            }}>
                              IP {entry.ip}
                            </span>
                          )}
                          {result && (
                            <span style={{
                              padding: '0.0625rem 0.4375rem', borderRadius: 999,
                              fontSize: '0.625rem', fontWeight: 600,
                              background: result.bg, color: result.color,
                              fontFamily: 'var(--font-body)',
                              display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
                            }}>
                              <result.Icon size={9} />
                              {result.label}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            ))}

            {/* Load more (only when not in demo) */}
            {hasMore && !isDemo && (
              <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '1.25rem' }}>
                <button
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                    padding: '0.375rem 0.75rem', borderRadius: 6,
                    border: '1px solid var(--color-border)', background: 'var(--color-bg-card)',
                    fontFamily: 'var(--font-body)', fontSize: '0.75rem', fontWeight: 500,
                    color: 'var(--color-text-primary)', cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    opacity: loadingMore ? 0.6 : 1,
                  }}
                >
                  {loadingMore ? (
                    <>
                      <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
                      Cargando...
                    </>
                  ) : (
                    <>
                      <ChevronDown size={14} />
                      Cargar más
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        )}
      </motion.div>

    </motion.div>
  )
}
