-- =============================================================================
-- Startups4Climate - production schema snapshot (Supabase project mvawsorasuqqlzlayhrx)
--
-- GENERATED SNAPSHOT FOR REFERENCE ONLY. Do NOT run this file as a migration.
-- Reconstructed on 2026-10-06 from pg_catalog / information_schema / pg_policies
-- (pg_get_functiondef, pg_get_viewdef, pg_get_constraintdef, pg_get_indexdef,
-- pg_get_triggerdef) AFTER applying the 2026-10-05 security migrations.
-- Table/column GRANTs and default privileges are not included.
-- Regenerate a canonical dump with:  supabase db pull
--   (or: supabase db dump --schema public,private)
--
-- Production migration history before 2026-10-05 (28 migrations applied via
-- dashboard/MCP; their SQL files were never committed to this repo):
--   20260328024016 create_v2_schema
--   20260406002200 fix_cohorts_add_status
--   20260406002202 fix_tool_data_constraints
--   20260406002214 create_invitations_table
--   20260406002223 add_rls_policies_critical_tables
--   20260418032945 logos_bucket_policies
--   20260418033455 tighten_logos_bucket_listing
--   20260418041635 tier2_schema_cleanup
--   20260418043620 tier3_public_passport
--   20260418044121 tier3_seed_opportunities
--   20260418044400 tier3_seed_news_items
--   20260418044513 tier3_weekly_kpis
--   20260418161632 create_diagnostic_leads_and_anon_policies
--   20260421074633 ai_rate_limit
--   20260421075055 profiles_update_check_prevent_role_escalation
--   20260421143352 accept_invitation_security_definer
--   20260421143503 invitations_restrict_admin_org_type
--   20260421143622 get_public_passport_rpc
--   20260421180011 news_items_source_url_unique
--   20260424144350 create_cohorts_with_counts_view
--   20260424144359 add_review_note_to_cohort_requests
--   20260429233713 platform_capacity_monitoring
--   20260501014704 organizations_add_meta_jsonb
--   20260501015211 create_calcular_percentil_rpc
--   20260503134400 cohorts_add_share_token
--   20260503134427 cohort_share_link_rpcs
--   20260503173216 drop_cohorts_is_active
--   20260510001618 add_gender_to_profiles
--
-- Not in prod migration history, but its effects ARE present in prod:
--   supabase/migrations/20260509_ideacion.sql (cohorts.stage + cohorts_stage_check,
--   profiles_stage_check including 'ideacion').
--
-- Applied 2026-10-05/06 (files supabase/migrations/20261005*):
--   c3_org_scoped_founder_visibility, c4_protect_org_billing_columns,
--   a5_diagnostics_insert_own, a6_cohorts_with_counts_security_invoker,
--   m7_activity_log_insert_own, ip_rate_limits, role_and_org_hardening,
--   m4_rls_initplan, m4_duplicate_policies_initplan, m3_secdef_function_grants,
--   fix_profiles_update_policy_recursion, invitations_read_own_initplan,
--   invitations_read_own_initplan_v2
--   Pending (not applied): 20261005001000_m4_drop_duplicate_policies
-- =============================================================================

CREATE SCHEMA IF NOT EXISTS private;

-- -----------------------------------------------------------------------------
-- TABLES (columns, defaults, NOT NULL, RLS)
-- -----------------------------------------------------------------------------

