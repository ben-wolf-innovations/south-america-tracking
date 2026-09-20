import api from '../config/api'

// Trip progress calls, shared by the Map and Locations pages. Each returns the
// API's message and lets the caller decide how to show it.

export async function checkIn(locationId) {
  const { data } = await api.post('/progress/checkin', { location_id: locationId })
  return data.message
}

export async function clearVisited() {
  const { data } = await api.post('/progress/clear-visited')
  return data.message
}

export async function undoLastVisited() {
  const { data } = await api.post('/progress/undo-last-visited')
  return data.message
}

export function errorMessage(err) {
  return err.response?.data?.error || err.message
}

// The API only allows check-ins in sequence order: every earlier stop must be
// visited first, ignoring travel overnights. Mirrored here so the UI can
// disable buttons that would fail.
export function nextCheckInSequence(locations) {
  return locations
    .filter(l => l.visited !== 1 && l.is_travel_overnight !== 1)
    .reduce((lowest, l) => Math.min(lowest, l.sequence), Infinity)
}

export function canCheckIn(location, nextSequence) {
  return location.visited !== 1 && location.sequence <= nextSequence
}
