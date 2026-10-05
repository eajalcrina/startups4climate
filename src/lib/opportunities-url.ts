/**
 * Resolves an opportunity application_url to the most specific useful URL.
 *
 * Priority:
 * 1. VERIFIED_PROGRAM_URLS — known program/apply pages for each org
 * 2. AI-provided URL — allowed if it comes from a trusted domain
 * 3. Fallback — origin homepage
 *
 * Used by: /api/cron/opportunities, /api/admin/refresh-oportunidades
 */

/** Program-specific landing/apply pages — more useful than bare homepages */
const VERIFIED_PROGRAM_URLS: Record<string, string> = {
  'bid lab':              'https://bidlab.org/calls',
  'idb lab':              'https://bidlab.org/calls',
  'wayra':                'https://www.wayra.com/en/open-startups',
  'corfo':                'https://www.corfo.cl/sites/cpp/convocatorias',
  'start-up chile':       'https://www.startupchile.org/programs/',
  'startup chile':        'https://www.startupchile.org/programs/',
  'innpulsa':             'https://www.innpulsacolombia.com/convocatorias',
  'fondep':               'https://www.fondep.gob.pe/convocatorias/',
  'concytec':             'https://www.gob.pe/concytec',
  'prociencia':           'https://www.gob.pe/prociencia',
  'proinnóvate':          'https://www.proinnovate.gob.pe/convocatorias',
  'proinnovate':          'https://www.proinnovate.gob.pe/convocatorias',
  'endeavor':             'https://endeavor.org/entrepreneurs/',
  'village capital':      'https://vilcap.com/programs',
  'y combinator':         'https://www.ycombinator.com/apply',
  'techstars':            'https://www.techstars.com/accelerators',
  '500 global':           'https://500.co/accelerators',
  'seedstars':            'https://www.seedstars.com/programs/',
  'kaszek':               'https://www.kaszek.com',
  'nxtp ventures':        'https://www.nxtpventures.com',
  'cometa':               'https://www.cometa.com.co',
  'giz':                  'https://www.giz.de/en/ourservices/innovationlab.html',
  'usaid':                'https://www.usaid.gov/partner-with-us',
  'green climate fund':   'https://www.greenclimate.fund/projects',
  'climateworks':         'https://www.climateworks.org/programs/',
  'acumen':               'https://acumen.org/programs/',
  'omidyar':              'https://omidyar.com',
  'google for startups':  'https://startup.google.com/programs/',
  'microsoft for startups': 'https://www.microsoft.com/en-us/startups',
  'aws activate':         'https://aws.amazon.com/activate/',
  'fontagro':             'https://www.fontagro.org/convocatorias/',
  'caf':                  'https://www.caf.com/en/currently/calls-for-proposals/',
  'fao':                  'https://www.fao.org/grants-and-funding/en/',
  'clean energy ventures': 'https://www.cleanenergyventures.com/apply/',
  'climatelaunchpad':     'https://climatelaunchpad.com/apply/',
  'climate launchpad':    'https://climatelaunchpad.com/apply/',
}

/** Trusted domain roots — allow AI-provided URLs from these if they have a real path */
const TRUSTED_DOMAINS: string[] = [
  'bidlab.org', 'wayra.com', 'corfo.cl', 'startupchile.org', 'innpulsacolombia.com',
  'fondep.gob.pe', 'gob.pe', 'proinnovate.gob.pe', 'endeavor.org', 'vilcap.com',
  'ycombinator.com', 'techstars.com', '500.co', 'seedstars.com', 'kaszek.com',
  'giz.de', 'usaid.gov', 'greenclimate.fund', 'climateworks.org', 'acumen.org',
  'startup.google.com', 'microsoft.com', 'fontagro.org', 'caf.com', 'fao.org',
  'cleanenergyventures.com', 'aws.amazon.com', 'climatelaunchpad.com',
  'nxtpventures.com', 'cometa.com.co', 'omidyar.com',
]

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Keys match as whole words/phrases (Unicode-aware), so a short key like
 * "caf" matches "CAF - Banco de Desarrollo" but not "Cafetaleros Unidos".
 */
const VERIFIED_PROGRAM_MATCHERS: Array<{ re: RegExp; url: string }> = Object.entries(VERIFIED_PROGRAM_URLS).map(
  ([key, url]) => ({
    re: new RegExp(`(?<![\\p{L}\\p{N}])${escapeRegExp(key.normalize('NFC'))}(?![\\p{L}\\p{N}])`, 'u'),
    url,
  })
)

export function resolveOpportunityUrl(org: string, rawUrl: string): string {
  const orgLower = org.normalize('NFC').toLowerCase()

  // 1. Program-specific verified URL
  for (const { re, url } of VERIFIED_PROGRAM_MATCHERS) {
    if (re.test(orgLower)) return url
  }

  // 2. AI-provided URL from a trusted domain — preserve it (may have a real program path)
  try {
    const parsed = new URL(rawUrl)
    const host = parsed.hostname.replace(/^www\./, '')
    const isTrusted = TRUSTED_DOMAINS.some(d => host === d || host.endsWith('.' + d))
    if (isTrusted) return rawUrl
  } catch {
    // malformed URL — fall through
  }

  // 3. Fallback: use just the origin
  try {
    return `${new URL(rawUrl).origin}/`
  } catch {
    return rawUrl
  }
}
