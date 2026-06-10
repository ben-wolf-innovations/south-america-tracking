import { app } from '@azure/functions'
import { withAuth } from '../shared/auth.js'
import { getExchangeRates } from '../services/info.js'

app.http('getInfo', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'info/exchange-rates',
  handler: withAuth(async (request, context) => {
    try {
      const data = await getExchangeRates()
      return { status: 200, jsonBody: { success: true, data } }
    } catch (error) {
      context.error('Error fetching exchange rates:', error)
      return { status: 500, jsonBody: { success: false, error: error.message } }
    }
  })
})
