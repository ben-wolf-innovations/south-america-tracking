import { cashTotal, hasUnknownAmounts, formatUsd, formatGbpEquivalent } from '../../utils/cash'

const STAGE_LABELS = {
  landing: 'Before Isabela',
  later: 'Santa Cruz',
}

function Total({ label, usd, usdPerGbp, suffix }) {
  const gbp = formatGbpEquivalent(usd, usdPerGbp)
  return (
    <div className="cash-total">
      <span className="cash-total-label">{label}</span>
      <span className="cash-total-value">{formatUsd(usd)}{suffix}</span>
      {gbp && <span className="cash-total-gbp">{gbp}</span>}
    </div>
  )
}

// Cash for the two of us in the Galapagos, split into what has to be carried
// in (Isabela has no reliable ATM) and what can come from Santa Cruz's ATMs.
export default function GalapagosCashBudget({ items, usdPerGbp }) {
  const toursSuffix = hasUnknownAmounts(items) ? ' + tours' : ''

  return (
    <div className="cash-block">
      <h4 className="cash-subheading">Galapagos cash budget (for two, US dollars)</h4>
      <div className="payment-table-wrapper">
        <table className="payment-table">
          <thead>
            <tr>
              <th>Item</th>
              <th>Amount</th>
              <th>Needed</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.item}>
                <td>{item.item}</td>
                <td className="cash-amount">{item.amount === null ? 'TBC' : formatUsd(item.amount)}</td>
                <td>{STAGE_LABELS[item.stage]}</td>
                <td>{item.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="cash-totals">
        <Total label="Carry from Quito" usd={cashTotal(items, 'landing')} usdPerGbp={usdPerGbp} />
        <Total label="Top up on Santa Cruz" usd={cashTotal(items, 'later')} usdPerGbp={usdPerGbp} suffix={toursSuffix} />
      </div>
    </div>
  )
}
