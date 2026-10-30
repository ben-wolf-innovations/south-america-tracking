const CURRENCIES = ['PEN', 'USD', 'BOB', 'CLP', 'ARS', 'UYU']

const CURRENCY_META = {
  PEN: { name: 'Peruvian Sol', country: 'Peru', symbol: 'S/.' },
  USD: { name: 'US Dollar', country: 'Ecuador', symbol: '$' },
  BOB: { name: 'Boliviano', country: 'Bolivia', symbol: 'Bs.' },
  CLP: { name: 'Chilean Peso', country: 'Chile', symbol: '$' },
  ARS: { name: 'Argentine Peso', country: 'Argentina', symbol: '$' },
  UYU: { name: 'Uruguayan Peso', country: 'Uruguay', symbol: '$U' },
}

// Cash notes researched Oct 2026. Fees and caps come from travel guides as
// well as banks, so check the ATM screen and the apps before relying on them.
const CASH_ACCOUNTS = [
  {
    name: 'Monzo Perks (both of us)',
    allowance: '£600 each per rolling 30 days, so £1,200 between us',
    overLimit: '3%',
    notes: 'Joint account cards count against the cardholder\'s own £600, so there is no need to move money to personal accounts first.',
  },
  {
    name: 'Wise (one account)',
    allowance: '£250 per calendar month, resets on the 1st',
    overLimit: '2.69%',
    notes: 'Convert to USD in the app before Ecuador, so the Quito withdrawals need no conversion.',
  },
  {
    name: 'Western Union (one account)',
    allowance: 'Does not use any ATM allowance',
    overLimit: 'Transfer fee plus exchange margin, compare in the app',
    notes: 'Pay by bank transfer from Monzo where offered. Collect with the passport of whoever is named as receiver, plus the MTCN.',
  },
]

const CASH_RULES = [
  'Pay by Monzo card wherever possible. No fee and no limit.',
  'For cash, use Monzo first, then Wise, then Western Union for large amounts.',
  'Over the allowance, Wise (2.69%) is slightly cheaper than Monzo (3%).',
  'Always choose the local currency on ATMs and card machines and decline the conversion offer.',
  'Local banks still charge their own ATM fee, so take fewer, larger withdrawals.',
  'Keep $100-200 in clean US notes as an emergency reserve. Get it in Ecuador.',
  'Split cash between both of us and a hidden stash. Carry only the day\'s money.',
]

const CASH_ROUTE = [
  {
    stage: 'Peru',
    plan: 'Withdraw at Banco de la Nación in Lima, Cusco and Arequipa. Carry cash into Machu Picchu, Huacachina, Huaraz and Iquitos, where ATMs are few. Go easy on Monzo cash in the last three weeks so the 30-day allowance is free for Quito.',
  },
  {
    stage: 'Quito (both stops)',
    plan: 'Get the Galapagos cash here. ATMs give about $300-500 a time, so spread it across both Quito stops and both cards, or collect one Western Union transfer in USD. Ask for $20s and smaller.',
  },
  {
    stage: 'Galapagos',
    plan: 'Land with enough for Isabela, which has no reliable ATM. Top up in Puerto Ayora on Santa Cruz, but not around Christmas Day, when banks shut and machines run dry.',
  },
  {
    stage: 'Bolivia',
    plan: 'Change leftover USD in La Paz. Withdraw in La Paz, Sucre or Santa Cruz before Copacabana, Isla del Sol, Rurrenabaque and Uyuni, where ATMs are missing or empty. Uyuni tours and park fees are usually cash.',
  },
  {
    stage: 'Chile',
    plan: 'Card almost everywhere. One BancoEstado withdrawal covers small cash. Buy the Easter Island park ticket online before going.',
  },
  {
    stage: 'Argentina',
    plan: 'Pay by card in pesos. For cash, collect a Western Union transfer in Salta before the small northern towns, then again in Mendoza, Bariloche and Buenos Aires as needed. Avoid ATMs.',
  },
  {
    stage: 'Uruguay',
    plan: 'Pay by card in restaurants and hotels to skip VAT. Very little cash needed.',
  },
]

