import { TYPE_LABELS, formatEndTime, entryPlace } from '../../utils/planning'
import PlanItemForm from './PlanItemForm'
import StopEntryForm from './StopEntryForm'

// One timeline entry, or its edit form while being edited.
export default function PlanEntry({ entry, stops, editing, onEdit, onCancel, onSavePlanItem, onSaveStop, onDelete }) {
  const fromStop = entry.source === 'location'

  if (editing) {
    return (
      <li className={`plan-entry editing type-${entry.type}`}>
        {fromStop ? (
          <StopEntryForm entry={entry} onSave={onSaveStop} onCancel={onCancel} />
        ) : (
          <PlanItemForm
            entry={entry}
            stops={stops}
            onSave={(data) => onSavePlanItem(entry.id, data)}
            onCancel={onCancel}
          />
        )}
      </li>
    )
  }

  const end = formatEndTime(entry)
  const hasTime = entry.start_time || end
  const place = entryPlace(entry)

  return (
    <li className={`plan-entry type-${entry.type}`}>
      <div className={`plan-entry-time ${hasTime ? '' : 'none'}`}>
        {hasTime ? (
          <>
            <span>{entry.start_time || '?'}</span>
            {end && <span className="plan-entry-end">to {end}</span>}
          </>
        ) : 'No time'}
      </div>
      <div className="plan-entry-body">
        <div className="plan-entry-tags">
          <span className="plan-type">{TYPE_LABELS[entry.type]}</span>
          <span className={`plan-booked ${entry.booked ? 'yes' : 'no'}`}>
            {entry.booked ? 'Booked' : 'Not booked'}
          </span>
          {entry.estimated && <span className="plan-est" title="Date estimated from nights, not booked yet">est. date</span>}
        </div>
        <p className="plan-entry-title">{entry.title}</p>
        {place && <p className="plan-entry-place">{place}</p>}
        {entry.booking_ref && <p className="plan-entry-meta">Ref: {entry.booking_ref}</p>}
        {entry.address && <p className="plan-entry-meta">{entry.address}</p>}
        {entry.notes && <p className="plan-entry-notes">{entry.notes}</p>}
      </div>
      <div className="plan-entry-actions">
        <button onClick={onEdit} className="plan-btn secondary">Edit</button>
        {!fromStop && <button onClick={() => onDelete(entry)} className="plan-btn danger">Delete</button>}
      </div>
    </li>
  )
}