CREATE TABLE public.activity_log (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  actor_id uuid,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now()
);
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.ai_conversations (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid NOT NULL,
  agent_type text NOT NULL,
  title text,
  messages jsonb DEFAULT '[]'::jsonb NOT NULL,
  tokens_used integer DEFAULT 0,
  model_used text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE public.ai_conversations ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.ai_usage (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid NOT NULL,
  endpoint text NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE public.ai_usage ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.certificates (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  startup_id uuid NOT NULL,
  stage text NOT NULL,
  issued_at timestamp with time zone DEFAULT now() NOT NULL,
  certificate_url text
);
ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.cohort_requests (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  cohort_id uuid NOT NULL,
  founder_id uuid NOT NULL,
  startup_id uuid,
  status text DEFAULT 'pending'::text NOT NULL,
  message text,
  reviewed_by uuid,
  reviewed_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  review_note text
);
ALTER TABLE public.cohort_requests ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.cohort_startups (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  cohort_id uuid NOT NULL,
  startup_id uuid NOT NULL,
  joined_at timestamp with time zone DEFAULT now() NOT NULL,
  status text DEFAULT 'active'::text NOT NULL,
  notes text
);
ALTER TABLE public.cohort_startups ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.cohorts (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  org_id uuid NOT NULL,
  name text NOT NULL,
  description text,
  start_date date,
  end_date date,
  milestones jsonb DEFAULT '[]'::jsonb,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  status text DEFAULT 'planned'::text NOT NULL,
  access_mode text DEFAULT 'invite_only'::text NOT NULL,
  share_token text DEFAULT replace((gen_random_uuid())::text, '-'::text, ''::text) NOT NULL,
  stage text
);
ALTER TABLE public.cohorts ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.diagnostic_leads (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  nombre text,
  email text NOT NULL,
  startup_name text,
  startup_description text,
  vertical text,
  country text,
  phone text,
  website text,
  score integer,
  profile text,
  answers jsonb,
  tags jsonb,
  source text DEFAULT 'landing'::text,
  contacted boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE public.diagnostic_leads ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.diagnostics (
  id uuid DEFAULT uuid_generate_v4() NOT NULL,
  user_id uuid,
  score integer NOT NULL,
  profile text NOT NULL,
  answers jsonb DEFAULT '{}'::jsonb NOT NULL,
  dimension_scores jsonb DEFAULT '{}'::jsonb NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);
ALTER TABLE public.diagnostics ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.invitations (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  org_id uuid NOT NULL,
  cohort_id uuid,
  email text NOT NULL,
  role text DEFAULT 'founder'::text NOT NULL,
  invited_by uuid NOT NULL,
  token text DEFAULT encode(gen_random_bytes(32), 'hex'::text) NOT NULL,
  status text DEFAULT 'pending'::text NOT NULL,
  expires_at timestamp with time zone DEFAULT (now() + '7 days'::interval) NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  accepted_at timestamp with time zone,
  invitation_type text DEFAULT 'founder'::text NOT NULL
);
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.ip_rate_limits (
  key text NOT NULL,
  window_start timestamp with time zone NOT NULL,
  count integer DEFAULT 0 NOT NULL
);
ALTER TABLE public.ip_rate_limits ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.news_items (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  title text NOT NULL,
  summary text NOT NULL,
  source_name text NOT NULL,
  source_url text NOT NULL,
  image_url text,
  vertical text,
  country text,
  content_type text NOT NULL,
  tags text[] DEFAULT '{}'::text[],
  published_at timestamp with time zone,
  scraped_at timestamp with time zone DEFAULT now() NOT NULL,
  is_active boolean DEFAULT true NOT NULL
);
ALTER TABLE public.news_items ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.opportunities (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  title text NOT NULL,
  organization text NOT NULL,
  description text NOT NULL,
  type text NOT NULL,
  amount_min numeric(12,2),
  amount_max numeric(12,2),
  currency text DEFAULT 'USD'::text,
  eligible_countries text[] DEFAULT '{}'::text[],
  eligible_verticals text[] DEFAULT '{}'::text[],
  eligible_stages text[] DEFAULT '{}'::text[],
  requirements jsonb,
  application_url text,
  deadline timestamp with time zone,
  is_rolling boolean DEFAULT false,
  source_url text,
  is_active boolean DEFAULT true NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE public.opportunities ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.opportunity_matches (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  startup_id uuid NOT NULL,
  opportunity_id uuid NOT NULL,
  match_score numeric(5,2) NOT NULL,
  match_reasons jsonb,
  status text DEFAULT 'suggested'::text NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE public.opportunity_matches ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.organizations (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  name text NOT NULL,
  type text NOT NULL,
  country text NOT NULL,
  logo_url text,
  website text,
  plan text DEFAULT 'starter'::text NOT NULL,
  max_startups integer DEFAULT 25 NOT NULL,
  is_active boolean DEFAULT true NOT NULL,
  billing_email text,
  contract_start date,
  contract_end date,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  meta jsonb DEFAULT '{}'::jsonb
);
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.platform_settings (
  key text NOT NULL,
  value jsonb NOT NULL,
  updated_by uuid,
  updated_at timestamp with time zone DEFAULT now()
);
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.profiles (
  id uuid NOT NULL,
  email text NOT NULL,
  full_name text NOT NULL,
  role text DEFAULT 'founder'::text NOT NULL,
  org_id uuid,
  avatar_url text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  startup_name text,
  stage text,
  diagnostic_score integer,
  diagnostic_data jsonb DEFAULT '{}'::jsonb,
  gender text
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.startups (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  founder_id uuid NOT NULL,
  name text NOT NULL,
  description text,
  vertical text NOT NULL,
  country text NOT NULL,
  stage text,
  diagnostic_score integer,
  phone text,
  website text,
  linkedin text,
  logo_url text,
  team_size integer,
  revenue_model text,
  monthly_revenue numeric(12,2),
  tam_usd numeric(15,2),
  ltv numeric(12,2),
  cac numeric(12,2),
  has_mvp boolean DEFAULT false,
  has_paying_customers boolean DEFAULT false,
  paying_customers_count integer DEFAULT 0,
  diagnostic_answers jsonb,
  score_by_dimension jsonb,
  tools_completed integer DEFAULT 0,
  current_stage_progress numeric(5,2) DEFAULT 0,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  public_share_token text,
  is_public boolean DEFAULT false
);
ALTER TABLE public.startups ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.support_tickets (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  title text NOT NULL,
  description text,
  status text DEFAULT 'open'::text NOT NULL,
  priority text DEFAULT 'medium'::text NOT NULL,
  category text,
  reporter_id uuid,
  assigned_to uuid,
  org_id uuid,
  resolved_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.ticket_messages (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  ticket_id uuid NOT NULL,
  author_id uuid NOT NULL,
  content text NOT NULL,
  is_internal boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now()
);
ALTER TABLE public.ticket_messages ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.tool_data (
  id uuid DEFAULT uuid_generate_v4() NOT NULL,
  user_id uuid,
  tool_id text NOT NULL,
  data jsonb DEFAULT '{}'::jsonb NOT NULL,
  completed boolean DEFAULT false,
  report_generated boolean DEFAULT false,
  updated_at timestamp with time zone DEFAULT now(),
  last_saved timestamp with time zone DEFAULT now()
);
ALTER TABLE public.tool_data ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.weekly_kpis (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  startup_id uuid NOT NULL,
  week_start date NOT NULL,
  mrr numeric,
  customers integer,
  active_users integer,
  runway_months numeric,
  notes text,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE public.weekly_kpis ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.workbook_downloads (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  full_name text NOT NULL,
  email text NOT NULL,
  country text,
  user_id uuid,
  downloaded_at timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE public.workbook_downloads ENABLE ROW LEVEL SECURITY;


-- -----------------------------------------------------------------------------
-- CONSTRAINTS (PK, UNIQUE, FK, CHECK)
-- -----------------------------------------------------------------------------

ALTER TABLE activity_log ADD CONSTRAINT activity_log_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES profiles(id);

ALTER TABLE activity_log ADD CONSTRAINT activity_log_pkey PRIMARY KEY (id);

ALTER TABLE ai_conversations ADD CONSTRAINT ai_conversations_agent_type_check CHECK ((agent_type = ANY (ARRAY['mentor'::text, 'radar'::text, 'opportunities'::text, 'tool_feedback'::text])));

ALTER TABLE ai_conversations ADD CONSTRAINT ai_conversations_pkey PRIMARY KEY (id);

ALTER TABLE ai_conversations ADD CONSTRAINT ai_conversations_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE ai_usage ADD CONSTRAINT ai_usage_endpoint_check CHECK ((endpoint = ANY (ARRAY['chat'::text, 'feedback'::text])));

ALTER TABLE ai_usage ADD CONSTRAINT ai_usage_pkey PRIMARY KEY (id);

ALTER TABLE ai_usage ADD CONSTRAINT ai_usage_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE certificates ADD CONSTRAINT certificates_pkey PRIMARY KEY (id);

ALTER TABLE certificates ADD CONSTRAINT certificates_stage_check CHECK ((stage = ANY (ARRAY['pre_incubation'::text, 'incubation'::text, 'acceleration'::text, 'scaling'::text])));

ALTER TABLE certificates ADD CONSTRAINT certificates_startup_id_fkey FOREIGN KEY (startup_id) REFERENCES startups(id) ON DELETE CASCADE;

ALTER TABLE certificates ADD CONSTRAINT certificates_startup_id_stage_key UNIQUE (startup_id, stage);

ALTER TABLE cohort_requests ADD CONSTRAINT cohort_requests_cohort_id_fkey FOREIGN KEY (cohort_id) REFERENCES cohorts(id) ON DELETE CASCADE;

ALTER TABLE cohort_requests ADD CONSTRAINT cohort_requests_cohort_id_founder_id_key UNIQUE (cohort_id, founder_id);

ALTER TABLE cohort_requests ADD CONSTRAINT cohort_requests_founder_id_fkey FOREIGN KEY (founder_id) REFERENCES profiles(id);

ALTER TABLE cohort_requests ADD CONSTRAINT cohort_requests_pkey PRIMARY KEY (id);

ALTER TABLE cohort_requests ADD CONSTRAINT cohort_requests_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES profiles(id);

ALTER TABLE cohort_requests ADD CONSTRAINT cohort_requests_startup_id_fkey FOREIGN KEY (startup_id) REFERENCES startups(id);

ALTER TABLE cohort_requests ADD CONSTRAINT cohort_requests_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text])));

ALTER TABLE cohort_startups ADD CONSTRAINT cohort_startups_cohort_id_fkey FOREIGN KEY (cohort_id) REFERENCES cohorts(id) ON DELETE CASCADE;

ALTER TABLE cohort_startups ADD CONSTRAINT cohort_startups_cohort_startup_unique UNIQUE (cohort_id, startup_id);

ALTER TABLE cohort_startups ADD CONSTRAINT cohort_startups_pkey PRIMARY KEY (id);

ALTER TABLE cohort_startups ADD CONSTRAINT cohort_startups_startup_id_fkey FOREIGN KEY (startup_id) REFERENCES startups(id) ON DELETE CASCADE;

ALTER TABLE cohort_startups ADD CONSTRAINT cohort_startups_status_check CHECK ((status = ANY (ARRAY['active'::text, 'graduated'::text, 'dropped'::text, 'paused'::text])));

ALTER TABLE cohorts ADD CONSTRAINT cohorts_access_mode_check CHECK ((access_mode = ANY (ARRAY['invite_only'::text, 'open'::text])));

ALTER TABLE cohorts ADD CONSTRAINT cohorts_org_id_fkey FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE;

ALTER TABLE cohorts ADD CONSTRAINT cohorts_pkey PRIMARY KEY (id);

ALTER TABLE cohorts ADD CONSTRAINT cohorts_stage_check CHECK ((stage = ANY (ARRAY['ideacion'::text, 'pre-incubacion'::text, 'incubacion'::text, 'aceleracion'::text, 'escalamiento'::text])));

ALTER TABLE cohorts ADD CONSTRAINT cohorts_status_check CHECK ((status = ANY (ARRAY['planned'::text, 'active'::text, 'completed'::text, 'archived'::text])));

ALTER TABLE diagnostic_leads ADD CONSTRAINT diagnostic_leads_pkey PRIMARY KEY (id);

ALTER TABLE diagnostics ADD CONSTRAINT diagnostics_pkey PRIMARY KEY (id);

ALTER TABLE diagnostics ADD CONSTRAINT diagnostics_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE invitations ADD CONSTRAINT invitations_cohort_id_fkey FOREIGN KEY (cohort_id) REFERENCES cohorts(id);

ALTER TABLE invitations ADD CONSTRAINT invitations_invitation_type_check CHECK ((invitation_type = ANY (ARRAY['founder'::text, 'admin_org'::text])));

ALTER TABLE invitations ADD CONSTRAINT invitations_invited_by_fkey FOREIGN KEY (invited_by) REFERENCES profiles(id);

ALTER TABLE invitations ADD CONSTRAINT invitations_org_id_fkey FOREIGN KEY (org_id) REFERENCES organizations(id);

ALTER TABLE invitations ADD CONSTRAINT invitations_pkey PRIMARY KEY (id);

ALTER TABLE invitations ADD CONSTRAINT invitations_role_check CHECK ((role = ANY (ARRAY['founder'::text, 'admin_org'::text])));

ALTER TABLE invitations ADD CONSTRAINT invitations_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'accepted'::text, 'expired'::text, 'revoked'::text])));

ALTER TABLE ip_rate_limits ADD CONSTRAINT ip_rate_limits_pkey PRIMARY KEY (key, window_start);

ALTER TABLE news_items ADD CONSTRAINT news_items_content_type_check CHECK ((content_type = ANY (ARRAY['news'::text, 'regulation'::text, 'investment'::text, 'trend'::text, 'event'::text, 'report'::text])));

ALTER TABLE news_items ADD CONSTRAINT news_items_pkey PRIMARY KEY (id);

ALTER TABLE opportunities ADD CONSTRAINT opportunities_pkey PRIMARY KEY (id);

ALTER TABLE opportunities ADD CONSTRAINT opportunities_type_check CHECK ((type = ANY (ARRAY['grant'::text, 'competition'::text, 'accelerator'::text, 'investment_fund'::text, 'soft_loan'::text, 'award'::text, 'fellowship'::text])));

ALTER TABLE opportunity_matches ADD CONSTRAINT opportunity_matches_opportunity_id_fkey FOREIGN KEY (opportunity_id) REFERENCES opportunities(id) ON DELETE CASCADE;

ALTER TABLE opportunity_matches ADD CONSTRAINT opportunity_matches_pkey PRIMARY KEY (id);

ALTER TABLE opportunity_matches ADD CONSTRAINT opportunity_matches_startup_id_fkey FOREIGN KEY (startup_id) REFERENCES startups(id) ON DELETE CASCADE;

ALTER TABLE opportunity_matches ADD CONSTRAINT opportunity_matches_startup_id_opportunity_id_key UNIQUE (startup_id, opportunity_id);

ALTER TABLE opportunity_matches ADD CONSTRAINT opportunity_matches_status_check CHECK ((status = ANY (ARRAY['suggested'::text, 'interested'::text, 'applied'::text, 'accepted'::text, 'rejected'::text, 'dismissed'::text])));

ALTER TABLE organizations ADD CONSTRAINT organizations_pkey PRIMARY KEY (id);

ALTER TABLE organizations ADD CONSTRAINT organizations_plan_check CHECK ((plan = ANY (ARRAY['starter'::text, 'professional'::text, 'enterprise'::text, 'institutional'::text])));

ALTER TABLE organizations ADD CONSTRAINT organizations_type_check CHECK ((type = ANY (ARRAY['incubator'::text, 'accelerator'::text, 'government'::text, 'university'::text, 'investment_fund'::text, 'ngo'::text, 'international_org'::text])));

ALTER TABLE platform_settings ADD CONSTRAINT platform_settings_pkey PRIMARY KEY (key);

ALTER TABLE platform_settings ADD CONSTRAINT platform_settings_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES profiles(id);

ALTER TABLE profiles ADD CONSTRAINT profiles_gender_check CHECK ((gender = ANY (ARRAY['masculino'::text, 'femenino'::text, 'otro'::text, 'prefiero_no_decir'::text])));

ALTER TABLE profiles ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE profiles ADD CONSTRAINT profiles_org_id_fkey FOREIGN KEY (org_id) REFERENCES organizations(id);

ALTER TABLE profiles ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);