const CASH_INFO = {
  Peru: {
    cards: 'Fine in Lima, Cusco and Arequipa. Markets, colectivos and small towns are cash only.',
    cashNeed: 'Medium',
    bestAtms: 'Banco de la Nación (MultiRed): usually no fee, about S/400 per withdrawal.',
    feesAndCaps: 'BCP, BBVA, Interbank and Scotiabank charge about S/15-28 per withdrawal.',
    tips: 'Some places add 3-5% for card. Yape and Plin need a Peruvian bank account.',
  },
  Ecuador: {
    cards: 'Fine in Quito and bigger hotels. Cash for buses, markets, Baños and Tena.',
    cashNeed: 'Medium (US dollars)',
    bestAtms: 'Banco Internacional (often free), Banco Guayaquil (about $3.50), Banco del Pacífico (low).',
    feesAndCaps: 'Pichincha and Produbanco charge about $4-5. Most give $300-500 per withdrawal.',
    tips: 'Cheapest place on the trip to get US dollars. $50 and $100 notes are hard to break.',
  },
  Bolivia: {
    cards: 'Bigger hotels and restaurants in La Paz and Santa Cruz. Almost everything else is cash.',
    cashNeed: 'High',
    bestAtms: 'Banco Unión, BancoSol, BNB, Bisa and Ganadero in the big cities.',
    feesAndCaps: 'From free to about Bs35-50 per withdrawal. Caps about Bs2,000-3,500.',
    tips: 'The currency floated in June 2026 and official and street rates are now close. Check the live rate before changing USD.',
  },
  Chile: {
    cards: 'Accepted almost everywhere, including contactless for small purchases.',
    cashNeed: 'Low',
    bestAtms: 'BancoEstado: about CLP 5,500 fee, but up to CLP 600,000 per withdrawal.',
    feesAndCaps: 'Santander and Banco de Chile charge CLP 8,500+ with a CLP 200,000 cap. No reliably free ATM.',
    tips: 'Take one large BancoEstado withdrawal rather than several small ones. San Pedro ATMs often run out.',
  },
  Argentina: {
    cards: 'Widely accepted, and foreign cards now get close to the market rate. Always pay in pesos.',
    cashNeed: 'Medium',
    bestAtms: 'Avoid ATMs. Use Western Union instead (passport and MTCN).',
    feesAndCaps: 'ATMs charge the equivalent of $8-15 per withdrawal with low caps.',
    tips: 'Central Western Union offices pay out more than post office counters. Expect queues. Some places give 5-10% off for cash.',
  },
  Uruguay: {
    cards: 'Preferred. Foreign cards skip the 22% VAT in restaurants, bars and cafés (until 30 Apr 2027) and on accommodation.',
    cashNeed: 'Very low',
    bestAtms: 'BROU: usually no operator fee.',
    feesAndCaps: 'Caps about UYU 8,000-20,000. Choose pesos, not dollars.',
    tips: 'Pay by card wherever possible for the VAT saving.',
  },
}

// US dollars for the two of us. "stage" says whether it is needed on landing
// (Isabela has no reliable ATM) or can come from Puerto Ayora's ATMs later.
// A null amount is not known yet.
const GALAPAGOS_CASH = [
  { item: 'Isabela tours (booked)', amount: 500, stage: 'landing', note: 'Paid on Isabela' },
  { item: 'National Park entry', amount: 400, stage: 'landing', note: '$200 each, cash at the arrival airport' },
  { item: 'Transit Control Card', amount: 40, stage: 'landing', note: '$20 each at Quito airport before check-in' },
  { item: 'Isabela arrival fee', amount: 20, stage: 'landing', note: '$10 each at the dock' },
  { item: 'Ferries Santa Cruz to Isabela and back', amount: 160, stage: 'landing', note: 'About $35-45 each per trip, cheaper bought in town' },
  { item: 'Water taxis', amount: 20, stage: 'landing', note: '$1-2 each per trip' },
  { item: 'Food, drinks and tips on Isabela (3 days)', amount: 240, stage: 'landing', note: 'About $80 a day for two' },
  { item: 'Food, drinks and tips on Santa Cruz (5 days)', amount: 400, stage: 'later', note: 'About $80 a day for two' },
  { item: 'Santa Cruz tours (4 days)', amount: null, stage: 'later', note: 'Add once booked. Operators add 5-10% for card' },
]

