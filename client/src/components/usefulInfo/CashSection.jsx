import GalapagosCashBudget from './GalapagosCashBudget'
import './CashSection.css'

function CountryCard({ info }) {
  return (
    <div className="cash-country">
      <div className="cash-country-header">
        <span className="cash-country-name">{info.country}</span>
        <span className="cash-need">Cash need: {info.cashNeed}</span>
      </div>
      <dl className="cash-country-details">
        <dt>Cards</dt>
        <dd>{info.cards}</dd>
        <dt>Best ATMs</dt>
        <dd>{info.bestAtms}</dd>
        <dt>Fees and caps</dt>
        <dd>{info.feesAndCaps}</dd>
        <dt>Tips</dt>
        <dd>{info.tips}</dd>
      </dl>
    </div>
  )
}

// How we get cash on the trip: our accounts, general rules, a plan along the
// route, the Galapagos budget and notes per country.
export default function CashSection({ cash, usdPerGbp }) {
  return (
    <section className="info-section">
      <div className="section-heading">
        <h3>Cash & Payments</h3>
      </div>
      <p className="section-subtext">
        Getting cash with the fewest fees. Researched Oct 2026: check the ATM screen and the apps before relying on any figure.
      </p>

      <h4 className="cash-subheading">Our accounts</h4>
      <div className="cash-accounts">
        {cash.accounts.map((account) => (
          <div key={account.name} className="cash-account">
            <div className="cash-account-name">{account.name}</div>
            <div className="cash-account-allowance">{account.allowance}</div>
            <div className="cash-account-over">Over the allowance: {account.overLimit}</div>
            <p className="cash-account-notes">{account.notes}</p>
          </div>
        ))}
      </div>

      <h4 className="cash-subheading">Rules of thumb</h4>
      <ul className="cash-rules">
        {cash.rules.map((rule) => <li key={rule}>{rule}</li>)}
      </ul>

      <h4 className="cash-subheading">Along the route</h4>
      <ol className="cash-route">
        {cash.route.map((step) => (
          <li key={step.stage}>
            <span className="cash-route-stage">{step.stage}</span>
            <span>{step.plan}</span>
          </li>
        ))}
      </ol>

      <GalapagosCashBudget items={cash.galapagos} usdPerGbp={usdPerGbp} />

      <h4 className="cash-subheading">By country</h4>
      <div className="cash-countries">
        {cash.countries.map((info) => <CountryCard key={info.country} info={info} />)}
      </div>
    </section>
  )
}