ALTER TABLE profiles ADD CONSTRAINT profiles_role_check CHECK ((role = ANY (ARRAY['founder'::text, 'admin_org'::text, 'superadmin'::text])));

ALTER TABLE profiles ADD CONSTRAINT profiles_stage_check CHECK (((stage = ANY (ARRAY['ideacion'::text, 'pre-incubacion'::text, 'incubacion'::text, 'aceleracion'::text, 'escalamiento'::text])) OR (stage IS NULL)));

ALTER TABLE startups ADD CONSTRAINT startups_founder_id_fkey FOREIGN KEY (founder_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE startups ADD CONSTRAINT startups_founder_id_unique UNIQUE (founder_id);

ALTER TABLE startups ADD CONSTRAINT startups_pkey PRIMARY KEY (id);

ALTER TABLE startups ADD CONSTRAINT startups_public_share_token_key UNIQUE (public_share_token);

ALTER TABLE startups ADD CONSTRAINT startups_stage_check CHECK ((stage = ANY (ARRAY['pre_incubation'::text, 'incubation'::text, 'acceleration'::text, 'scaling'::text])));

ALTER TABLE startups ADD CONSTRAINT startups_vertical_check CHECK ((vertical = ANY (ARRAY['fintech'::text, 'healthtech'::text, 'edtech'::text, 'agritech_foodtech'::text, 'cleantech_climatech'::text, 'biotech_deeptech'::text, 'logistics_mobility'::text, 'saas_enterprise'::text, 'social_impact'::text, 'other'::text])));

ALTER TABLE support_tickets ADD CONSTRAINT support_tickets_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES profiles(id);

ALTER TABLE support_tickets ADD CONSTRAINT support_tickets_category_check CHECK ((category = ANY (ARRAY['account'::text, 'billing'::text, 'bug'::text, 'feature_request'::text, 'other'::text])));

ALTER TABLE support_tickets ADD CONSTRAINT support_tickets_org_id_fkey FOREIGN KEY (org_id) REFERENCES organizations(id);

ALTER TABLE support_tickets ADD CONSTRAINT support_tickets_pkey PRIMARY KEY (id);

ALTER TABLE support_tickets ADD CONSTRAINT support_tickets_priority_check CHECK ((priority = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text, 'critical'::text])));

ALTER TABLE support_tickets ADD CONSTRAINT support_tickets_reporter_id_fkey FOREIGN KEY (reporter_id) REFERENCES profiles(id);

ALTER TABLE support_tickets ADD CONSTRAINT support_tickets_status_check CHECK ((status = ANY (ARRAY['open'::text, 'in_progress'::text, 'resolved'::text, 'closed'::text])));

ALTER TABLE ticket_messages ADD CONSTRAINT ticket_messages_author_id_fkey FOREIGN KEY (author_id) REFERENCES profiles(id);

ALTER TABLE ticket_messages ADD CONSTRAINT ticket_messages_pkey PRIMARY KEY (id);

ALTER TABLE ticket_messages ADD CONSTRAINT ticket_messages_ticket_id_fkey FOREIGN KEY (ticket_id) REFERENCES support_tickets(id) ON DELETE CASCADE;

ALTER TABLE tool_data ADD CONSTRAINT tool_data_pkey PRIMARY KEY (id);

ALTER TABLE tool_data ADD CONSTRAINT tool_data_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id);

ALTER TABLE tool_data ADD CONSTRAINT tool_data_user_tool_unique UNIQUE (user_id, tool_id);

ALTER TABLE weekly_kpis ADD CONSTRAINT weekly_kpis_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE weekly_kpis ADD CONSTRAINT weekly_kpis_pkey PRIMARY KEY (id);

ALTER TABLE weekly_kpis ADD CONSTRAINT weekly_kpis_startup_id_fkey FOREIGN KEY (startup_id) REFERENCES startups(id) ON DELETE CASCADE;

ALTER TABLE weekly_kpis ADD CONSTRAINT weekly_kpis_startup_id_week_start_key UNIQUE (startup_id, week_start);

ALTER TABLE workbook_downloads ADD CONSTRAINT workbook_downloads_pkey PRIMARY KEY (id);

ALTER TABLE workbook_downloads ADD CONSTRAINT workbook_downloads_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id);


-- -----------------------------------------------------------------------------
-- INDEXES (non-constraint)
-- -----------------------------------------------------------------------------

CREATE INDEX ai_usage_user_time_idx ON public.ai_usage USING btree (user_id, created_at DESC);

