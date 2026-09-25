import json

def update_sample_patients():
    with open("data/synthea/sample_patients.json", "r", encoding="utf-8") as f:
        data = f.read()

    data = data.replace('"id": "patient-', '"id": "mediself-patient-')
    data = data.replace('"id": "cond-patient-', '"id": "cond-mediself-patient-')
    data = data.replace('"id": "med-patient-', '"id": "med-mediself-patient-')
    data = data.replace('"id": "obs-patient-', '"id": "obs-mediself-patient-')
    data = data.replace('"id": "all-patient-', '"id": "all-mediself-patient-')
    data = data.replace('"id": "enc-patient-', '"id": "enc-mediself-patient-')
    data = data.replace('"reference": "Patient/patient-', '"reference": "Patient/mediself-patient-')

    with open("data/synthea/sample_patients.json", "w", encoding="utf-8") as f:
        f.write(data)
    
    print("Successfully updated sample_patients.json IDs to mediself-patient-XXX!")

if __name__ == "__main__":
    update_sample_patients()
