import json
import httpx
import sys

HAPI_BASE_URL = "https://hapi.fhir.org/baseR4"

def push_patients(count=3):
    print(f"Pushing {count} patient bundles to live HAPI FHIR server ({HAPI_BASE_URL})...", flush=True)
    
    with open("data/synthea/sample_patients.json", "r", encoding="utf-8") as f:
        bundles = json.load(f)

    uploaded_patients = []
    
    for bundle in bundles[:count]:
        for entry in bundle.get("entry", []):
            resource = entry.get("resource")
            if not resource:
                continue
            
            r_type = resource.get("resourceType")
            r_id = resource.get("id")
            
            # Stamp meta source
            if "meta" not in resource:
                resource["meta"] = {}
            resource["meta"]["source"] = "https://mediself-clinical.org"
            
            # Upload to HAPI FHIR via PUT /resource_type/resource_id
            url = f"{HAPI_BASE_URL}/{r_type}/{r_id}"
            try:
                res = httpx.put(url, json=resource, timeout=10.0)
                if res.status_code in [200, 201]:
                    if r_type == "Patient":
                        name_obj = resource.get("name", [{}])[0]
                        full_name = f"{' '.join(name_obj.get('given', []))} {name_obj.get('family', '')}".strip()
                        mrn = resource.get("identifier", [{}])[0].get("value", "N/A")
                        uploaded_patients.append({"id": r_id, "name": full_name, "mrn": mrn, "url": f"{HAPI_BASE_URL}/{r_type}/{r_id}"})
                        print(f"[SUCCESS] Uploaded Patient [{r_id}]: {full_name} (MRN: {mrn})", flush=True)
                else:
                    print(f"[FAIL] {r_type}/{r_id}: HTTP {res.status_code}", flush=True)
            except Exception as e:
                print(f"[ERROR] {r_type}/{r_id}: {e}", flush=True)

    print("\n" + "="*60, flush=True)
    print("SUCCESS: Uploaded Patients Live to HAPI FHIR:", flush=True)
    for p in uploaded_patients:
        print(f" - {p['name']} (ID: {p['id']}, MRN: {p['mrn']}) -> {p['url']}", flush=True)
    print("="*60, flush=True)

if __name__ == "__main__":
    c = int(sys.argv[1]) if len(sys.argv) > 1 else 3
    push_patients(c)