CREATE UNIQUE INDEX cohorts_share_token_key ON public.cohorts USING btree (share_token);

CREATE INDEX diagnostic_leads_created_at_idx ON public.diagnostic_leads USING btree (created_at DESC);

CREATE INDEX diagnostic_leads_email_idx ON public.diagnostic_leads USING btree (email);

CREATE INDEX idx_activity_log_actor ON public.activity_log USING btree (actor_id);

CREATE INDEX idx_activity_log_created ON public.activity_log USING btree (created_at DESC);

CREATE INDEX idx_activity_log_entity ON public.activity_log USING btree (entity_type, entity_id);

CREATE INDEX idx_ai_conversations_agent ON public.ai_conversations USING btree (agent_type);

CREATE INDEX idx_ai_conversations_user ON public.ai_conversations USING btree (user_id);

CREATE INDEX idx_cohort_requests_founder_id ON public.cohort_requests USING btree (founder_id);

CREATE INDEX idx_cohort_requests_reviewed_by ON public.cohort_requests USING btree (reviewed_by);

CREATE INDEX idx_cohort_requests_startup_id ON public.cohort_requests USING btree (startup_id);

CREATE INDEX idx_cohort_startups_cohort ON public.cohort_startups USING btree (cohort_id);

CREATE INDEX idx_cohort_startups_startup ON public.cohort_startups USING btree (startup_id);

CREATE INDEX idx_cohorts_org ON public.cohorts USING btree (org_id);

CREATE INDEX idx_diagnostics_user ON public.diagnostics USING btree (user_id);

CREATE INDEX idx_invitations_cohort_id ON public.invitations USING btree (cohort_id);

CREATE INDEX idx_invitations_invited_by ON public.invitations USING btree (invited_by);

CREATE INDEX idx_invitations_org_id ON public.invitations USING btree (org_id);

CREATE INDEX idx_ip_rate_limits_window_start ON public.ip_rate_limits USING btree (window_start);

CREATE INDEX idx_matches_startup ON public.opportunity_matches USING btree (startup_id);

CREATE INDEX idx_news_items_active_published ON public.news_items USING btree (published_at DESC) WHERE (is_active = true);

CREATE INDEX idx_news_items_country ON public.news_items USING btree (country);

CREATE INDEX idx_news_items_published ON public.news_items USING btree (published_at DESC);

CREATE INDEX idx_news_items_vertical ON public.news_items USING btree (vertical);

CREATE INDEX idx_opportunities_active ON public.opportunities USING btree (is_active) WHERE (is_active = true);

CREATE INDEX idx_opportunities_deadline ON public.opportunities USING btree (deadline);

CREATE INDEX idx_opportunities_type ON public.opportunities USING btree (type);

CREATE INDEX idx_opportunity_matches_opportunity_id ON public.opportunity_matches USING btree (opportunity_id);

CREATE INDEX idx_platform_settings_updated_by ON public.platform_settings USING btree (updated_by);

CREATE INDEX idx_profiles_org_id ON public.profiles USING btree (org_id);

CREATE INDEX idx_startups_country ON public.startups USING btree (country);

CREATE INDEX idx_startups_founder ON public.startups USING btree (founder_id);

CREATE INDEX idx_startups_public_share_token ON public.startups USING btree (public_share_token) WHERE (public_share_token IS NOT NULL);

CREATE INDEX idx_startups_stage ON public.startups USING btree (stage);

CREATE INDEX idx_startups_vertical ON public.startups USING btree (vertical);

CREATE INDEX idx_support_tickets_assigned_to ON public.support_tickets USING btree (assigned_to);

CREATE INDEX idx_support_tickets_org_id ON public.support_tickets USING btree (org_id);

CREATE INDEX idx_support_tickets_reporter_id ON public.support_tickets USING btree (reporter_id);

CREATE INDEX idx_ticket_messages_author_id ON public.ticket_messages USING btree (author_id);

CREATE INDEX idx_ticket_messages_ticket_id ON public.ticket_messages USING btree (ticket_id);

CREATE INDEX idx_weekly_kpis_created_by ON public.weekly_kpis USING btree (created_by);

CREATE INDEX idx_weekly_kpis_startup_id ON public.weekly_kpis USING btree (startup_id);

CREATE INDEX idx_weekly_kpis_week_start ON public.weekly_kpis USING btree (week_start);

CREATE INDEX idx_workbook_downloads_user_id ON public.workbook_downloads USING btree (user_id);

CREATE UNIQUE INDEX invitations_email_org_pending_unique ON public.invitations USING btree (email, org_id) WHERE (status = 'pending'::text);

CREATE UNIQUE INDEX news_items_source_url_key ON public.news_items USING btree (source_url);

CREATE UNIQUE INDEX news_items_source_url_unique ON public.news_items USING btree (source_url) WHERE (source_url IS NOT NULL);


-- -----------------------------------------------------------------------------
-- VIEWS
-- -----------------------------------------------------------------------------

CREATE VIEW public.cohorts_with_counts WITH (security_invoker=true) AS
 SELECT id,
    org_id,
    name,
    description,
    start_date,
    end_date,
    milestones,
    created_at,
    updated_at,
    status,
    access_mode,
    COALESCE(( SELECT count(*) AS count
           FROM cohort_startups cs
          WHERE cs.cohort_id = c.id), 0::bigint) AS startup_count,
    COALESCE(( SELECT count(*) AS count
           FROM cohort_requests cr
          WHERE cr.cohort_id = c.id AND cr.status = 'pending'::text), 0::bigint) AS pending_requests_count
   FROM cohorts c;


