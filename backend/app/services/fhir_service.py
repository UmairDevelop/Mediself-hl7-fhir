import os
import json
import logging
from typing import List, Dict, Any, Optional
import httpx
from app.config import settings

logger = logging.getLogger("fhir_service")

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))
SAMPLE_DATA_PATH = os.path.join(BASE_DIR, "data", "synthea", "sample_patients.json")

class FHIRService:
    def __init__(self):
        self.local_resources: Dict[str, Dict[str, Any]] = {} # resource_type: {id: resource}
        self.load_sample_data()

    def load_sample_data(self):
        if os.path.exists(SAMPLE_DATA_PATH):
            try:
                with open(SAMPLE_DATA_PATH, "r", encoding="utf-8") as f:
                    bundles = json.load(f)
                    for bundle in bundles:
                        for entry in bundle.get("entry", []):
                            resource = entry.get("resource")
                            if resource and "resourceType" in resource and "id" in resource:
                                r_type = resource["resourceType"]
                                if r_type not in self.local_resources:
                                    self.local_resources[r_type] = {}
                                self.local_resources[r_type][resource["id"]] = resource
                logger.info(f"Loaded {sum(len(v) for v in self.local_resources.values())} FHIR resources into local memory store.")
            except Exception as e:
                logger.error(f"Failed to load sample FHIR data: {e}")

    async def test_connection(self, url: str) -> Dict[str, Any]:
        import time
        target_url = url.rstrip("/") + "/metadata"
        start = time.time()
        try:
            async with httpx.AsyncClient(timeout=6.0) as client:
                res = await client.get(target_url)
                latency = round((time.time() - start) * 1000, 1)
                if res.status_code == 200:
                    data = res.json()
                    return {
                        "status": "connected",
                        "fhir_version": data.get("fhirVersion", "R4"),
                        "software_name": data.get("software", {}).get("name", "HAPI FHIR Server"),
                        "latency_ms": latency,
                        "url": url
                    }
                return {
                    "status": "error",
                    "detail": f"HTTP {res.status_code}",
                    "latency_ms": latency,
                    "url": url
                }
        except Exception as e:
            return {
                "status": "offline",
                "detail": str(e),
                "url": url
            }

    async def search_patients(self, query: str = "") -> List[Dict[str, Any]]:
        query_lower = query.lower()
        results = []
        patients = list(self.local_resources.get("Patient", {}).values())
        
        for p in patients:
            if not query:
                results.append(p)
                continue
            
            names = p.get("name", [])
            name_str = " ".join([f"{' '.join(n.get('given', []))} {n.get('family', '')}" for n in names]).lower()
            identifiers = [i.get("value", "") for i in p.get("identifier", [])]
            id_str = " ".join(identifiers).lower()
            
            if query_lower in name_str or query_lower in id_str or query_lower in p.get("id", "").lower():
                results.append(p)

        return results

    async def get_patient(self, patient_id: str) -> Optional[Dict[str, Any]]:
        return self.local_resources.get("Patient", {}).get(patient_id)

    async def _push_to_remote(self, resource_type: str, resource_id: str, payload: Dict[str, Any]):
        if settings.FHIR_SERVER_BASE_URL:
            try:
                # Ensure remote ID is HAPI-compatible (mapped to mediself- prefix)
                remote_id = resource_id
                if not remote_id.startswith("mediself-"):
                    if remote_id.startswith("patient-"):
                        remote_id = remote_id.replace("patient-", "mediself-patient-")
                    else:
                        remote_id = f"mediself-{remote_id}"

                remote_payload = dict(payload)
                remote_payload["id"] = remote_id
                
                # Stamp meta source
                if "meta" not in remote_payload:
                    remote_payload["meta"] = {}
                remote_payload["meta"]["source"] = "https://mediself-clinical.org"

                url = f"{settings.FHIR_SERVER_BASE_URL.rstrip('/')}/{resource_type}/{remote_id}"
                async with httpx.AsyncClient(timeout=8.0) as client:
                    res = await client.put(url, json=remote_payload)
                    logger.info(f"Pushed live FHIR resource to {url} - Status {res.status_code}")
            except Exception as e:
                logger.warning(f"Remote FHIR push failed: {e}")

    async def update_patient_demographics(self, patient_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        patient = await self.get_patient(patient_id)
        if not patient:
            return None

        if "given" in updates or "family" in updates:
            given = updates.get("given", patient.get("name", [{}])[0].get("given", [""])[0])
            family = updates.get("family", patient.get("name", [{}])[0].get("family", ""))
            patient["name"] = [{"use": "official", "given": [given], "family": family}]

        if "mrn" in updates:
            patient["identifier"] = [
                {
                    "system": "http://hospital.smarthealth.org/mrn",
                    "value": updates["mrn"]
                }
            ]

        if "birthDate" in updates:
            patient["birthDate"] = updates["birthDate"]

        if "gender" in updates:
            patient["gender"] = updates["gender"]

        if "phone" in updates:
            telecom = patient.get("telecom", [])
            # Update phone
            updated_telecom = [t for t in telecom if t.get("system") != "phone"]
            updated_telecom.append({"system": "phone", "value": updates["phone"]})
            patient["telecom"] = updated_telecom

        if "address" in updates:
            patient["address"] = [{"line": [updates["address"]], "city": "Boston", "state": "MA", "postalCode": "02115"}]

        self.local_resources["Patient"][patient_id] = patient
        await self._push_to_remote("Patient", patient_id, patient)
        return patient

    async def get_patient_resources(self, resource_type: str, patient_id: str) -> List[Dict[str, Any]]:
        resources = list(self.local_resources.get(resource_type, {}).values())
        matched = []
        for r in resources:
            subject_ref = r.get("subject", {}).get("reference", "") or r.get("patient", {}).get("reference", "")
            if subject_ref == f"Patient/{patient_id}" or subject_ref == patient_id:
                matched.append(r)
        return matched

    async def get_resource_by_id(self, resource_type: str, resource_id: str) -> Optional[Dict[str, Any]]:
        return self.local_resources.get(resource_type, {}).get(resource_id)

    async def create_resource(self, resource_type: str, resource_data: Dict[str, Any]) -> Dict[str, Any]:
        if resource_type not in self.local_resources:
            self.local_resources[resource_type] = {}
        
        if "id" not in resource_data or not resource_data["id"]:
            import uuid
            resource_data["id"] = f"{resource_type.lower()}-{uuid.uuid4().hex[:8]}"
            
        resource_data["resourceType"] = resource_type
        self.local_resources[resource_type][resource_data["id"]] = resource_data
        await self._push_to_remote(resource_type, resource_data["id"], resource_data)
        return resource_data

    async def update_resource(self, resource_type: str, resource_id: str, resource_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        if resource_type not in self.local_resources or resource_id not in self.local_resources[resource_type]:
            return None
        
        resource_data["id"] = resource_id
        resource_data["resourceType"] = resource_type
        self.local_resources[resource_type][resource_id] = resource_data
        await self._push_to_remote(resource_type, resource_id, resource_data)
        return resource_data

    async def deactivate_resource(self, resource_type: str, resource_id: str) -> Optional[Dict[str, Any]]:
        res = await self.get_resource_by_id(resource_type, resource_id)
        if not res:
            return None

        if resource_type in ["Condition", "AllergyIntolerance"]:
            res["clinicalStatus"] = {"coding": [{"system": "http://terminology.hl7.org/CodeSystem/condition-clinical", "code": "inactive"}]}
        elif resource_type == "MedicationRequest":
            res["status"] = "stopped"
        elif resource_type == "Observation":
            res["status"] = "cancelled"
        elif resource_type == "Encounter":
            res["status"] = "cancelled"

        self.local_resources[resource_type][resource_id] = res
        await self._push_to_remote(resource_type, resource_id, res)
        return res

fhir_service = FHIRService()
