import { app } from '@azure/functions'
import { withAuth, requireAdmin } from '../shared/auth.js'
import { getExchangeRates, getTimeZones } from '../services/info.js'

app.http('getInfo', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'info/exchange-rates',
  handler: requireAdmin(async (request, context) => {
    try {
      const data = await getExchangeRates()
      return { status: 200, jsonBody: { success: true, data } }
    } catch (error) {
      context.error('Error fetching exchange rates:', error)
      return { status: 500, jsonBody: { success: false, error: error.message } }
    }
  })
})

app.http('getTimeZones', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'info/time-zones',
  handler: withAuth(async () => {
    return { status: 200, jsonBody: { success: true, data: getTimeZones() } }
  })
})
