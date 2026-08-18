// Walks locations in sequence order, projecting arrival/departure dates forward
// from the trip start date. Any actual arrival_date/departure_date entered on a
// location (whether visited yet or just booked ahead) overrides the projection
// for that stop, and every later stop counts forward from it.
export function estimateLocationDates(locations, tripStartDate) {
  let cursorDate = new Date(tripStartDate)

  locations.forEach(location => {
    const arrival = location.arrival_date ? new Date(location.arrival_date) : new Date(cursorDate)
    location.estimated_arrival_date = arrival.toISOString().split('T')[0]

    let departure
    if (location.departure_date) {
      departure = new Date(location.departure_date)
    } else {
      departure = new Date(arrival)
      departure.setDate(departure.getDate() + (location.nights || 0))
    }
    location.estimated_departure_date = departure.toISOString().split('T')[0]

    cursorDate = departure
  })

  return locations
}
