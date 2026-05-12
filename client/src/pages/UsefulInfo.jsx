import { useState, useEffect } from 'react'
import api from '../config/api'
import './UsefulInfo.css'

export default function UsefulInfo() {
  const [rates, setRates] = useState([])
  const [paymentInfo, setPaymentInfo] = useState([])
  const [meta, setMeta] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const loadRates = async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await api.get('/info/exchange-rates')
      setRates(res.data.data.rates)
      setPaymentInfo(res.data.data.payment_info || [])
      setMeta(res.data.data)
    } catch (err) {
      console.error('Failed to load exchange rates:', err)
      setError('Failed to load exchange rates. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadRates()
  }, [])

  const formatRate = (rate) => {
    if (rate === null || rate === undefined) return '—'
    // CLP and ARS are large numbers — show 0 decimal places
    if (rate >= 500) return Math.round(rate).toLocaleString()
    // Others show 2 decimal places
    return rate.toFixed(2)
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return '—'
    try {
      return new Date(dateStr).toLocaleString('en-GB', {
        day: 'numeric', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit', timeZoneName: 'short'
      })
    } catch {
      return dateStr
    }
  }

  return (
    <div className="useful-info-page">
      <div className="useful-info-header">
        <div>
          <h2>Useful Info</h2>
          <p className="subtitle">Handy reference for the trip</p>
        </div>
      </div>

      {/* Exchange Rates Section */}
      <section className="info-section">
        <div className="section-heading">
          <h3>Exchange Rates</h3>
          <button onClick={loadRates} className="refresh-button" disabled={loading}>
            {loading ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>
        <p className="section-subtext">Live rates — what £1 buys you in each country</p>

        {error && (
          <div className="info-error">
            <p>{error}</p>
            <button onClick={loadRates} className="retry-button">Retry</button>
          </div>
        )}

        {loading && !error && (
          <div className="rates-loading">
            <div className="spinner"></div>
            <p>Fetching latest rates…</p>
          </div>
        )}

        {!loading && !error && rates.length > 0 && (
          <>
            <div className="rates-grid">
              {rates.map(r => (
                <div key={r.code} className="rate-card">
                  <div className="rate-code">{r.code}</div>
                  <div className="rate-country">{r.country}</div>
                  <div className="rate-amount">
                    <span className="rate-value">{formatRate(r.rate)}</span>
                    <span className="rate-symbol">{r.symbol}</span>
                  </div>
                  <div className="rate-label">per £1</div>
                  <div className="rate-currency-name">{r.name} ({r.code})</div>
                </div>
              ))}
            </div>

            {meta && (
              <div className="rates-meta">
                <span>Last updated: {formatDate(meta.last_updated)}</span>
                <span className="meta-separator">·</span>
                <span>Next update: {formatDate(meta.next_update)}</span>
                <span className="meta-separator">·</span>
                <span className="meta-source">Source: open.er-api.com</span>
              </div>
            )}
          </>
        )}
      </section>

      {/* Payment Information Section */}
      {!loading && !error && paymentInfo.length > 0 && (
        <section className="info-section">
          <div className="section-heading">
            <h3>Payment & ATM Information</h3>
          </div>
          <p className="section-subtext">Card acceptance and ATM fees by country</p>

          <div className="payment-table-wrapper">
            <table className="payment-table">
              <thead>
                <tr>
                  <th>Country</th>
                  <th>Payment Preference</th>
                  <th>Mastercard (Monzo)</th>
                  <th>Average ATM Fees</th>
                </tr>
              </thead>
              <tbody>
                {paymentInfo.map((info) => (
                  <tr key={info.country}>
                    <td className="country-cell">{info.country}</td>
                    <td>{info.paymentPreference}</td>
                    <td>{info.mastercardAcceptance}</td>
                    <td>{info.atmFees}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  )
}
