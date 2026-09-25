import json
import urllib.request

BASE_URL = "http://127.0.0.1:8000/api"

def login(email: str, password: str) -> str:
    req = urllib.request.Request(
        f"{BASE_URL}/auth/login",
        data=json.dumps({"email": email, "password": password}).encode("utf-8"),
        headers={"Content-Type": "application/json"}
    )
    res = urllib.request.urlopen(req)
    data = json.loads(res.read().decode("utf-8"))
    return data["access_token"]

def main():
    print("--- STARTING END-TO-END VERIFICATION PASS ---")
    
    # 1. Physician Login
    doc_token = login("physician@hospital.org", "doctor123")
    print(" [OK] 1. Physician authentication successful.")
    # 2. Search Patients
    req = urllib.request.Request(f"{BASE_URL}/patients/search", headers={"Authorization": f"Bearer {doc_token}"})
    patients = json.loads(urllib.request.urlopen(req).read().decode("utf-8"))["patients"]
    print(f" [OK] 2. Patient directory returned {len(patients)} synthetic patient records.")
    assert len(patients) >= 3, "Expected at least 3 sample patients"

    # 3. Create a Condition
    cond_payload = {
        "code": {"coding": [{"system": "http://snomed.info/sct", "code": "55822004", "display": "Hyperlipidemia"}]},
        "clinicalStatus": {"coding": [{"code": "active"}]},
        "onsetDateTime": "2026-03-01"
    }
    req = urllib.request.Request(
        f"{BASE_URL}/patients/patient-001/conditions",
        data=json.dumps(cond_payload).encode("utf-8"),
        headers={"Authorization": f"Bearer {doc_token}", "Content-Type": "application/json"},
        method="POST"
    )
    new_cond = json.loads(urllib.request.urlopen(req).read().decode("utf-8"))
    print(f" [OK] 3. Created new Condition on patient-001: {new_cond.get('id')} ({new_cond.get('code', {}).get('coding', [{}])[0].get('display')})")

    # 4. AI Chat Query (Gemini Tool Calling + Forced Patient Scoping)
    chat_payload = {"question": "Has this patient had any abnormal potassium levels in the last year?"}
    req = urllib.request.Request(
        f"{BASE_URL}/patients/patient-001/chat",
        data=json.dumps(chat_payload).encode("utf-8"),
        headers={"Authorization": f"Bearer {doc_token}", "Content-Type": "application/json"},
        method="POST"
    )
    chat_res = json.loads(urllib.request.urlopen(req).read().decode("utf-8"))
    print(" [OK] 4. AI Chat Assistant Response:")
    print(f"   Answer: {chat_res['answer'][:120]}...")
    print(f"   Citations Returned: {len(chat_res['citations'])} resource citations.")
    assert len(chat_res['citations']) > 0, "Expected at least 1 resource citation"

    # 5. Admin Compliance Audit Log Check
    admin_token = login("admin@hospital.org", "admin123")
    req = urllib.request.Request(f"{BASE_URL}/audit", headers={"Authorization": f"Bearer {admin_token}"})
    audit_res = json.loads(urllib.request.urlopen(req).read().decode("utf-8"))["audit_entries"]
    print(f" [OK] 5. Compliance Audit Log contains {len(audit_res)} audit entries.")
    assert len(audit_res) >= 2, "Expected audit entries for condition creation and AI chat"

    print("\nALL END-TO-END VERIFICATION PASSES COMPLETED SUCCESSFULLY!")

if __name__ == "__main__":
    main()