-- -----------------------------------------------------------------------------
-- FUNCTIONS (schemas public + private) with ACL
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION private.admin_can_see_founder(p_founder_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select exists (
    select 1 from private.admin_visible_founder_ids() v(id) where v.id = p_founder_id
  )
$function$
;
-- ACL: {postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres}

CREATE OR REPLACE FUNCTION private.admin_visible_founder_ids()
 RETURNS SETOF uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  with me as (
    select private.my_admin_org_id() as org_id
  ),
  linked as (
    -- (a) founder belongs to the org
    select f.id
    from public.profiles f
    join me on f.org_id = me.org_id
    union
    -- (b) founder owns a startup in one of the org's cohorts
    select s.founder_id
    from public.startups s
    join public.cohort_startups cs on cs.startup_id = s.id
    join public.cohorts c on c.id = cs.cohort_id
    join me on c.org_id = me.org_id
    union
    -- (c) founder requested to join one of the org's cohorts
    select cr.founder_id
    from public.cohort_requests cr
    join public.cohorts c on c.id = cr.cohort_id
    join me on c.org_id = me.org_id
    union
    -- (d) founder accepted an invitation from the org (auth email, not the
    --     user-editable profile email)
    select u.id
    from public.invitations i
    join auth.users u on lower(u.email) = lower(i.email)
    join me on i.org_id = me.org_id
    where i.status = 'accepted'
  )
  select l.id
  from linked l
  join public.profiles p on p.id = l.id and p.role = 'founder'
$function$
;
-- ACL: {postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres}

CREATE OR REPLACE FUNCTION private.my_admin_org_id()
 RETURNS uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select p.org_id
  from public.profiles p
  where p.id = auth.uid()
    and p.role = 'admin_org'
$function$
;
-- ACL: {postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres}

CREATE OR REPLACE FUNCTION private.my_profile_email()
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select p.email from public.profiles p where p.id = auth.uid()
$function$
;
-- ACL: {postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres}

CREATE OR REPLACE FUNCTION private.my_profile_org_id()
 RETURNS uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select p.org_id from public.profiles p where p.id = auth.uid()
$function$
;
-- ACL: {postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres}

CREATE OR REPLACE FUNCTION private.my_profile_role()
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select p.role from public.profiles p where p.id = auth.uid()
$function$
;
-- ACL: {postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres}

CREATE OR REPLACE FUNCTION private.organizations_guard_protected_columns()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  -- Backend contexts (service_role, postgres, cron) have no JWT subject.
  if auth.uid() is null then
    return new;
  end if;

  if public.is_superadmin() then
    return new;
  end if;

  if new.id             is distinct from old.id
  or new.plan           is distinct from old.plan
  or new.max_startups   is distinct from old.max_startups
  or new.is_active      is distinct from old.is_active
  or new.contract_start is distinct from old.contract_start
  or new.contract_end   is distinct from old.contract_end
  or new.created_at     is distinct from old.created_at
  then
    raise exception 'Solo un superadmin puede modificar plan, límites, estado o contrato de la organización'
      using errcode = '42501';
  end if;

  return new;
end;
$function$
;
-- ACL: {postgres=X/postgres}

CREATE OR REPLACE FUNCTION public.accept_invitation(p_token text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_uid uuid := auth.uid();
  v_user_email text;
  v_inv record;
  v_startup_id uuid;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  select email into v_user_email from auth.users where id = v_uid;

  select id, org_id, cohort_id, email, status, expires_at, invitation_type
    into v_inv
  from public.invitations
  where token = p_token;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'invitation_not_found');
  end if;

  if v_inv.status <> 'pending' then
    return jsonb_build_object('ok', false, 'error', 'invitation_not_pending');
  end if;

  if v_inv.expires_at < now() then
    return jsonb_build_object('ok', false, 'error', 'invitation_expired');
  end if;

  if lower(v_inv.email) <> lower(v_user_email) then
    return jsonb_build_object('ok', false, 'error', 'email_mismatch');
  end if;

  -- Apply role/org_id based on invitation type
  if v_inv.invitation_type = 'admin_org' then
    update public.profiles
      set role = 'admin_org', org_id = v_inv.org_id
      where id = v_uid;
  else
    update public.profiles
      set org_id = v_inv.org_id
      where id = v_uid;

    if v_inv.cohort_id is not null then
      select id into v_startup_id from public.startups where founder_id = v_uid limit 1;
      if v_startup_id is not null then
        insert into public.cohort_startups (cohort_id, startup_id)
        values (v_inv.cohort_id, v_startup_id)
        on conflict (cohort_id, startup_id) do nothing;
      end if;
    end if;
  end if;

  update public.invitations
    set status = 'accepted', accepted_at = now()
    where id = v_inv.id;

  return jsonb_build_object(
    'ok', true,
    'invitation_type', coalesce(v_inv.invitation_type, 'founder'),
    'org_id', v_inv.org_id
  );
end;
$function$
;
-- ACL: {postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres}

CREATE OR REPLACE FUNCTION public.calcular_percentil(p_score integer)
 RETURNS numeric
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_total integer;
  v_below integer;
BEGIN
  SELECT COUNT(*) INTO v_total FROM public.diagnostics WHERE score IS NOT NULL;
  IF v_total < 5 THEN
    RETURN NULL;  -- muestra insuficiente para un percentil significativo
  END IF;

  SELECT COUNT(*) INTO v_below
  FROM public.diagnostics
  WHERE score IS NOT NULL AND score < p_score;

  RETURN ROUND((v_below::numeric / v_total::numeric) * 100, 1);
END;
$function$
;
-- ACL: {=X/postgres,postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}

CREATE OR REPLACE FUNCTION public.check_ip_rate_limit(p_key text, p_limit integer, p_window_seconds integer)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_window_start timestamptz;
  v_count int;
begin
  if p_key is null or length(p_key) = 0 or length(p_key) > 256
     or p_limit is null or p_limit < 0
     or p_window_seconds is null or p_window_seconds <= 0 then
    raise exception 'check_ip_rate_limit: argumentos inválidos' using errcode = '22023';
  end if;

  v_window_start := to_timestamp(
    floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds
  );

  insert into public.ip_rate_limits as r (key, window_start, count)
  values (p_key, v_window_start, 1)
  on conflict (key, window_start)
  do update set count = r.count + 1
  returning r.count into v_count;

  -- Opportunistic cleanup (~2% of calls) of rows older than 1 day.
  if random() < 0.02 then
    delete from public.ip_rate_limits
    where window_start < now() - interval '1 day';
  end if;

  return v_count <= p_limit;
end;
$function$
;
-- ACL: {postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}

CREATE OR REPLACE FUNCTION public.get_public_passport(p_token text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_s record;
  v_founder_name text;
  v_org_name text;
begin
  select s.id, s.name, s.description, s.vertical, s.country, s.stage,
         s.diagnostic_score, s.website, s.linkedin, s.logo_url,
         s.team_size, s.has_mvp, s.has_paying_customers, s.paying_customers_count,
         s.tools_completed, s.score_by_dimension, s.current_stage_progress,
         s.created_at, s.founder_id, s.is_public
    into v_s
  from public.startups s
  where s.public_share_token = p_token;

  if not found or not v_s.is_public then
    return jsonb_build_object('ok', false, 'error', 'not_found_or_private');
  end if;

  select p.full_name into v_founder_name
  from public.profiles p where p.id = v_s.founder_id;

  select o.name into v_org_name
  from public.profiles p
  left join public.organizations o on o.id = p.org_id
  where p.id = v_s.founder_id;

  return jsonb_build_object(
    'ok', true,
    'name', v_s.name,
    'description', v_s.description,
    'vertical', v_s.vertical,
    'country', v_s.country,
    'stage', v_s.stage,
    'diagnostic_score', v_s.diagnostic_score,
    'website', v_s.website,
    'linkedin', v_s.linkedin,
    'logo_url', v_s.logo_url,
    'team_size', v_s.team_size,
    'has_mvp', v_s.has_mvp,
    'has_paying_customers', v_s.has_paying_customers,
    'paying_customers_count', v_s.paying_customers_count,
    'tools_completed', v_s.tools_completed,
    'score_by_dimension', v_s.score_by_dimension,
    'current_stage_progress', v_s.current_stage_progress,
    'created_at', v_s.created_at,
    'founder_name', v_founder_name,
    'org_name', v_org_name
  );
end;
$function$
;
-- ACL: {postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role, startup_name, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    'founder',
    COALESCE(NEW.raw_user_meta_data->>'startup_name', NULL),
    now(),
    now()
  );
  RETURN NEW;
END;
$function$
;
-- ACL: {postgres=X/postgres,service_role=X/postgres}

CREATE OR REPLACE FUNCTION public.is_admin_org()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role IN ('admin_org', 'superadmin')
  );
$function$
;
-- ACL: {postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres}

CREATE OR REPLACE FUNCTION public.is_superadmin()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role = 'superadmin'
  );
$function$
;
-- ACL: {postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres}

CREATE OR REPLACE FUNCTION public.lookup_cohort_by_share_token(p_token text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_row record;
BEGIN
  SELECT c.id, c.name, c.description, c.start_date, c.end_date, c.status,
         o.id as org_id, o.name as org_name, o.logo_url as org_logo
    INTO v_row
  FROM public.cohorts c
  JOIN public.organizations o ON o.id = c.org_id
  WHERE c.share_token = p_token;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_found');
  END IF;

  IF v_row.status NOT IN ('planned', 'active') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'cohort_not_open');
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'cohort_id', v_row.id,
    'cohort_name', v_row.name,
    'description', v_row.description,
    'start_date', v_row.start_date,
    'end_date', v_row.end_date,
    'status', v_row.status,
    'org_id', v_row.org_id,
    'org_name', v_row.org_name,
    'org_logo', v_row.org_logo
  );
END;
$function$
;
-- ACL: {=X/postgres,postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}

