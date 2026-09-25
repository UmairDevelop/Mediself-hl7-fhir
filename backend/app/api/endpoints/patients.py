from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from pydantic import BaseModel
from sqlmodel import Session
from app.db.session import get_session
from app.db.models import User, AuditEntry
from app.core.permissions import can
from app.api.deps import get_current_user
from app.services.fhir_service import fhir_service

router = APIRouter()

def record_audit(session: Session, user: User, patient_id: str, action: str, detail: Dict[str, Any]):
    entry = AuditEntry(
        userId=user.id,
        userEmail=user.email,
        userName=user.name,
        userRole=user.role.value,
        patientId=patient_id,
        action=action
    )
    entry.set_detail(detail)
    session.add(entry)
    session.commit()

# --- PATIENT SEARCH & DEMOGRAPHICS ---

@router.get("/search")
async def search_patients(
    q: str = Query("", description="Search term for patient name or MRN"),
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    if not can(current_user, "chart.view"):
        raise HTTPException(status_code=403, detail="Forbidden: insufficient permissions to search patients.")
    
    patients = await fhir_service.search_patients(q)
    return {"patients": patients}

@router.get("/{id}")
async def get_patient_demographics(
    id: str,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    if not can(current_user, "chart.view"):
        raise HTTPException(status_code=403, detail="Forbidden: insufficient permissions.")
    
    patient = await fhir_service.get_patient(id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found.")
    
    record_audit(session, current_user, id, "patient.view", {"view": "demographics"})
    return patient

@router.put("/{id}")
async def update_patient_demographics(
    id: str,
    payload: Dict[str, Any],
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    if not can(current_user, "patient.update_demographics"):
        raise HTTPException(status_code=403, detail="Forbidden: insufficient permissions to update patient demographics.")
    
    updated = await fhir_service.update_patient_demographics(id, payload)
    if not updated:
        raise HTTPException(status_code=404, detail="Patient not found.")
    
    record_audit(session, current_user, id, "patient.update_demographics", payload)
    return updated

# --- CONDITIONS CRUD ---

@router.get("/{id}/conditions")
async def list_conditions(
    id: str,
    current_user: User = Depends(get_current_user)
):
    if not can(current_user, "chart.view_clinical"):
        raise HTTPException(status_code=403, detail="Forbidden: clinical data is restricted to clinical roles.")
    
    conditions = await fhir_service.get_patient_resources("Condition", id)
    return {"conditions": conditions}

@router.post("/{id}/conditions")
async def create_condition(
    id: str,
    payload: Dict[str, Any],
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    if not can(current_user, "condition.create"):
        raise HTTPException(status_code=403, detail="Forbidden: insufficient permission to add conditions.")
    
    payload["subject"] = {"reference": f"Patient/{id}"}
    created = await fhir_service.create_resource("Condition", payload)
    record_audit(session, current_user, id, "condition.create", created)
    return created

@router.put("/{id}/conditions/{cond_id}")
async def update_condition(
    id: str,
    cond_id: str,
    payload: Dict[str, Any],
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    if not can(current_user, "condition.update"):
        raise HTTPException(status_code=403, detail="Forbidden: insufficient permission to update conditions.")
    
    payload["subject"] = {"reference": f"Patient/{id}"}
    updated = await fhir_service.update_resource("Condition", cond_id, payload)
    if not updated:
        raise HTTPException(status_code=404, detail="Condition resource not found.")
    
    record_audit(session, current_user, id, "condition.update", updated)
    return updated

@router.delete("/{id}/conditions/{cond_id}")
async def deactivate_condition(
    id: str,
    cond_id: str,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    if not can(current_user, "condition.deactivate"):
        raise HTTPException(status_code=403, detail="Forbidden: insufficient permission to deactivate conditions.")
    
    deactivated = await fhir_service.deactivate_resource("Condition", cond_id)
    if not deactivated:
        raise HTTPException(status_code=404, detail="Condition resource not found.")
    
    record_audit(session, current_user, id, "condition.deactivate", {"id": cond_id, "status": "inactive"})
    return deactivated

# --- MEDICATIONS CRUD ---

@router.get("/{id}/medications")
async def list_medications(
    id: str,
    current_user: User = Depends(get_current_user)
):
    if not can(current_user, "chart.view_clinical"):
        raise HTTPException(status_code=403, detail="Forbidden: clinical data is restricted.")
    
    meds = await fhir_service.get_patient_resources("MedicationRequest", id)
    return {"medications": meds}

@router.post("/{id}/medications")
async def create_medication(
    id: str,
    payload: Dict[str, Any],
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    if not can(current_user, "medication.create"):
        raise HTTPException(status_code=403, detail="Forbidden: insufficient permission to add medications.")
    
    payload["subject"] = {"reference": f"Patient/{id}"}
    created = await fhir_service.create_resource("MedicationRequest", payload)
    record_audit(session, current_user, id, "medication.create", created)
    return created

@router.delete("/{id}/medications/{med_id}")
async def deactivate_medication(
    id: str,
    med_id: str,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    if not can(current_user, "medication.deactivate"):
        raise HTTPException(status_code=403, detail="Forbidden: insufficient permission to deactivate medications.")
    
    deactivated = await fhir_service.deactivate_resource("MedicationRequest", med_id)
    if not deactivated:
        raise HTTPException(status_code=404, detail="Medication resource not found.")
    
    record_audit(session, current_user, id, "medication.deactivate", {"id": med_id, "status": "stopped"})
    return deactivated

# --- OBSERVATIONS (LABS) CRUD ---

@router.get("/{id}/observations")
async def list_observations(
    id: str,
    current_user: User = Depends(get_current_user)
):
    if not can(current_user, "chart.view_clinical"):
        raise HTTPException(status_code=403, detail="Forbidden.")
    
    obs = await fhir_service.get_patient_resources("Observation", id)
    return {"observations": obs}

@router.post("/{id}/observations")
async def create_observation(
    id: str,
    payload: Dict[str, Any],
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    if not can(current_user, "observation.create"):
        raise HTTPException(status_code=403, detail="Forbidden.")
    
    payload["subject"] = {"reference": f"Patient/{id}"}
    created = await fhir_service.create_resource("Observation", payload)
    record_audit(session, current_user, id, "observation.create", created)
    return created

# --- ALLERGIES CRUD ---

@router.get("/{id}/allergies")
async def list_allergies(
    id: str,
    current_user: User = Depends(get_current_user)
):
    if not can(current_user, "chart.view_clinical"):
        raise HTTPException(status_code=403, detail="Forbidden.")
    
    allergies = await fhir_service.get_patient_resources("AllergyIntolerance", id)
    return {"allergies": allergies}

@router.post("/{id}/allergies")
async def create_allergy(
    id: str,
    payload: Dict[str, Any],
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    if not can(current_user, "allergy.create"):
        raise HTTPException(status_code=403, detail="Forbidden.")
    
    payload["patient"] = {"reference": f"Patient/{id}"}
    created = await fhir_service.create_resource("AllergyIntolerance", payload)
    record_audit(session, current_user, id, "allergy.create", created)
    return created

@router.delete("/{id}/allergies/{allergy_id}")
async def deactivate_allergy(
    id: str,
    allergy_id: str,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    if not can(current_user, "allergy.deactivate"):
        raise HTTPException(status_code=403, detail="Forbidden.")
    
    deactivated = await fhir_service.deactivate_resource("AllergyIntolerance", allergy_id)
    if not deactivated:
        raise HTTPException(status_code=404, detail="Allergy resource not found.")
    
    record_audit(session, current_user, id, "allergy.deactivate", {"id": allergy_id, "status": "inactive"})
    return deactivated

# --- ENCOUNTERS CRUD ---

@router.get("/{id}/encounters")
async def list_encounters(
    id: str,
    current_user: User = Depends(get_current_user)
):
    if not can(current_user, "chart.view_clinical"):
        raise HTTPException(status_code=403, detail="Forbidden.")
    
    encounters = await fhir_service.get_patient_resources("Encounter", id)
    return {"encounters": encounters}

@router.post("/{id}/encounters")
async def create_encounter(
    id: str,
    payload: Dict[str, Any],
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    if not can(current_user, "encounter.create"):
        raise HTTPException(status_code=403, detail="Forbidden.")
    
    payload["subject"] = {"reference": f"Patient/{id}"}
    created = await fhir_service.create_resource("Encounter", payload)
    record_audit(session, current_user, id, "encounter.create", created)
    return created