const EMERGENCY_CONTACTS = {
  Peru: { police: '105', ambulance: '106', fire: '116', ukEmbassy: '+51 1 617 3000 (Lima)' },
  Ecuador: { police: '911', ambulance: '911', fire: '911', ukEmbassy: '+593 2 397 2200 (Quito)' },
  Bolivia: { police: '110', ambulance: '118', fire: '119', ukEmbassy: '+591 2 201 0020 (La Paz)' },
  Chile: { police: '133', ambulance: '131', fire: '132', ukEmbassy: '+56 2 2370 4100 (Santiago)' },
  Argentina: { police: '911', ambulance: '107', fire: '100', ukEmbassy: '+54 11 4808 2200 (Buenos Aires)' },
  Uruguay: { police: '911', ambulance: '911', fire: '911', ukEmbassy: '+598 2622 3630 (Montevideo)' },
}

// IANA zone names, so the client can show the live local time and offset,
// including Chile's clock changes.
const TIME_ZONES = [
  { place: 'Peru', zone: 'America/Lima' },
  { place: 'Ecuador', zone: 'America/Guayaquil' },
  { place: 'Galapagos', zone: 'Pacific/Galapagos', note: 'One hour behind mainland Ecuador' },
  { place: 'Bolivia', zone: 'America/La_Paz' },
  { place: 'Chile', zone: 'America/Santiago', note: 'Clocks change in April and September' },
  { place: 'Chilean Patagonia', zone: 'America/Punta_Arenas', note: 'Puerto Natales and Torres del Paine. No clock changes' },
  { place: 'Easter Island', zone: 'Pacific/Easter', note: 'Two hours behind Santiago' },
  { place: 'Argentina', zone: 'America/Argentina/Buenos_Aires' },
  { place: 'Uruguay', zone: 'America/Montevideo' },
]

const TIPPING_CUSTOMS = {
  Peru: { restaurant: '10% (check bill)', hotel: '5-10 PEN per bag', taxi: 'Round up', guide: '50-100 PEN per day' },
  Ecuador: { restaurant: '10% (usually included)', hotel: '$1-2 per bag', taxi: 'Round up', guide: '$10-20 per day' },
  Bolivia: { restaurant: '5-10% (rarely included)', hotel: '10-20 BOB per bag', taxi: 'Not expected', guide: '150-300 BOB per day' },
  Chile: { restaurant: '10% (suggested on bill)', hotel: '1,000 CLP per bag', taxi: 'Round up', guide: '10,000-20,000 CLP per day' },
  Argentina: { restaurant: '10% (rarely included)', hotel: '1,500-3,000 ARS per bag', taxi: 'Round up', guide: '15,000-30,000 ARS per day' },
  Uruguay: { restaurant: '10% (optional)', hotel: '50-100 UYU per bag', taxi: 'Round up', guide: '300-500 UYU per day' },
}

const POWER_PLUGS = {
  Peru: { voltage: '220V', frequency: '60Hz', plugs: 'A, C' },
  Ecuador: { voltage: '120V', frequency: '60Hz', plugs: 'A, B' },
  Bolivia: { voltage: '230V', frequency: '50Hz', plugs: 'A, C' },
  Chile: { voltage: '220V', frequency: '50Hz', plugs: 'C, L' },
  Argentina: { voltage: '220V', frequency: '50Hz', plugs: 'I (some C)' },
  Uruguay: { voltage: '230V', frequency: '50Hz', plugs: 'C, F, L' },
}

const CONNECTIVITY_INFO = {
  Peru: { mainProviders: 'Claro, Movistar, Entel', simAvailability: 'Widely available', uberAvailable: 'Yes (Lima, Cusco, Arequipa)', notes: 'WhatsApp widely used' },
  Ecuador: { mainProviders: 'Claro, Movistar, CNT', simAvailability: 'Easy to get', uberAvailable: 'Yes (Quito, Guayaquil)', notes: 'Good 4G in cities' },
  Bolivia: { mainProviders: 'Entel, Tigo, Viva', simAvailability: 'Available in cities', uberAvailable: 'Yes (La Paz, Santa Cruz, Cochabamba)', notes: 'Patchy coverage outside cities' },
  Chile: { mainProviders: 'Entel, Movistar, Claro', simAvailability: 'Very easy', uberAvailable: 'Yes (Santiago, Valparaiso)', notes: 'Excellent coverage' },
  Argentina: { mainProviders: 'Personal, Movistar, Claro', simAvailability: 'Easy (need ID)', uberAvailable: 'Yes (Buenos Aires, major cities)', notes: 'Good 4G in populated areas' },
  Uruguay: { mainProviders: 'Antel, Movistar, Claro', simAvailability: 'Easy to get', uberAvailable: 'Yes (Montevideo)', notes: 'Very good coverage' },
}