CREATE OR REPLACE FUNCTION public.lookup_invitation(p_token text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_inv record;
  v_org_name text;
begin
  select id, org_id, cohort_id, email, status, expires_at, invitation_type
    into v_inv
  from public.invitations
  where token = p_token;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  select name into v_org_name from public.organizations where id = v_inv.org_id;

  return jsonb_build_object(
    'ok', true,
    'email', v_inv.email,
    'status', v_inv.status,
    'expires_at', v_inv.expires_at,
    'invitation_type', coalesce(v_inv.invitation_type, 'founder'),
    'org_id', v_inv.org_id,
    'cohort_id', v_inv.cohort_id,
    'org_name', coalesce(v_org_name, 'la organización')
  );
end;
$function$
;
-- ACL: {postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}

CREATE OR REPLACE FUNCTION public.platform_capacity_snapshot()
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  v_db_size bigint;
  v_storage bigint;
  v_mau int;
  v_active_7d int;
  v_active_30d int;
  v_ai_calls int;
  v_orgs int;
  v_founders int;
  v_top jsonb;
  v_db_limit bigint := 500 * 1024 * 1024;        -- Free tier
  v_storage_limit bigint := 1024 * 1024 * 1024;  -- Free tier
  v_mau_limit int := 50000;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'superadmin'
  ) THEN
    RAISE EXCEPTION 'forbidden' USING errcode = '42501';
  END IF;

  SELECT pg_database_size(current_database()) INTO v_db_size;

  SELECT COALESCE(SUM((metadata->>'size')::bigint), 0)
    INTO v_storage FROM storage.objects;

  SELECT COUNT(*) INTO v_mau FROM auth.users
    WHERE last_sign_in_at >= now() - interval '30 days';

  SELECT COUNT(*) INTO v_active_7d
    FROM auth.users u JOIN public.profiles p ON p.id = u.id
    WHERE p.role = 'founder' AND u.last_sign_in_at >= now() - interval '7 days';

  SELECT COUNT(*) INTO v_active_30d
    FROM auth.users u JOIN public.profiles p ON p.id = u.id
    WHERE p.role = 'founder' AND u.last_sign_in_at >= now() - interval '30 days';

  SELECT COUNT(*) INTO v_ai_calls FROM public.ai_usage
    WHERE created_at >= now() - interval '30 days';

  SELECT COUNT(*) INTO v_orgs FROM public.organizations WHERE is_active = true;

  SELECT COUNT(*) INTO v_founders FROM public.profiles WHERE role = 'founder';

  SELECT jsonb_agg(t) INTO v_top FROM (
    SELECT
      relname AS name,
      pg_total_relation_size(relid) AS bytes,
      n_live_tup AS rows
    FROM pg_stat_user_tables
    WHERE schemaname = 'public'
    ORDER BY pg_total_relation_size(relid) DESC
    LIMIT 5
  ) t;

  RETURN json_build_object(
    'generated_at', now(),
    'db', json_build_object(
      'bytes', v_db_size,
      'limit_bytes', v_db_limit,
      'pct', round((v_db_size::numeric * 100 / v_db_limit), 2)
    ),
    'storage', json_build_object(
      'bytes', v_storage,
      'limit_bytes', v_storage_limit,
      'pct', round((v_storage::numeric * 100 / v_storage_limit), 2)
    ),
    'mau_30d', json_build_object(
      'count', v_mau,
      'limit', v_mau_limit,
      'pct', round((v_mau::numeric * 100 / v_mau_limit), 2)
    ),
    'active_founders_7d', v_active_7d,
    'active_founders_30d', v_active_30d,
    'ai_calls_30d', v_ai_calls,
    'orgs_active', v_orgs,
    'founders_total', v_founders,
    'top_tables', v_top
  );
END;
$function$
;
-- ACL: {postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres}

CREATE OR REPLACE FUNCTION public.regenerate_cohort_share_token(p_cohort_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_caller_role text;
  v_caller_org uuid;
  v_cohort_org uuid;
  v_new_token text;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_authenticated');
  END IF;

  SELECT role, org_id INTO v_caller_role, v_caller_org
  FROM public.profiles WHERE id = v_uid;

  SELECT org_id INTO v_cohort_org FROM public.cohorts WHERE id = p_cohort_id;
  IF v_cohort_org IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'cohort_not_found');
  END IF;

  IF v_caller_role = 'superadmin' OR (v_caller_role = 'admin_org' AND v_caller_org = v_cohort_org) THEN
    v_new_token := REPLACE(gen_random_uuid()::text, '-', '');
    UPDATE public.cohorts SET share_token = v_new_token WHERE id = p_cohort_id;
    RETURN jsonb_build_object('ok', true, 'share_token', v_new_token);
  END IF;

  RETURN jsonb_build_object('ok', false, 'error', 'forbidden');
END;
$function$
;
-- ACL: {postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres}

CREATE OR REPLACE FUNCTION public.submit_cohort_request_via_token(p_token text, p_message text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_cohort_id uuid;
  v_cohort_status text;
  v_startup_id uuid;
  v_request_id uuid;
  v_existing_status text;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_authenticated');
  END IF;

  SELECT c.id, c.status INTO v_cohort_id, v_cohort_status
  FROM public.cohorts c
  WHERE c.share_token = p_token;

  IF v_cohort_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'cohort_not_found');
  END IF;

  IF v_cohort_status NOT IN ('planned', 'active') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'cohort_not_open');
  END IF;

  -- Founder needs a startup row before they can request to join
  SELECT id INTO v_startup_id
  FROM public.startups
  WHERE founder_id = v_uid
  LIMIT 1;

  IF v_startup_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'no_startup');
  END IF;

  -- Idempotent: already pending → return existing
  SELECT id, status INTO v_request_id, v_existing_status
  FROM public.cohort_requests
  WHERE cohort_id = v_cohort_id AND founder_id = v_uid
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_request_id IS NOT NULL AND v_existing_status = 'pending' THEN
    RETURN jsonb_build_object(
      'ok', true,
      'request_id', v_request_id,
      'status', 'pending',
      'reused', true
    );
  END IF;

  -- Create new request
  INSERT INTO public.cohort_requests (cohort_id, founder_id, startup_id, status, message)
  VALUES (v_cohort_id, v_uid, v_startup_id, 'pending', p_message)
  RETURNING id INTO v_request_id;

  RETURN jsonb_build_object(
    'ok', true,
    'request_id', v_request_id,
    'status', 'pending',
    'reused', false
  );
END;
$function$
;
-- ACL: {postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres}

CREATE OR REPLACE FUNCTION public.toggle_public_passport(p_enable boolean)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_uid uuid := auth.uid();
  v_token text;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  if p_enable then
    v_token := encode(gen_random_bytes(18), 'base64');
    v_token := replace(replace(replace(v_token, '+', '-'), '/', '_'), '=', '');
    update public.startups
      set is_public = true,
          public_share_token = coalesce(public_share_token, v_token)
      where founder_id = v_uid
      returning public_share_token into v_token;
    return jsonb_build_object('ok', true, 'is_public', true, 'token', v_token);
  else
    update public.startups
      set is_public = false
      where founder_id = v_uid;
    return jsonb_build_object('ok', true, 'is_public', false);
  end if;
end;
$function$
;
-- ACL: {postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres}


-- -----------------------------------------------------------------------------
-- TRIGGERS
-- -----------------------------------------------------------------------------

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION handle_new_user();

CREATE TRIGGER organizations_guard_protected_columns BEFORE UPDATE ON public.organizations FOR EACH ROW EXECUTE FUNCTION private.organizations_guard_protected_columns();


-- -----------------------------------------------------------------------------
-- RLS POLICIES (public + storage)
-- -----------------------------------------------------------------------------

CREATE POLICY authenticated_insert_log ON public.activity_log AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((actor_id = ( SELECT auth.uid() AS uid)));

CREATE POLICY superadmin_read_log ON public.activity_log AS PERMISSIVE FOR SELECT TO authenticated
  USING (( SELECT is_superadmin() AS is_superadmin));

CREATE POLICY "Users insert own conversations" ON public.ai_conversations AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((( SELECT auth.uid() AS uid) = user_id));

CREATE POLICY "Users read own conversations" ON public.ai_conversations AS PERMISSIVE FOR SELECT TO authenticated
  USING ((( SELECT auth.uid() AS uid) = user_id));

CREATE POLICY "Users update own conversations" ON public.ai_conversations AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((( SELECT auth.uid() AS uid) = user_id));

CREATE POLICY users_insert_own_usage ON public.ai_usage AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((( SELECT auth.uid() AS uid) = user_id));

CREATE POLICY users_read_own_usage ON public.ai_usage AS PERMISSIVE FOR SELECT TO authenticated
  USING ((( SELECT auth.uid() AS uid) = user_id));

CREATE POLICY "Founders read own certificates" ON public.certificates AS PERMISSIVE FOR SELECT TO authenticated
  USING ((startup_id IN ( SELECT s.id
   FROM startups s
  WHERE (s.founder_id = ( SELECT auth.uid() AS uid)))));

