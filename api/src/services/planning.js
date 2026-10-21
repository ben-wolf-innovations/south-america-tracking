import { get, all, run } from '../shared/turso.js'
import { ValidationError } from '../shared/errors.js'
import { getLocations } from './locations.js'

// Types you can add by hand. Check-ins, check-outs and stop transport come
// from Locations instead.
const PLAN_TYPES = ['tour', 'transport', 'other']

// An untimed entry sorts at the time of day it usually happens, so an
// untimed flight still comes before a 15:00 check-in. Only used for ordering.
const USUAL_TIME = { checkout: '10:00', transport: '12:00', checkin: '15:00', tour: '23:58', other: '23:59' }

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/

const departureOf = (location) => location.departure_date || location.estimated_departure_date
const arrivalOf = (location) => location.arrival_date || location.estimated_arrival_date

// Check-in, check-out and transport entries for each stop, using the stop's
// actual dates where set and the estimated dates otherwise.
//
// A stop's travel method is how we get to it, so its transport entry is dated
// the day we leave the previous real stop (overnight travel stops are skipped,
// so an overnight bus lands on the day it departs).
function entriesFromLocations(locations) {
  const entries = []
  let previousStop = null

  for (const location of locations) {
    const isOvernight = location.is_travel_overnight === 1

    if (location.travel_method) {
      entries.push({
        key: `location-${location.id}-transport`,
        source: 'location',
        type: 'transport',
        location_id: location.id,
        location_name: location.name,
        from_location_id: previousStop?.id ?? null,
        from_name: previousStop?.name ?? null,
        title: location.travel_method,
        date: previousStop ? departureOf(previousStop) : arrivalOf(location),
        estimated: previousStop ? !previousStop.departure_date : !location.arrival_date,
        start_time: location.transport_depart_time,
        end_time: location.transport_arrive_time,
        booked: location.transport_booked === 1,
        booking_ref: null,
        address: null,
        notes: location.transport_notes,
      })
    }

    // Overnight travel and zero-night stops have no accommodation to check in to.
    if (!isOvernight && location.nights > 0) {
      const stay = {
        source: 'location',
        location_id: location.id,
        location_name: location.name,
        from_location_id: null,
        from_name: null,
        title: location.accommodation_name || location.name,
        end_time: null,
        booked: location.accommodation_booked === 1,
        booking_ref: location.accommodation_booking_ref,
        address: null,
        notes: location.accommodation_notes,
      }

      entries.push({
        ...stay,
        key: `location-${location.id}-checkin`,
        type: 'checkin',
        date: arrivalOf(location),
        estimated: !location.arrival_date,
        start_time: location.checkin_time,
      })

      entries.push({
        ...stay,
        key: `location-${location.id}-checkout`,
        type: 'checkout',
        date: departureOf(location),
        estimated: !location.departure_date,
        start_time: location.checkout_time,
      })
    }

    if (!isOvernight) previousStop = location
  }

  return entries
}

function entryFromPlanItem(item) {
  return {
    key: `plan-${item.id}`,
    source: 'plan',
    id: item.id,
    type: item.type,
    location_id: item.location_id,
    location_name: item.location_name,
    from_location_id: null,
    from_name: null,
    title: item.title,
    date: item.date,
    estimated: false,
    start_time: item.start_time,
    end_time: item.end_time,
    booked: item.booked === 1,
    booking_ref: item.booking_ref,
    address: item.address,
    notes: item.notes,
  }
}

function compareEntries(a, b) {
  return a.date.localeCompare(b.date)
    || (a.start_time || USUAL_TIME[a.type]).localeCompare(b.start_time || USUAL_TIME[b.type])
    || a.title.localeCompare(b.title)
}

// Every planned entry for the trip in date and time order.
export async function getTimeline(tripId) {
  const locations = await getLocations(tripId)
  const planItems = await all(
    `SELECT p.*, l.name AS location_name
     FROM plan_items p
     LEFT JOIN locations l ON p.location_id = l.id
     WHERE p.trip_id = ?`,
    [tripId]
  )

  return [...entriesFromLocations(locations), ...planItems.map(entryFromPlanItem)]
    .filter(entry => entry.date)
    .sort(compareEntries)
}

// Turns a request body into clean column values, checking only the fields
// present so it works for both create and partial update.
function cleanPlanFields(body) {
  const fields = {}

  if ('type' in body) {
    if (!PLAN_TYPES.includes(body.type)) throw new ValidationError(`Type must be one of: ${PLAN_TYPES.join(', ')}`)
    fields.type = body.type
  }

  if ('title' in body) {
    if (!body.title?.trim()) throw new ValidationError('Title is required')
    fields.title = body.title.trim()
  }

  if ('date' in body) {
    if (!DATE_PATTERN.test(body.date || '')) throw new ValidationError('Date must be YYYY-MM-DD')
    fields.date = body.date
  }

  for (const key of ['start_time', 'end_time']) {
    if (!(key in body)) continue
    if (body[key] && !TIME_PATTERN.test(body[key])) throw new ValidationError('Times must be HH:MM')
    fields[key] = body[key] || null
  }

  for (const key of ['booking_ref', 'address', 'notes']) {
    if (key in body) fields[key] = body[key]?.trim() || null
  }

  if ('location_id' in body) fields.location_id = body.location_id || null
  if ('booked' in body) fields.booked = body.booked ? 1 : 0

  return fields
}

export async function createPlanItem(body) {
  const fields = cleanPlanFields(body)
  if (!fields.type || !fields.title || !fields.date) {
    throw new ValidationError('Type, title and date are required')
  }

  fields.trip_id = body.trip_id || 1
  const columns = Object.keys(fields)

  const result = await run(
    `INSERT INTO plan_items (${columns.join(', ')}) VALUES (${columns.map(() => '?').join(', ')})`,
    Object.values(fields)
  )

  return get('SELECT * FROM plan_items WHERE id = ?', [result.lastID])
}

export async function updatePlanItem(id, body) {
  const existing = await get('SELECT * FROM plan_items WHERE id = ?', [id])
  if (!existing) return null

  const fields = cleanPlanFields(body)
  const columns = Object.keys(fields)
  if (columns.length === 0) throw new ValidationError('No valid fields to update')

  await run(
    `UPDATE plan_items SET ${columns.map(c => `${c} = ?`).join(', ')} WHERE id = ?`,
    [...Object.values(fields), id]
  )

  return get('SELECT * FROM plan_items WHERE id = ?', [id])
}

export async function deletePlanItem(id) {
  const result = await run('DELETE FROM plan_items WHERE id = ?', [id])
  return result.changes > 0
}
