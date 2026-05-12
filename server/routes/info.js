import express from 'express'
import { authenticateToken } from '../middleware/auth.js'

const router = express.Router()

// Simple in-memory cache: refresh at most once every 30 minutes
let ratesCache = null
let ratesCachedAt = null
const CACHE_TTL_MS = 30 * 60 * 1000

const CURRENCIES = ['PEN', 'USD', 'BOB', 'CLP', 'ARS', 'UYU']

const CURRENCY_META = {
  PEN: { name: 'Peruvian Sol',       country: 'Peru',      symbol: 'S/.' },
  USD: { name: 'US Dollar',          country: 'Ecuador',   symbol: '$'  },
  BOB: { name: 'Boliviano',          country: 'Bolivia',   symbol: 'Bs.' },
  CLP: { name: 'Chilean Peso',       country: 'Chile',     symbol: '$'  },
  ARS: { name: 'Argentine Peso',     country: 'Argentina', symbol: '$'  },
  UYU: { name: 'Uruguayan Peso',     country: 'Uruguay',   symbol: '$U' },
}

const PAYMENT_INFO = {
  Peru: { 
    paymentPreference: 'Mixed (Cash & Card)',
    mastercardAcceptance: 'Widely accepted in cities',
    atmFees: '10-15 PEN (~£2-3)'
  },
  Ecuador: { 
    paymentPreference: 'Card-friendly (uses USD)',
    mastercardAcceptance: 'Widely accepted',
    atmFees: '$2-5 USD per withdrawal'
  },
  Bolivia: { 
    paymentPreference: 'Cash-first',
    mastercardAcceptance: 'Limited outside cities',
    atmFees: '20-30 BOB (~£2-3)'
  },
  Chile: { 
    paymentPreference: 'Very card-friendly',
    mastercardAcceptance: 'Widely accepted',
    atmFees: '3,000-4,500 CLP (~£3-4)'
  },
  Argentina: { 
    paymentPreference: 'Mixed (increasingly card)',
    mastercardAcceptance: 'Widely accepted',
    atmFees: 'Variable (inflation affected)'
  },
  Uruguay: { 
    paymentPreference: 'Card-friendly',
    mastercardAcceptance: 'Widely accepted',
    atmFees: '200-300 UYU (~£4-5)'
  },
}

/**
 * GET /api/info/exchange-rates
 * Returns live GBP → South American currency rates.
 * Uses open.er-api.com (free, no key required, updated every 24 h).
 * Results are cached server-side for 30 minutes.
 */
router.get('/exchange-rates', authenticateToken, async (req, res) => {
  try {
    const now = Date.now()
    const cacheValid = ratesCache && ratesCachedAt && (now - ratesCachedAt < CACHE_TTL_MS)

    if (!cacheValid) {
      const url = `https://open.er-api.com/v6/latest/GBP`
      const response = await fetch(url)

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

    const paymentInfo = Object.entries(PAYMENT_INFO).map(([country, info]) => ({
      country,
      ...info
    }))

    res.json({
      success: true,
      data: {
        base: 'GBP',
        rates,
        payment_info: paymentInfo,
        last_updated: ratesCache.time_last_update_utc,
        next_update: ratesCache.time_next_update_utc,
        cached_at: new Date(ratesCachedAt).toISOString(),
      }
    })
  } catch (error) {
    console.error('Error fetching exchange rates:', error)
    res.status(502).json({ success: false, error: 'Failed to fetch exchange rates: ' + error.message })
  }
})

export default router