CREATE POLICY admin_org_update_requests ON public.cohort_requests AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((cohort_id IN ( SELECT c.id
   FROM ((cohorts c
     JOIN organizations o ON ((c.org_id = o.id)))
     JOIN profiles p ON ((p.org_id = o.id)))
  WHERE ((p.id = ( SELECT auth.uid() AS uid)) AND (p.role = 'admin_org'::text)))));

CREATE POLICY admin_org_view_requests ON public.cohort_requests AS PERMISSIVE FOR SELECT TO authenticated
  USING ((cohort_id IN ( SELECT c.id
   FROM ((cohorts c
     JOIN organizations o ON ((c.org_id = o.id)))
     JOIN profiles p ON ((p.org_id = o.id)))
  WHERE ((p.id = ( SELECT auth.uid() AS uid)) AND (p.role = 'admin_org'::text)))));

CREATE POLICY founder_create_request ON public.cohort_requests AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((founder_id = ( SELECT auth.uid() AS uid)));

CREATE POLICY founder_own_requests ON public.cohort_requests AS PERMISSIVE FOR SELECT TO authenticated
  USING ((founder_id = ( SELECT auth.uid() AS uid)));

CREATE POLICY superadmin_all_requests ON public.cohort_requests AS PERMISSIVE FOR ALL TO authenticated
  USING (( SELECT is_superadmin() AS is_superadmin));

CREATE POLICY "Admins read cohort startups" ON public.cohort_startups AS PERMISSIVE FOR SELECT TO authenticated
  USING ((cohort_id IN ( SELECT c.id
   FROM cohorts c
  WHERE (c.org_id = ( SELECT p.org_id
           FROM profiles p
          WHERE (p.id = ( SELECT auth.uid() AS uid)))))));

CREATE POLICY org_admins_manage_cohort_startups ON public.cohort_startups AS PERMISSIVE FOR ALL TO authenticated
  USING ((cohort_id IN ( SELECT c.id
   FROM cohorts c
  WHERE (c.org_id = ( SELECT private.my_admin_org_id() AS my_admin_org_id)))))
  WITH CHECK ((cohort_id IN ( SELECT c.id
   FROM cohorts c
  WHERE (c.org_id = ( SELECT private.my_admin_org_id() AS my_admin_org_id)))));

CREATE POLICY superadmin_all_cohort_startups ON public.cohort_startups AS PERMISSIVE FOR ALL TO authenticated
  USING (( SELECT is_superadmin() AS is_superadmin));

CREATE POLICY "Admins read own cohorts" ON public.cohorts AS PERMISSIVE FOR SELECT TO authenticated
  USING ((org_id = ( SELECT p.org_id
   FROM profiles p
  WHERE (p.id = ( SELECT auth.uid() AS uid)))));

CREATE POLICY founders_read_open_cohorts ON public.cohorts AS PERMISSIVE FOR SELECT TO authenticated
  USING ((access_mode = 'open'::text));

CREATE POLICY org_admins_manage_cohorts ON public.cohorts AS PERMISSIVE FOR ALL TO authenticated
  USING ((org_id = ( SELECT private.my_admin_org_id() AS my_admin_org_id)))
  WITH CHECK ((org_id = ( SELECT private.my_admin_org_id() AS my_admin_org_id)));

CREATE POLICY superadmin_all_cohorts ON public.cohorts AS PERMISSIVE FOR ALL TO authenticated
  USING (( SELECT is_superadmin() AS is_superadmin));

CREATE POLICY diagnostic_leads_admin_read ON public.diagnostic_leads AS PERMISSIVE FOR SELECT TO authenticated
  USING (( SELECT is_superadmin() AS is_superadmin));

CREATE POLICY diagnostic_leads_admin_update ON public.diagnostic_leads AS PERMISSIVE FOR UPDATE TO authenticated
  USING (( SELECT is_superadmin() AS is_superadmin))
  WITH CHECK (( SELECT is_superadmin() AS is_superadmin));

CREATE POLICY diagnostic_leads_anon_insert ON public.diagnostic_leads AS PERMISSIVE FOR INSERT TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY admins_read_scoped_diagnostics ON public.diagnostics AS PERMISSIVE FOR SELECT TO authenticated
  USING ((user_id IN ( SELECT private.admin_visible_founder_ids() AS admin_visible_founder_ids)));

CREATE POLICY anon_insert_diagnostics ON public.diagnostics AS PERMISSIVE FOR INSERT TO anon
  WITH CHECK ((user_id IS NULL));

CREATE POLICY auth_users_insert_diagnostics ON public.diagnostics AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (((user_id IS NULL) OR (user_id = ( SELECT auth.uid() AS uid))));

CREATE POLICY superadmin_read_diagnostics ON public.diagnostics AS PERMISSIVE FOR SELECT TO authenticated
  USING (( SELECT is_superadmin() AS is_superadmin));

CREATE POLICY users_read_own_diagnostics ON public.diagnostics AS PERMISSIVE FOR SELECT TO authenticated
  USING ((user_id = ( SELECT auth.uid() AS uid)));

CREATE POLICY org_admins_manage_invitations ON public.invitations AS PERMISSIVE FOR ALL TO authenticated
  USING ((org_id IN ( SELECT p.org_id
   FROM profiles p
  WHERE ((p.id = ( SELECT auth.uid() AS uid)) AND (p.role = 'admin_org'::text)))))
  WITH CHECK (((org_id IN ( SELECT p.org_id
   FROM profiles p
  WHERE ((p.id = ( SELECT auth.uid() AS uid)) AND (p.role = 'admin_org'::text)))) AND (COALESCE(invitation_type, 'founder'::text) = 'founder'::text)));

CREATE POLICY superadmin_all_invitations ON public.invitations AS PERMISSIVE FOR ALL TO authenticated
  USING (( SELECT is_superadmin() AS is_superadmin));

CREATE POLICY users_read_own_invitations ON public.invitations AS PERMISSIVE FOR SELECT TO authenticated
  USING ((lower(email) = lower((( SELECT auth.jwt() AS jwt) ->> 'email'::text))));

CREATE POLICY anyone_read_active_news ON public.news_items AS PERMISSIVE FOR SELECT TO anon, authenticated
  USING ((is_active = true));

CREATE POLICY "Anyone can read opportunities" ON public.opportunities AS PERMISSIVE FOR SELECT TO public
  USING ((is_active = true));

CREATE POLICY "Founders read own matches" ON public.opportunity_matches AS PERMISSIVE FOR SELECT TO authenticated
  USING ((startup_id IN ( SELECT s.id
   FROM startups s
  WHERE (s.founder_id = ( SELECT auth.uid() AS uid)))));

CREATE POLICY "Founders update own matches" ON public.opportunity_matches AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((startup_id IN ( SELECT s.id
   FROM startups s
  WHERE (s.founder_id = ( SELECT auth.uid() AS uid)))));

CREATE POLICY founders_read_org_of_open_cohorts ON public.organizations AS PERMISSIVE FOR SELECT TO authenticated
  USING ((id IN ( SELECT cohorts.org_id
   FROM cohorts
  WHERE (cohorts.access_mode = 'open'::text))));

CREATE POLICY org_admins_read_org ON public.organizations AS PERMISSIVE FOR SELECT TO authenticated
  USING ((id = ( SELECT p.org_id
   FROM profiles p
  WHERE (p.id = ( SELECT auth.uid() AS uid)))));

CREATE POLICY org_admins_update_org ON public.organizations AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((id = ( SELECT private.my_admin_org_id() AS my_admin_org_id)))
  WITH CHECK ((id = ( SELECT private.my_admin_org_id() AS my_admin_org_id)));

CREATE POLICY superadmin_all_organizations ON public.organizations AS PERMISSIVE FOR ALL TO authenticated
  USING (( SELECT is_superadmin() AS is_superadmin));

CREATE POLICY anyone_read_settings ON public.platform_settings AS PERMISSIVE FOR SELECT TO public
  USING (true);

