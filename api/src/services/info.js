const CURRENCIES = ['PEN', 'USD', 'BOB', 'CLP', 'ARS', 'UYU']

const CURRENCY_META = {
  PEN: { name: 'Peruvian Sol', country: 'Peru', symbol: 'S/.' },
  USD: { name: 'US Dollar', country: 'Ecuador', symbol: '$' },
  BOB: { name: 'Boliviano', country: 'Bolivia', symbol: 'Bs.' },
  CLP: { name: 'Chilean Peso', country: 'Chile', symbol: '$' },
  ARS: { name: 'Argentine Peso', country: 'Argentina', symbol: '$' },
  UYU: { name: 'Uruguayan Peso', country: 'Uruguay', symbol: '$U' },
}

const PAYMENT_INFO = {
  Peru: { paymentPreference: 'Mixed (Cash & Card)', mastercardAcceptance: 'Widely accepted in cities', atmFees: '10-15 PEN (~£2-3)' },
  Ecuador: { paymentPreference: 'Card-friendly (uses USD)', mastercardAcceptance: 'Widely accepted', atmFees: '$2-5 USD per withdrawal' },
  Bolivia: { paymentPreference: 'Cash-first', mastercardAcceptance: 'Limited outside cities', atmFees: '20-30 BOB (~£2-3)' },
  Chile: { paymentPreference: 'Very card-friendly', mastercardAcceptance: 'Widely accepted', atmFees: '3,000-4,500 CLP (~£3-4)' },
  Argentina: { paymentPreference: 'Mixed (increasingly card)', mastercardAcceptance: 'Widely accepted', atmFees: 'Variable (inflation affected)' },
  Uruguay: { paymentPreference: 'Card-friendly', mastercardAcceptance: 'Widely accepted', atmFees: '200-300 UYU (~£4-5)' },
}

const EMERGENCY_CONTACTS = {
  Peru: { police: '105', ambulance: '116', fire: '116', ukEmbassy: '+51 1 617 3000 (Lima)' },
  Ecuador: { police: '911', ambulance: '911', fire: '911', ukEmbassy: '+593 2 297 0800 (Quito)' },
  Bolivia: { police: '110', ambulance: '118', fire: '119', ukEmbassy: '+591 2 243 3424 (La Paz)' },
  Chile: { police: '133', ambulance: '131', fire: '132', ukEmbassy: '+56 2 2370 4100 (Santiago)' },
  Argentina: { police: '911', ambulance: '107', fire: '100', ukEmbassy: '+54 11 4808 2200 (Buenos Aires)' },
  Uruguay: { police: '911', ambulance: '105', fire: '104', ukEmbassy: '+598 2 622 3630 (Montevideo)' },
}

const TIME_ZONES = {
  Peru: { timezone: 'PET (UTC-5)', offset: -5 },
  Ecuador: { timezone: 'ECT (UTC-5)', offset: -5 },
  Bolivia: { timezone: 'BOT (UTC-4)', offset: -4 },
  Chile: { timezone: 'CLT (UTC-3/4)*', offset: -3, note: 'Daylight saving varies' },
  Argentina: { timezone: 'ART (UTC-3)', offset: -3 },
  Uruguay: { timezone: 'UYT (UTC-3)', offset: -3 },
}

const TIPPING_CUSTOMS = {
  Peru: { restaurant: '10% (often included)', hotel: '5-10 PEN per bag', taxi: 'Round up', guide: '50-100 PEN per day' },
  Ecuador: { restaurant: '10% (usually included)', hotel: '$1-2 per bag', taxi: 'Round up', guide: '$10-20 per day' },
  Bolivia: { restaurant: '5-10% (rarely included)', hotel: '5-10 BOB per bag', taxi: 'Not expected', guide: '50-100 BOB per day' },
  Chile: { restaurant: '10% (gratuity law)', hotel: '1,000 CLP per bag', taxi: 'Round up', guide: '10,000-20,000 CLP per day' },
  Argentina: { restaurant: '10% (rarely included)', hotel: '50-100 ARS per bag', taxi: 'Round up', guide: '500-1,000 ARS per day' },
  Uruguay: { restaurant: '10% (optional)', hotel: '50-100 UYU per bag', taxi: 'Round up', guide: '300-500 UYU per day' },
}

