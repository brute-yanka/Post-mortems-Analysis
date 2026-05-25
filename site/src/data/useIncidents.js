import { useEffect, useState } from 'react'
import { csv } from 'd3'

const CSV_URL = `${import.meta.env.BASE_URL}cloud_incidents.csv`

function splitList(value) {
  if (!value) return []
  return value.split(';').map(s => s.trim()).filter(Boolean)
}

function parseRow(row) {
  return {
    id: row.id,
    provider: row.provider,
    date: row.date ? new Date(row.date) : null,
    title: row.title,
    durationMinutes: row.duration_minutes ? +row.duration_minutes : null,
    servicesAffected: splitList(row.services_affected),
    impactSymptoms: splitList(row.impact_symptoms),
    rootCauseL1: splitList(row.root_cause_l1),
    rootCauseL2: splitList(row.root_cause_l2),
    humanError: row.human_error === 'True',
    mitigationActions: splitList(row.mitigation_actions),
    url: row.url,
    summary: row.summary,
  }
}

export function useIncidents() {
  const [state, setState] = useState({ incidents: [], loading: true, error: null })

  useEffect(() => {
    csv(CSV_URL)
      .then(rows => {
        setState({ incidents: rows.map(parseRow), loading: false, error: null })
      })
      .catch(error => {
        setState({ incidents: [], loading: false, error })
      })
  }, [])

  return state
}
