import { useState, useEffect } from 'react'
import api from '../config/api'
import './UsefulInfo.css'

export default function UsefulInfo() {
  const [rates, setRates] = useState([])
  const [paymentInfo, setPaymentInfo] = useState([])
  const [emergencyContacts, setEmergencyContacts] = useState([])
  const [timeZones, setTimeZones] = useState([])
  const [tippingCustoms, setTippingCustoms] = useState([])
  const [powerPlugs, setPowerPlugs] = useState([])
  const [connectivityInfo, setConnectivityInfo] = useState([])
  const [visaInfo, setVisaInfo] = useState([])
  const [localApps, setLocalApps] = useState([])
  const [meta, setMeta] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const loadRates = async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await api.get('/info/exchange-rates')
      const data = res.data.data
      setRates(data.rates || [])
      setPaymentInfo(data.payment_info || [])
      setEmergencyContacts(data.emergency_contacts || [])
      setTimeZones(data.time_zones || [])
      setTippingCustoms(data.tipping_customs || [])
      setPowerPlugs(data.power_plugs || [])
      setConnectivityInfo(data.connectivity_info || [])
      setVisaInfo(data.visa_info || [])
      setLocalApps(data.local_apps || [])
      setMeta(data)
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

      {/* Emergency Contacts Section */}
      {!loading && !error && emergencyContacts.length > 0 && (
        <section className="info-section emergency-section">
          <div className="section-heading">
            <h3>Emergency Contacts</h3>
          </div>
          <p className="section-subtext">Important numbers by country</p>

          <div className="payment-table-wrapper">
            <table className="payment-table">
              <thead>
                <tr>
                  <th>Country</th>
                  <th>Police</th>
                  <th>Ambulance</th>
                  <th>Fire</th>
                  <th>UK Embassy</th>
                </tr>
              </thead>
              <tbody>
                {emergencyContacts.map((info) => (
                  <tr key={info.country}>
                    <td className="country-cell">{info.country}</td>
                    <td>{info.police}</td>
                    <td>{info.ambulance}</td>
                    <td>{info.fire}</td>
                    <td className="embassy-cell">{info.ukEmbassy}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Time Zones Section */}
      {!loading && !error && timeZones.length > 0 && (
        <section className="info-section">
          <div className="section-heading">
            <h3>Time Zones</h3>
          </div>
          <p className="section-subtext">Local time offsets from UTC</p>

          <div className="compact-grid">
            {timeZones.map((tz) => (
              <div key={tz.country} className="compact-card">
                <div className="compact-country">{tz.country}</div>
                <div className="compact-value">{tz.timezone}</div>
                {tz.note && <div className="compact-note">{tz.note}</div>}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Tipping Customs Section */}
      {!loading && !error && tippingCustoms.length > 0 && (
        <section className="info-section">
          <div className="section-heading">
            <h3>Tipping Customs</h3>
          </div>
          <p className="section-subtext">Expected gratuities by country</p>

          <div className="payment-table-wrapper">
            <table className="payment-table">
              <thead>
                <tr>
                  <th>Country</th>
                  <th>Restaurant</th>
                  <th>Hotel Porter</th>
                  <th>Taxi</th>
                  <th>Tour Guide</th>
                </tr>
              </thead>
              <tbody>
                {tippingCustoms.map((info) => (
                  <tr key={info.country}>
                    <td className="country-cell">{info.country}</td>
                    <td>{info.restaurant}</td>
                    <td>{info.hotel}</td>
                    <td>{info.taxi}</td>
                    <td>{info.guide}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Power & Plugs Section */}
      {!loading && !error && powerPlugs.length > 0 && (
        <section className="info-section">
          <div className="section-heading">
            <h3>Power & Plugs</h3>
          </div>
          <p className="section-subtext">Voltage and plug types</p>

          <div className="compact-grid">
            {powerPlugs.map((plug) => (
              <div key={plug.country} className="compact-card">
                <div className="compact-country">{plug.country}</div>
                <div className="compact-value">{plug.voltage} / {plug.frequency}</div>
                <div className="compact-note">Plugs: {plug.plugs}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Connectivity Section */}
      {!loading && !error && connectivityInfo.length > 0 && (
        <section className="info-section">
          <div className="section-heading">
            <h3>Connectivity</h3>
          </div>
          <p className="section-subtext">Mobile networks and app availability</p>

          <div className="payment-table-wrapper">
            <table className="payment-table">
              <thead>
                <tr>
                  <th>Country</th>
                  <th>Main Providers</th>
                  <th>SIM Cards</th>
                  <th>Uber</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {connectivityInfo.map((info) => (
                  <tr key={info.country}>
                    <td className="country-cell">{info.country}</td>
                    <td>{info.mainProviders}</td>
                    <td>{info.simAvailability}</td>
                    <td>{info.uberAvailable}</td>
                    <td>{info.notes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Visa Requirements Section */}
      {!loading && !error && visaInfo.length > 0 && (
        <section className="info-section">
          <div className="section-heading">
            <h3>Visa Requirements (UK Passport)</h3>
          </div>
          <p className="section-subtext">Entry requirements and stay duration</p>

          <div className="payment-table-wrapper">
            <table className="payment-table">
              <thead>
                <tr>
                  <th>Country</th>
                  <th>Visa-Free Stay</th>
                  <th>Entry Requirement</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {visaInfo.map((info) => (
                  <tr key={info.country}>
                    <td className="country-cell">{info.country}</td>
                    <td>{info.ukVisaFree}</td>
                    <td>{info.entry}</td>
                    <td>{info.notes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Local Apps Section */}
      {!loading && !error && localApps.length > 0 && (
        <section className="info-section">
          <div className="section-heading">
            <h3>Key Local Apps</h3>
          </div>
          <p className="section-subtext">Useful apps for transport, payments, and services</p>

          <div className="payment-table-wrapper">
            <table className="payment-table">
              <thead>
                <tr>
                  <th>Country</th>
                  <th>Transport</th>
                  <th>Payment Apps</th>
                  <th>Other Services</th>
                </tr>
              </thead>
              <tbody>
                {localApps.map((info) => (
                  <tr key={info.country}>
                    <td className="country-cell">{info.country}</td>
                    <td>{info.transport}</td>
                    <td>{info.payment}</td>
                    <td>{info.other}</td>
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
