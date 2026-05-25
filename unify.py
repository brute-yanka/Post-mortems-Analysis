import json, glob, csv
from datetime import datetime
import logging

logging.basicConfig(level=logging.INFO, format='%(levelname)s: %(message)s')
logger = logging.getLogger(__name__)

# All records share the same schema defined in template.json at the repo root.
PROVIDERS = {
    'AWS':    'anomaly_collection/AWS',
    'Azure':  'anomaly_collection/Azure',
    'Google': 'anomaly_collection/Google',
}

def parse_date(s):
    """Dates appear mostly as MM/DD/YYYY but a few use other formats."""
    for fmt in ('%m/%d/%Y', '%Y/%m/%d', '%Y-%m-%d'):
        try:
            return datetime.strptime(s, fmt).date().isoformat()
        except (ValueError, TypeError):
            logger.warning(f'Unparseable date: {s}')
            pass

def join_list(v):
    """service_name, impact symptom, link, etc. are lists of strings."""
    if isinstance(v, list):
        return '; '.join(str(x).strip() for x in v if x)
    return str(v) if v else ''

def root_cause_layer(record, layer_key):
    """root cause is a dict with a 'label' list of {layer-1, layer-2} dicts."""
    rc = record.get('root cause', {})
    if not isinstance(rc, dict):
        logger.warning(f'Unexpected root cause format: {rc}')
        return ''
    labels = [lab.get(layer_key, '').strip()
              for lab in rc.get('label', [])
              if isinstance(lab, dict)]
    return '; '.join(l for l in labels if l)

def mitigation_labels(record):
    """mitigation is a dict; its 'label' field is the list of actions taken."""
    m = record.get('mitigation', {})
    if isinstance(m, dict):
        return join_list(m.get('label', []))
    logger.warning(f'Unexpected mitigation format: {m}')
    return ''

rows = []
for provider, folder in PROVIDERS.items():
    for json_path in glob.glob(f'{folder}/*.json'):
        with open(json_path, encoding='utf-8') as f:
            file_data = json.load(f)
        for incident_id, record in file_data.items():
            if not isinstance(record, dict):
                logger.warning(f'Skipping non-dict record {incident_id} in {json_path}')
                continue
                
            rows.append({
                'id':                 incident_id,
                'provider':           provider,
                'date':               parse_date(record.get('time', '')),
                'title':              record.get('title', '').replace('\n', ' ').strip(),
                'duration_minutes':   record.get('duration') if isinstance(record.get('duration'), (int, float)) else '',
                'services_affected':  join_list(list(dict.fromkeys(record.get('service_name', [])))),
                'impact_symptoms':    join_list(list(dict.fromkeys(record.get('impact symptom', [])))),
                'root_cause_l1':      '; '.join(dict.fromkeys(filter(None, root_cause_layer(record, 'layer-1').split('; ')))),
                'root_cause_l2':      '; '.join(dict.fromkeys(filter(None, root_cause_layer(record, 'layer-2').split('; ')))),
                'human_error':        record.get('human error'),
                'mitigation_actions': mitigation_labels(record),
                'url':                join_list(record.get('link', [])),
                'summary':            record.get('summary', '').replace('\n', ' ').strip()[:500],
            })
rows.sort(key=lambda r: r['date'])

with open('cloud_incidents.csv', 'w', newline='', encoding='utf-8') as f:
    writer = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
    writer.writeheader()
    writer.writerows(rows)

logger.info(f'Wrote {len(rows)} incidents to cloud_incidents.csv')
logger.info(f'  AWS:    {sum(1 for r in rows if r["provider"] == "AWS")}')
logger.info(f'  Azure:  {sum(1 for r in rows if r["provider"] == "Azure")}')
logger.info(f'  Google: {sum(1 for r in rows if r["provider"] == "Google")}')