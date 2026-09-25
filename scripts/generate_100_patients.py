import json
import random
import uuid
from datetime import datetime, timedelta

FIRST_NAMES_MALE = ["James", "John", "Robert", "Michael", "William", "David", "Richard", "Joseph", "Thomas", "Charles", "Christopher", "Daniel", "Matthew", "Anthony", "Mark", "Donald", "Steven", "Paul", "Andrew", "Joshua", "Kenneth", "Kevin", "Brian", "George", "Timothy"]
FIRST_NAMES_FEMALE = ["Mary", "Patricia", "Jennifer", "Linda", "Elizabeth", "Barbara", "Susan", "Jessica", "Sarah", "Karen", "Lisa", "Nancy", "Betty", "Sandra", "Margaret", "Ashley", "Kimberly", "Emily", "Donna", "Michelle", "Carol", "Amanda", "Dorothy", "Melissa", "Deborah"]
LAST_NAMES = ["Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "Rodriguez", "Martinez", "Hernandez", "Lopez", "Gonzalez", "Wilson", "Anderson", "Thomas", "Taylor", "Moore", "Jackson", "Martin", "Lee", "Perez", "Thompson", "White", "Harris"]

CITIES = ["Boston", "Cambridge", "Brookline", "Somerville", "Newton", "Quincy", "Worcester", "Springfield", "Lowell", "Brockton"]

CONDITIONS = [
    {"code": "44054006", "display": "Type 2 diabetes mellitus"},
    {"code": "38341003", "display": "Essential hypertension"},
    {"code": "195967001", "display": "Asthma"},
    {"code": "53741008", "display": "Coronary arteriosclerosis"},
    {"code": "709044004", "display": "Chronic kidney disease stage 3"},
    {"code": "55822004", "display": "Hyperlipidemia"},
    {"code": "49436004", "display": "Atrial fibrillation"},
    {"code": "396275006", "display": "Osteoarthritis of knee"},
    {"code": "235595009", "display": "Gastroesophageal reflux disease"},
    {"code": "35489007", "display": "Depressive disorder"}
]

MEDICATIONS = [
    {"code": "860975", "display": "Metformin hydrochloride 500 MG Oral Tablet", "dosage": "Take 1 tablet twice daily with meals"},
    {"code": "314076", "display": "Lisinopril 10 MG Oral Tablet", "dosage": "Take 1 tablet once daily in morning"},
    {"code": "617314", "display": "Atorvastatin 20 MG Oral Tablet", "dosage": "Take 1 tablet at bedtime"},
    {"code": "630208", "display": "Albuterol 0.09 MG/ACTUAT Inhaler", "dosage": "Inhale 2 puffs every 4-6 hours as needed"},
    {"code": "197361", "display": "Amlodipine 5 MG Oral Tablet", "dosage": "Take 1 tablet once daily"},
    {"code": "966580", "display": "Levothyroxine sodium 50 MCG Oral Tablet", "dosage": "Take 1 tablet once daily before breakfast"},
    {"code": "198084", "display": "Omeprazole 20 MG Delayed Release Capsule", "dosage": "Take 1 capsule once daily"},
    {"code": "312938", "display": "Sertraline 50 MG Oral Tablet", "dosage": "Take 1 tablet once daily"}
]

LABS = [
    {"code": "4548-4", "display": "Hemoglobin A1c/Hemoglobin.total in Blood", "unit": "%", "range": (4.5, 9.5), "ref_high": 5.6},
    {"code": "2823-3", "display": "Potassium [Moles/volume] in Serum or Plasma", "unit": "mmol/L", "range": (3.4, 5.8), "ref_high": 5.1},
    {"code": "2093-3", "display": "Cholesterol [Mass/volume] in Serum or Plasma", "unit": "mg/dL", "range": (140, 260), "ref_high": 200},
    {"code": "2160-0", "display": "Creatinine [Mass/volume] in Serum or Plasma", "unit": "mg/dL", "range": (0.6, 2.2), "ref_high": 1.2},
    {"code": "2345-7", "display": "Glucose [Mass/volume] in Blood", "unit": "mg/dL", "range": (70, 180), "ref_high": 100},
    {"code": "8480-6", "display": "Systolic blood pressure", "unit": "mmHg", "range": (110, 160), "ref_high": 130}
]

ALLERGIES = [
    {"code": "7980", "display": "Penicillin - allergy", "criticality": "high"},
    {"code": "91936005", "display": "Allergy to sulfonamide", "criticality": "medium"},
    {"code": "300916003", "display": "Latex allergy", "criticality": "high"},
    {"code": "294805000", "display": "Aspirin allergy", "criticality": "medium"},
    {"code": "91935009", "display": "Peanut allergy", "criticality": "high"}
]

ENCOUNTERS = [
    {"code": "185349003", "display": "Encounter for checkup"},
    {"code": "371530004", "display": "Consultation for asthma"},
    {"code": "408443003", "display": "Follow-up visit"},
    {"code": "50849002", "display": "Emergency room visit"}
]

def generate_100_patients():
    bundles = []
    
    # Generate 100 synthetic patient records
    for i in range(1, 106):
        pid = f"patient-{i:03d}"
        gender = random.choice(["male", "female"])
        given_name = random.choice(FIRST_NAMES_MALE if gender == "male" else FIRST_NAMES_FEMALE)
        family_name = random.choice(LAST_NAMES)
        
        # Random DOB between 1945 and 2002
        birth_year = random.randint(1945, 2002)
        birth_month = random.randint(1, 12)
        birth_day = random.randint(1, 28)
        dob_str = f"{birth_year:04d}-{birth_month:02d}-{birth_day:02d}"
        
        city = random.choice(CITIES)
        mrn = f"MRN-{random.randint(100000, 999999)}"
        phone = f"555-{random.randint(100, 999):03d}"
        email = f"{given_name.lower()}.{family_name.lower()}{random.randint(10,99)}@example.com"
        
        entries = [
          {
            "resource": {
              "resourceType": "Patient",
              "id": pid,
              "name": [{"use": "official", "family": family_name, "given": [given_name]}],
              "gender": gender,
              "birthDate": dob_str,
              "telecom": [{"system": "phone", "value": phone}, {"system": "email", "value": email}],
              "address": [{"line": [f"{random.randint(10, 999)} Healthcare Ave"], "city": city, "state": "MA", "postalCode": "02115"}],
              "identifier": [{"system": "http://hospital.smarthealth.org/mrn", "value": mrn}]
            }
          }
        ]
        
        # Randomly assign 1-3 conditions
        assigned_conds = random.sample(CONDITIONS, k=random.randint(1, 3))
        for c_idx, c in enumerate(assigned_conds):
            entries.append({
                "resource": {
                    "resourceType": "Condition",
                    "id": f"cond-{pid}-{c_idx+1}",
                    "subject": {"reference": f"Patient/{pid}"},
                    "code": {"coding": [{"system": "http://snomed.info/sct", "code": c["code"], "display": c["display"]}]},
                    "clinicalStatus": {"coding": [{"system": "http://terminology.hl7.org/CodeSystem/condition-clinical", "code": "active"}]},
                    "onsetDateTime": f"{random.randint(2015, 2024)}-{random.randint(1,12):02d}-15"
                }
            })

        # Randomly assign 1-3 medications
        assigned_meds = random.sample(MEDICATIONS, k=random.randint(1, 3))
        for m_idx, m in enumerate(assigned_meds):
            entries.append({
                "resource": {
                    "resourceType": "MedicationRequest",
                    "id": f"med-{pid}-{m_idx+1}",
                    "subject": {"reference": f"Patient/{pid}"},
                    "status": "active",
                    "intent": "order",
                    "medicationCodeableConcept": {"coding": [{"system": "http://www.nlm.nih.gov/research/umls/rxnorm", "code": m["code"], "display": m["display"]}]},
                    "dosageInstruction": [{"text": m["dosage"]}],
                    "authoredOn": f"{random.randint(2022, 2025)}-{random.randint(1,12):02d}-10"
                }
            })

        # Randomly assign 2-4 lab results
        assigned_labs = random.sample(LABS, k=random.randint(2, 4))
        for l_idx, l in enumerate(assigned_labs):
            val = round(random.uniform(l["range"][0], l["range"][1]), 1)
            entries.append({
                "resource": {
                    "resourceType": "Observation",
                    "id": f"obs-{pid}-{l_idx+1}",
                    "subject": {"reference": f"Patient/{pid}"},
                    "status": "final",
                    "code": {"coding": [{"system": "http://loinc.org", "code": l["code"], "display": l["display"]}]},
                    "valueQuantity": {"value": val, "unit": l["unit"], "system": "http://unitsofmeasure.org", "code": l["unit"]},
                    "referenceRange": [{"high": {"value": l["ref_high"], "unit": l["unit"]}}],
                    "effectiveDateTime": f"2026-{random.randint(1,3):02d}-{random.randint(1,28):02d}T09:00:00Z"
                }
            })

        # 50% chance of allergy
        if random.random() > 0.5:
            alg = random.choice(ALLERGIES)
            entries.append({
                "resource": {
                    "resourceType": "AllergyIntolerance",
                    "id": f"all-{pid}-1",
                    "patient": {"reference": f"Patient/{pid}"},
                    "clinicalStatus": {"coding": [{"system": "http://terminology.hl7.org/CodeSystem/allergyintolerance-clinical", "code": "active"}]},
                    "criticality": alg["criticality"],
                    "code": {"coding": [{"system": "http://snomed.info/sct", "code": alg["code"], "display": alg["display"]}]}
                }
            })

        # 1-2 Encounters
        enc = random.choice(ENCOUNTERS)
        entries.append({
            "resource": {
                "resourceType": "Encounter",
                "id": f"enc-{pid}-1",
                "subject": {"reference": f"Patient/{pid}"},
                "status": "finished",
                "class": {"system": "http://terminology.hl7.org/CodeSystem/v3-ActCode", "code": "AMB", "display": "ambulatory"},
                "type": [{"coding": [{"system": "http://snomed.info/sct", "code": enc["code"], "display": enc["display"]}]}],
                "period": {"start": f"2026-{random.randint(1,3):02d}-15T09:00:00Z"}
            }
        })

        bundles.append({
            "resourceType": "Bundle",
            "type": "collection",
            "id": f"bundle-{pid}",
            "entry": entries
        })

    with open("data/synthea/sample_patients.json", "w", encoding="utf-8") as f:
        json.dump(bundles, f, indent=2)
        
    print(f"Successfully generated {len(bundles)} synthetic patient bundles into data/synthea/sample_patients.json!")

if __name__ == "__main__":
    generate_100_patients()
