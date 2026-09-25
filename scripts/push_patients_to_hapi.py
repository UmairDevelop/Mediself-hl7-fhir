import httpx

HAPI_URL = "https://hapi.fhir.org/baseR4"

PATIENTS = [
    {
        "id": "mediself-patient-101",
        "given": "Jonathan",
        "family": "Vance",
        "gender": "male",
        "dob": "1985-04-12",
        "mrn": "MRN-MEDISELF-101",
        "condition": {"code": "44054006", "display": "Type 2 diabetes mellitus"},
        "medication": {"code": "860975", "display": "Metformin hydrochloride 500 MG Oral Tablet"}
    },
    {
        "id": "mediself-patient-102",
        "given": "Elena",
        "family": "Rostova",
        "gender": "female",
        "dob": "1991-08-23",
        "mrn": "MRN-MEDISELF-102",
        "condition": {"code": "38341003", "display": "Essential hypertension"},
        "medication": {"code": "314076", "display": "Lisinopril 10 MG Oral Tablet"}
    },
    {
        "id": "mediself-patient-103",
        "given": "Marcus",
        "family": "Aurelius",
        "gender": "male",
        "dob": "1976-11-05",
        "mrn": "MRN-MEDISELF-103",
        "condition": {"code": "195967001", "display": "Asthma"},
        "medication": {"code": "630208", "display": "Albuterol 0.09 MG/ACTUAT Inhaler"}
    },
    {
        "id": "mediself-patient-104",
        "given": "Sophia",
        "family": "Chen",
        "gender": "female",
        "dob": "1995-02-14",
        "mrn": "MRN-MEDISELF-104",
        "condition": {"code": "55822004", "display": "Hyperlipidemia"},
        "medication": {"code": "617314", "display": "Atorvastatin 20 MG Oral Tablet"}
    },
    {
        "id": "mediself-patient-105",
        "given": "David",
        "family": "Miller",
        "gender": "male",
        "dob": "1980-09-30",
        "mrn": "MRN-MEDISELF-105",
        "condition": {"code": "235595009", "display": "Gastroesophageal reflux disease"},
        "medication": {"code": "198084", "display": "Omeprazole 20 MG Delayed Release Capsule"}
    }
]

def main():
    print(f"Uploading MediSelf patients to live HAPI FHIR server ({HAPI_URL})...\n")
    uploaded = []

    for p in PATIENTS:
        patient_resource = {
            "resourceType": "Patient",
            "id": p["id"],
            "name": [{"use": "official", "given": [p["given"]], "family": p["family"]}],
            "gender": p["gender"],
            "birthDate": p["dob"],
            "identifier": [{"system": "http://hospital.smarthealth.org/mrn", "value": p["mrn"]}],
            "meta": {"source": "https://mediself-clinical.org"}
        }

        # PUT Patient
        res = httpx.put(f"{HAPI_URL}/Patient/{p['id']}", json=patient_resource)
        if res.status_code in [200, 201]:
            print(f"[SUCCESS] Patient/{p['id']}: {p['given']} {p['family']} (MRN: {p['mrn']})")
            
            # PUT Condition
            cond_id = f"cond-{p['id']}"
            cond_resource = {
                "resourceType": "Condition",
                "id": cond_id,
                "subject": {"reference": f"Patient/{p['id']}"},
                "code": {"coding": [{"system": "http://snomed.info/sct", "code": p["condition"]["code"], "display": p["condition"]["display"]}]},
                "clinicalStatus": {"coding": [{"system": "http://terminology.hl7.org/CodeSystem/condition-clinical", "code": "active"}]},
                "meta": {"source": "https://mediself-clinical.org"}
            }
            httpx.put(f"{HAPI_URL}/Condition/{cond_id}", json=cond_resource)

            # PUT MedicationRequest
            med_id = f"med-{p['id']}"
            med_resource = {
                "resourceType": "MedicationRequest",
                "id": med_id,
                "subject": {"reference": f"Patient/{p['id']}"},
                "status": "active",
                "intent": "order",
                "medicationCodeableConcept": {"coding": [{"system": "http://www.nlm.nih.gov/research/umls/rxnorm", "code": p["medication"]["code"], "display": p["medication"]["display"]}]},
                "meta": {"source": "https://mediself-clinical.org"}
            }
            httpx.put(f"{HAPI_URL}/MedicationRequest/{med_id}", json=med_resource)

            uploaded.append(p)
        else:
            print(f"[FAIL] Patient/{p['id']}: HTTP {res.status_code}")

    print("\n" + "="*70)
    print("LIVE HAPI FHIR REPOSITORY PATIENTS READY FOR CLIENT DEMO:")
    for u in uploaded:
        print(f" • {u['given']} {u['family']} (ID: {u['id']}, MRN: {u['mrn']})")
        print(f"   URL: {HAPI_URL}/Patient/{u['id']}")
    print("="*70)

if __name__ == "__main__":
    main()