const POWER_PLUGS = {
  Peru: { voltage: '220V', frequency: '60Hz', plugs: 'A, B, C' },
  Ecuador: { voltage: '120V', frequency: '60Hz', plugs: 'A, B' },
  Bolivia: { voltage: '230V', frequency: '50Hz', plugs: 'A, C' },
  Chile: { voltage: '220V', frequency: '50Hz', plugs: 'C, L' },
  Argentina: { voltage: '220V', frequency: '50Hz', plugs: 'C, I' },
  Uruguay: { voltage: '230V', frequency: '50Hz', plugs: 'C, F, L' },
}

const CONNECTIVITY_INFO = {
  Peru: { mainProviders: 'Claro, Movistar, Entel', simAvailability: 'Widely available', uberAvailable: 'Yes (Lima, Cusco, Arequipa)', notes: 'WhatsApp widely used' },
  Ecuador: { mainProviders: 'Claro, Movistar, CNT', simAvailability: 'Easy to get', uberAvailable: 'Yes (Quito, Guayaquil)', notes: 'Good 4G in cities' },
  Bolivia: { mainProviders: 'Entel, Tigo, Viva', simAvailability: 'Available in cities', uberAvailable: 'Limited', notes: 'Patchy coverage outside cities' },
  Chile: { mainProviders: 'Entel, Movistar, Claro', simAvailability: 'Very easy', uberAvailable: 'Yes (Santiago, Valparaiso)', notes: 'Excellent coverage' },
  Argentina: { mainProviders: 'Personal, Movistar, Claro', simAvailability: 'Easy (need ID)', uberAvailable: 'Yes (Buenos Aires, major cities)', notes: 'Good 4G in populated areas' },
  Uruguay: { mainProviders: 'Antel, Movistar, Claro', simAvailability: 'Easy to get', uberAvailable: 'Yes (Montevideo)', notes: 'Very good coverage' },
}

const VISA_INFO = {
  Peru: { ukVisaFree: '183 days', entry: 'Passport valid 6 months', notes: 'Free tourist card on arrival' },
  Ecuador: { ukVisaFree: '90 days', entry: 'Passport valid 6 months', notes: 'Free entry stamp' },
  Bolivia: { ukVisaFree: '90 days', entry: 'Passport valid 6 months', notes: 'Free entry stamp' },
  Chile: { ukVisaFree: '90 days', entry: 'Passport valid 6 months', notes: 'Free entry (PDI form)' },
  Argentina: { ukVisaFree: '90 days', entry: 'Passport valid 6 months', notes: 'Free entry stamp' },
  Uruguay: { ukVisaFree: '90 days', entry: 'Passport valid 6 months', notes: 'Free entry stamp' },
}

const LOCAL_APPS = {
  Peru: { transport: 'Beat, Cabify, InDrive', payment: 'Yape, Plin', other: 'Rappi (delivery)' },
  Ecuador: { transport: 'Uber, Cabify, inDriver', payment: 'Limited (cash common)', other: 'Rappi, Glovo' },
  Bolivia: { transport: 'PideTaxi, inDriver', payment: 'Limited (cash preferred)', other: 'Very limited' },
  Chile: { transport: 'Uber, Cabify, DiDi', payment: 'Mach, Mercado Pago', other: 'Rappi, Cornershop' },
  Argentina: { transport: 'Uber, Cabify, DiDi', payment: 'Mercado Pago (essential)', other: 'Rappi, PedidosYa' },
  Uruguay: { transport: 'Uber, Cabify', payment: 'Mercado Pago, Prex', other: 'PedidosYa' },
}

const CACHE_TTL_MS = 30 * 60 * 1000
let ratesCache = null
let ratesCachedAt = null

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
    payment_info: Object.entries(PAYMENT_INFO).map(([country, info]) => ({ country, ...info })),
    emergency_contacts: Object.entries(EMERGENCY_CONTACTS).map(([country, info]) => ({ country, ...info })),
    time_zones: Object.entries(TIME_ZONES).map(([country, info]) => ({ country, ...info })),
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