const VISA_INFO = {
  Peru: { ukVisaFree: '90 days (max 183 a year)', entry: 'Passport valid 6 months', notes: 'Entry recorded digitally at airports. Land crossings still stamp' },
  Ecuador: { ukVisaFree: '90 days per 12 months', entry: 'Passport valid 6 months', notes: 'Galapagos: $20 Transit Control Card, $200 park fee, return ticket and booked accommodation' },
  Bolivia: { ukVisaFree: '90 days', entry: 'Passport valid 6 months, 2 blank pages', notes: 'Free entry stamp' },
  Chile: { ukVisaFree: '90 days', entry: 'Passport valid for stay', notes: 'Keep the PDI tourist card for exit. SAG customs declaration on arrival' },
  Argentina: { ukVisaFree: '90 days', entry: 'Passport valid for stay', notes: 'Free entry. Carry travel health insurance' },
  Uruguay: { ukVisaFree: '90 days', entry: 'Passport valid for stay, 1 blank page', notes: 'Free entry stamp' },
}

const LOCAL_APPS = {
  Peru: { transport: 'Uber, Cabify, InDrive', payment: 'Yape, Plin (locals only, use card)', other: 'Rappi (delivery)' },
  Ecuador: { transport: 'Uber, InDrive', payment: 'Limited (cash common)', other: 'Rappi, PedidosYa' },
  Bolivia: { transport: 'Uber, InDrive, Yango', payment: 'Limited (cash preferred)', other: 'PedidosYa' },
  Chile: { transport: 'Uber, Cabify, DiDi', payment: 'Mach, Mercado Pago (need RUT, use card)', other: 'Rappi, Uber Eats' },
  Argentina: { transport: 'Uber, Cabify, DiDi', payment: 'Mercado Pago (needs DNI, foreign cards OK)', other: 'Rappi, PedidosYa' },
  Uruguay: { transport: 'Uber, Cabify', payment: 'Mercado Pago, Prex (residents, use card)', other: 'PedidosYa' },
}

const CACHE_TTL_MS = 30 * 60 * 1000
let ratesCache = null
let ratesCachedAt = null

export function getTimeZones() {
  return TIME_ZONES
}

export async function getExchangeRates() {
  const now = Date.now()
  const cacheValid = ratesCache && ratesCachedAt && (now - ratesCachedAt < CACHE_TTL_MS)

  if (!cacheValid) {
    const response = await fetch('https://open.er-api.com/v6/latest/GBP')

    if (!response.ok) {
      throw new Error(`Exchange rate API responded with ${response.status}`)
    }

    const json = await response.json()

    if (json.result !== 'success') {
      throw new Error('Exchange rate API returned unsuccessful result')
    }

    ratesCache = json
    ratesCachedAt = now
  }

  const rates = CURRENCIES.map(code => ({
    code,
    ...CURRENCY_META[code],
    rate: ratesCache.rates[code] ?? null,
  }))

  return {
    base: 'GBP',
    rates,
    cash_info: {
      accounts: CASH_ACCOUNTS,
      rules: CASH_RULES,
      route: CASH_ROUTE,
      countries: Object.entries(CASH_INFO).map(([country, info]) => ({ country, ...info })),
      galapagos: GALAPAGOS_CASH,
    },
    emergency_contacts: Object.entries(EMERGENCY_CONTACTS).map(([country, info]) => ({ country, ...info })),
    time_zones: TIME_ZONES,
    tipping_customs: Object.entries(TIPPING_CUSTOMS).map(([country, info]) => ({ country, ...info })),
    power_plugs: Object.entries(POWER_PLUGS).map(([country, info]) => ({ country, ...info })),
    connectivity_info: Object.entries(CONNECTIVITY_INFO).map(([country, info]) => ({ country, ...info })),
    visa_info: Object.entries(VISA_INFO).map(([country, info]) => ({ country, ...info })),
    local_apps: Object.entries(LOCAL_APPS).map(([country, info]) => ({ country, ...info })),
    last_updated: ratesCache.time_last_update_utc,
    next_update: ratesCache.time_next_update_utc,
    cached_at: new Date(ratesCachedAt).toISOString(),
  }
}