CREATE POLICY superadmin_manage_settings ON public.platform_settings AS PERMISSIVE FOR ALL TO authenticated
  USING (( SELECT is_superadmin() AS is_superadmin));

CREATE POLICY profiles_insert_own ON public.profiles AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (((id = ( SELECT auth.uid() AS uid)) AND (role = 'founder'::text) AND (org_id IS NULL)));

CREATE POLICY profiles_select_founders_for_admins ON public.profiles AS PERMISSIVE FOR SELECT TO authenticated
  USING (((role = 'founder'::text) AND (id IN ( SELECT private.admin_visible_founder_ids() AS admin_visible_founder_ids))));

CREATE POLICY profiles_select_own ON public.profiles AS PERMISSIVE FOR SELECT TO authenticated
  USING ((( SELECT auth.uid() AS uid) = id));

CREATE POLICY profiles_update_own ON public.profiles AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((id = ( SELECT auth.uid() AS uid)))
  WITH CHECK (((id = ( SELECT auth.uid() AS uid)) AND (role = ( SELECT private.my_profile_role() AS my_profile_role)) AND (NOT (org_id IS DISTINCT FROM ( SELECT private.my_profile_org_id() AS my_profile_org_id))) AND (email = ( SELECT private.my_profile_email() AS my_profile_email))));

CREATE POLICY profiles_update_superadmin ON public.profiles AS PERMISSIVE FOR UPDATE TO authenticated
  USING (( SELECT is_superadmin() AS is_superadmin))
  WITH CHECK (( SELECT is_superadmin() AS is_superadmin));

CREATE POLICY superadmin_all_profiles ON public.profiles AS PERMISSIVE FOR ALL TO authenticated
  USING (( SELECT is_superadmin() AS is_superadmin));

CREATE POLICY "Founders insert own startup" ON public.startups AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((( SELECT auth.uid() AS uid) = founder_id));

CREATE POLICY "Founders read own startup" ON public.startups AS PERMISSIVE FOR SELECT TO authenticated
  USING ((( SELECT auth.uid() AS uid) = founder_id));

CREATE POLICY "Founders update own startup" ON public.startups AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((( SELECT auth.uid() AS uid) = founder_id));

CREATE POLICY founders_manage_own_startup ON public.startups AS PERMISSIVE FOR ALL TO authenticated
  USING ((founder_id = ( SELECT auth.uid() AS uid)));

CREATE POLICY org_admins_read_startups ON public.startups AS PERMISSIVE FOR SELECT TO authenticated
  USING ((id IN ( SELECT cs.startup_id
   FROM (cohort_startups cs
     JOIN cohorts c ON ((c.id = cs.cohort_id)))
  WHERE (c.org_id = ( SELECT private.my_admin_org_id() AS my_admin_org_id)))));

CREATE POLICY public_passport_anon_read ON public.startups AS PERMISSIVE FOR SELECT TO anon
  USING (((is_public = true) AND (public_share_token IS NOT NULL)));

CREATE POLICY superadmin_all_startups ON public.startups AS PERMISSIVE FOR ALL TO authenticated
  USING (( SELECT is_superadmin() AS is_superadmin));

CREATE POLICY admin_org_view_tickets ON public.support_tickets AS PERMISSIVE FOR SELECT TO authenticated
  USING ((org_id IN ( SELECT p.org_id
   FROM profiles p
  WHERE ((p.id = ( SELECT auth.uid() AS uid)) AND (p.role = 'admin_org'::text)))));

CREATE POLICY reporter_create_ticket ON public.support_tickets AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((reporter_id = ( SELECT auth.uid() AS uid)));

CREATE POLICY reporter_own_tickets ON public.support_tickets AS PERMISSIVE FOR SELECT TO authenticated
  USING ((reporter_id = ( SELECT auth.uid() AS uid)));

CREATE POLICY superadmin_all_tickets ON public.support_tickets AS PERMISSIVE FOR ALL TO authenticated
  USING (( SELECT is_superadmin() AS is_superadmin));

CREATE POLICY participants_create_messages ON public.ticket_messages AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (((author_id = ( SELECT auth.uid() AS uid)) AND (ticket_id IN ( SELECT t.id
   FROM support_tickets t
  WHERE (t.reporter_id = ( SELECT auth.uid() AS uid))))));

CREATE POLICY participants_view_messages ON public.ticket_messages AS PERMISSIVE FOR SELECT TO authenticated
  USING (((is_internal = false) AND (ticket_id IN ( SELECT t.id
   FROM support_tickets t
  WHERE (t.reporter_id = ( SELECT auth.uid() AS uid))))));

CREATE POLICY superadmin_all_messages ON public.ticket_messages AS PERMISSIVE FOR ALL TO authenticated
  USING (( SELECT is_superadmin() AS is_superadmin));

CREATE POLICY org_admins_read_tool_data ON public.tool_data AS PERMISSIVE FOR SELECT TO authenticated
  USING ((user_id IN ( SELECT s.founder_id
   FROM ((startups s
     JOIN cohort_startups cs ON ((cs.startup_id = s.id)))
     JOIN cohorts c ON ((c.id = cs.cohort_id)))
  WHERE (c.org_id = ( SELECT private.my_admin_org_id() AS my_admin_org_id)))));

CREATE POLICY superadmin_all_tool_data ON public.tool_data AS PERMISSIVE FOR ALL TO authenticated
  USING (( SELECT is_superadmin() AS is_superadmin));

CREATE POLICY users_manage_own_tool_data ON public.tool_data AS PERMISSIVE FOR ALL TO authenticated
  USING ((user_id = ( SELECT auth.uid() AS uid)));

CREATE POLICY "Founders manage own startup KPIs" ON public.weekly_kpis AS PERMISSIVE FOR ALL TO authenticated
  USING ((startup_id IN ( SELECT s.id
   FROM startups s
  WHERE (s.founder_id = ( SELECT auth.uid() AS uid)))))
  WITH CHECK ((startup_id IN ( SELECT s.id
   FROM startups s
  WHERE (s.founder_id = ( SELECT auth.uid() AS uid)))));

CREATE POLICY "Org admins read cohort KPIs" ON public.weekly_kpis AS PERMISSIVE FOR SELECT TO authenticated
  USING ((startup_id IN ( SELECT cs.startup_id
   FROM ((cohort_startups cs
     JOIN cohorts c ON ((c.id = cs.cohort_id)))
     JOIN profiles p ON ((p.org_id = c.org_id)))
  WHERE ((p.id = ( SELECT auth.uid() AS uid)) AND (p.role = ANY (ARRAY['admin_org'::text, 'superadmin'::text]))))));

CREATE POLICY users_insert_own_downloads ON public.workbook_downloads AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((user_id = ( SELECT auth.uid() AS uid)));

CREATE POLICY users_read_own_downloads ON public.workbook_downloads AS PERMISSIVE FOR SELECT TO authenticated
  USING ((user_id = ( SELECT auth.uid() AS uid)));

CREATE POLICY logos_admin_delete ON storage.objects AS PERMISSIVE FOR DELETE TO authenticated
  USING (((bucket_id = 'logos'::text) AND ((storage.foldername(name))[1] = 'org-logos'::text) AND (EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = ANY (ARRAY['admin_org'::text, 'superadmin'::text])) AND ((p.role = 'superadmin'::text) OR ((p.org_id)::text = (storage.foldername(objects.name))[2])))))));

CREATE POLICY logos_admin_update ON storage.objects AS PERMISSIVE FOR UPDATE TO authenticated
  USING (((bucket_id = 'logos'::text) AND ((storage.foldername(name))[1] = 'org-logos'::text) AND (EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = ANY (ARRAY['admin_org'::text, 'superadmin'::text])) AND ((p.role = 'superadmin'::text) OR ((p.org_id)::text = (storage.foldername(objects.name))[2])))))));

CREATE POLICY logos_admin_write ON storage.objects AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (((bucket_id = 'logos'::text) AND ((storage.foldername(name))[1] = 'org-logos'::text) AND (EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = ANY (ARRAY['admin_org'::text, 'superadmin'::text])) AND ((p.role = 'superadmin'::text) OR ((p.org_id)::text = (storage.foldername(objects.name))[2])))))));

