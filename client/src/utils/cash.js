// Total of the known amounts, optionally for one stage ('landing' or 'later').
export function cashTotal(items, stage) {
  return items
    .filter(item => !stage || item.stage === stage)
    .reduce((sum, item) => sum + (item.amount ?? 0), 0)
}

export const hasUnknownAmounts = (items) => items.some(item => item.amount === null)

export const formatUsd = (amount) => `$${amount.toLocaleString('en-GB')}`

// Rounded to the nearest £10, as it is only a guide.
export function formatGbpEquivalent(usd, usdPerGbp) {
  if (!usdPerGbp) return null
  const gbp = Math.round(usd / usdPerGbp / 10) * 10
  return `about £${gbp.toLocaleString('en-GB')}`
}
