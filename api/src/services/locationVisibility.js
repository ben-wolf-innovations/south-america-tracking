// Where we stay, booking details and private notes are for admins only.
const ADMIN_ONLY_FIELDS = [
  'accommodation_name', 'accommodation_notes', 'accommodation_booking_ref', 'notes', 'transport_notes'
]

export function visibleLocation(location, user) {
  if (user?.accessLevel === 'admin') return location

  const visible = { ...location }
  ADMIN_ONLY_FIELDS.forEach(field => delete visible[field])
  return visible
}
