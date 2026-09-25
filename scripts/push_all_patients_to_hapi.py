import json
import asyncio
import httpx
import time

HAPI_URL = "https://hapi.fhir.org/baseR4"

async def upload_resource(client, semaphore, resource_type, resource_id, payload):
    async with semaphore:
        url = f"{HAPI_URL}/{resource_type}/{resource_id}"
        # Stamp source
        if "meta" not in payload:
            payload["meta"] = {}
        payload["meta"]["source"] = "https://mediself-clinical.org"

        try:
            res = await client.put(url, json=payload, timeout=12.0)
            if res.status_code in [200, 201]:
                return True
            else:
                return False
        except Exception as e:
            return False

async def main():
    print(f"Loading sample patient bundles from data/synthea/sample_patients.json...", flush=True)
    with open("data/synthea/sample_patients.json", "r", encoding="utf-8") as f:
        bundles = json.load(f)

    print(f"Preparing {len(bundles)} patient bundles for bulk upload to {HAPI_URL}...", flush=True)

    tasks = []
    semaphore = asyncio.Semaphore(12) # 12 concurrent HTTP requests
    patient_count = 0
    total_resources = 0

    limits = httpx.Limits(max_keepalive_connections=20, max_connections=30)
    async with httpx.AsyncClient(limits=limits) as client:
        for b_idx, bundle in enumerate(bundles, start=1):
            pid_raw = f"patient-{b_idx:03d}"
            pid_new = f"mediself-patient-{b_idx:03d}"

            for entry in bundle.get("entry", []):
                resource = entry.get("resource")
                if not resource:
                    continue

                r_type = resource.get("resourceType")
                r_id = resource.get("id", "")

                # Remap resource ID to mediself- prefix
                new_id = r_id.replace(pid_raw, pid_new) if pid_raw in r_id else f"mediself-{r_id}"
                resource["id"] = new_id

                # Remap subject/patient references
                if "subject" in resource and "reference" in resource["subject"]:
                    ref = resource["subject"]["reference"]
                    resource["subject"]["reference"] = ref.replace(pid_raw, pid_new)

                if "patient" in resource and "reference" in resource["patient"]:
                    ref = resource["patient"]["reference"]
                    resource["patient"]["reference"] = ref.replace(pid_raw, pid_new)

                if r_type == "Patient":
                    patient_count += 1

                total_resources += 1
                tasks.append(upload_resource(client, semaphore, r_type, new_id, resource))

        print(f"Starting async bulk push of {total_resources} FHIR resources ({patient_count} patients)...", flush=True)
        start_time = time.time()
        results = await asyncio.gather(*tasks)
        elapsed = round(time.time() - start_time, 2)

        success_count = sum(1 for r in results if r)
        fail_count = len(results) - success_count

        print("\n" + "="*70, flush=True)
        print(f"BULK FHIR UPLOAD COMPLETE in {elapsed} seconds!")
        print(f" - Patients Uploaded: {patient_count}")
        print(f" - Total Resources Uploaded: {success_count} / {total_resources}")
        if fail_count > 0:
            print(f" - Retried/Skipped: {fail_count}")
        print(f" - Live Repository Base: {HAPI_URL}")
        print(f" - Sample Patient URL: {HAPI_URL}/Patient/mediself-patient-001")
        print("="*70, flush=True)

if __name__ == "__main__":
    asyncio.run(main())
