import logging
import json
import time
from typing import Dict, Any, List, Optional
from app.config import settings
from app.services.fhir_service import fhir_service
from app.db.models import ApiUsageLog
from sqlmodel import Session

logger = logging.getLogger("gemini_service")

SYSTEM_PROMPT = """
You are a clinical information assistant for hospital clinicians. You can only see data for ONE patient,
whose records are retrieved for you through the tools available.
You must never state a fact unless it came from a tool result in this conversation.
If a tool returns no results, say so plainly rather than guessing.
You do not provide diagnoses or treatment recommendations. You only report what the record shows.
If asked for a diagnosis or treatment suggestion, state that it's outside your scope and suggest the clinician review the chart directly.
Keep answers concise, precise, and reference specific dates, values, and units from the data you retrieved.
"""

GEMINI_TOOLS = [
    {
        "name": "search_observations",
        "description": "Search lab results, vital signs, and clinical measurements for the patient",
        "parameters": {
            "type": "OBJECT",
            "properties": {
                "code": {"type": "STRING", "description": "LOINC code or measurement name (e.g., potassium, HbA1c, blood pressure)"},
                "date_from": {"type": "STRING", "description": "ISO date string filter (YYYY-MM-DD)"}
            }
        }
    },
    {
        "name": "search_conditions",
        "description": "Search active and historical medical conditions/diagnoses for the patient",
        "parameters": {
            "type": "OBJECT",
            "properties": {
                "text": {"type": "STRING", "description": "Search term for condition, e.g. diabetes, hypertension"}
            }
        }
    },
    {
        "name": "search_medications",
        "description": "Search current and past medication orders for the patient",
        "parameters": {
            "type": "OBJECT",
            "properties": {
                "status": {"type": "STRING", "enum": ["active", "stopped", "all"], "description": "Medication status filter"}
            }
        }
    },
    {
        "name": "search_allergies",
        "description": "Search recorded allergies and intolerances for the patient",
        "parameters": {
            "type": "OBJECT",
            "properties": {}
        }
    },
    {
        "name": "search_encounters",
        "description": "Search visit and encounter history for the patient",
        "parameters": {
            "type": "OBJECT",
            "properties": {
                "limit": {"type": "NUMBER", "description": "Maximum number of encounters to return"}
            }
        }
    }
]

async def execute_tool(tool_name: str, tool_args: Dict[str, Any], patient_id: str) -> List[Dict[str, Any]]:
    if tool_name == "search_observations":
        obs_list = await fhir_service.get_patient_resources("Observation", patient_id)
        code_filter = tool_args.get("code", "").lower()
        if code_filter:
            filtered = []
            for obs in obs_list:
                display = obs.get("code", {}).get("coding", [{}])[0].get("display", "").lower()
                code = obs.get("code", {}).get("coding", [{}])[0].get("code", "").lower()
                if code_filter in display or code_filter in code:
                    filtered.append(obs)
            return filtered
        return obs_list

    elif tool_name == "search_conditions":
        cond_list = await fhir_service.get_patient_resources("Condition", patient_id)
        text_filter = tool_args.get("text", "").lower()
        if text_filter:
            filtered = []
            for cond in cond_list:
                display = cond.get("code", {}).get("coding", [{}])[0].get("display", "").lower()
                if text_filter in display:
                    filtered.append(cond)
            return filtered
        return cond_list

    elif tool_name == "search_medications":
        med_list = await fhir_service.get_patient_resources("MedicationRequest", patient_id)
        status_filter = tool_args.get("status", "all").lower()
        if status_filter != "all":
            return [m for m in med_list if m.get("status", "").lower() == status_filter]
        return med_list

    elif tool_name == "search_allergies":
        return await fhir_service.get_patient_resources("AllergyIntolerance", patient_id)

    elif tool_name == "search_encounters":
        enc_list = await fhir_service.get_patient_resources("Encounter", patient_id)
        limit = int(tool_args.get("limit", 10))
        return enc_list[:limit]

    return []

def extract_citations(retrieved_resources: List[Dict[str, Any]]) -> List[Dict[str, str]]:
    citations = []
    seen = set()

    for r in retrieved_resources:
        r_type = r.get("resourceType", "Resource")
        r_id = r.get("id", "")
        key = f"{r_type}/{r_id}"
        if key in seen:
            continue
        seen.add(key)

        summary = ""
        if r_type == "Observation":
            display = r.get("code", {}).get("coding", [{}])[0].get("display", "Observation")
            val = r.get("valueQuantity", {}).get("value", "")
            unit = r.get("valueQuantity", {}).get("unit", "")
            date = r.get("effectiveDateTime", "")[:10]
            summary = f"{display}: {val} {unit} ({date})"
        elif r_type == "Condition":
            display = r.get("code", {}).get("coding", [{}])[0].get("display", "Condition")
            status = r.get("clinicalStatus", {}).get("coding", [{}])[0].get("code", "active")
            summary = f"{display} [{status}]"
        elif r_type == "MedicationRequest":
            display = r.get("medicationCodeableConcept", {}).get("coding", [{}])[0].get("display", "Medication")
            status = r.get("status", "active")
            summary = f"{display} [{status}]"
        elif r_type == "AllergyIntolerance":
            display = r.get("code", {}).get("coding", [{}])[0].get("display", "Allergy")
            criticality = r.get("criticality", "unspecified")
            summary = f"{display} (Criticality: {criticality})"
        elif r_type == "Encounter":
            display = r.get("type", [{}])[0].get("coding", [{}])[0].get("display", "Encounter")
            start = r.get("period", {}).get("start", "")[:10]
            summary = f"{display} ({start})"

        citations.append({
            "resourceType": r_type,
            "id": r_id,
            "summary": summary
        })

    return citations

async def answer_patient_question(
    patient_id: str,
    question: str,
    user_id: int = 0,
    user_email: str = "clinician@hospital.org",
    user_name: str = "Clinician",
    db_session: Optional[Session] = None
) -> Dict[str, Any]:
    start_time = time.time()
    retrieved_resources = []
    model_used = "gemini-3.6-flash"
    prompt_tokens = len(question) // 4 + 50
    candidate_tokens = 0

    api_key_to_use = settings.GEMINI_API_KEY.strip() if settings.GEMINI_API_KEY else ""

    # Try Live Gemini API with gemini-3.6-flash
    if api_key_to_use and len(api_key_to_use) > 10:
        try:
            from google import genai
            client = genai.Client(api_key=api_key_to_use)
            
            # Step 1: Query Gemini with tools
            response = client.models.generate_content(
                model="gemini-3.6-flash",
                contents=f"Patient ID: {patient_id}. Clinician Question: {question}",
                config=dict(
                    system_instruction=SYSTEM_PROMPT,
                    tools=[dict(function_declarations=GEMINI_TOOLS)]
                )
            )
            
            # Step 2: If model executed function calls, run them with forced patient scoping
            if response.function_calls:
                for fc in response.function_calls:
                    tool_results = await execute_tool(fc.name, fc.args, patient_id)
                    retrieved_resources.extend(tool_results)
                    
                # Step 3: Pass retrieved FHIR data back to Gemini for final response
                final_res = client.models.generate_content(
                    model="gemini-3.6-flash",
                    contents=[
                        f"Question: {question}",
                        f"Retrieved FHIR Clinical Data for Patient {patient_id}: {json.dumps(retrieved_resources)}"
                    ],
                    config=dict(system_instruction=SYSTEM_PROMPT)
                )

                if hasattr(final_res, "usage_metadata") and final_res.usage_metadata:
                    prompt_tokens = getattr(final_res.usage_metadata, "prompt_token_count", prompt_tokens)
                    candidate_tokens = getattr(final_res.usage_metadata, "candidates_token_count", len(final_res.text) // 4)
                else:
                    candidate_tokens = len(final_res.text) // 4

                citations = extract_citations(retrieved_resources)
                result = {"answer": final_res.text, "citations": citations}
                
                # Log Live API usage
                latency_ms = (time.time() - start_time) * 1000
                if db_session:
                    log_entry = ApiUsageLog(
                        userId=user_id,
                        userEmail=user_email,
                        userName=user_name,
                        patientId=patient_id,
                        modelName=model_used,
                        promptTokens=prompt_tokens,
                        candidateTokens=candidate_tokens,
                        totalTokens=prompt_tokens + candidate_tokens,
                        latencyMs=round(latency_ms, 2),
                        status="success"
                    )
                    db_session.add(log_entry)
                    db_session.commit()

                return result

            elif response.text:
                candidate_tokens = len(response.text) // 4
                result = {"answer": response.text, "citations": []}
                
                latency_ms = (time.time() - start_time) * 1000
                if db_session:
                    log_entry = ApiUsageLog(
                        userId=user_id,
                        userEmail=user_email,
                        userName=user_name,
                        patientId=patient_id,
                        modelName=model_used,
                        promptTokens=prompt_tokens,
                        candidateTokens=candidate_tokens,
                        totalTokens=prompt_tokens + candidate_tokens,
                        latencyMs=round(latency_ms, 2),
                        status="success"
                    )
                    db_session.add(log_entry)
                    db_session.commit()

                return result

        except Exception as e:
            logger.error(f"Gemini 3.6 API call exception: {e}")

    # Fallback to Local Clinical Engine if API call fails or key unconfigured
    model_used = "local-clinical-engine"
    q_lower = question.lower()
    
    if any(term in q_lower for term in ["lab", "observation", "potassium", "a1c", "blood pressure", "glucose", "result", "level", "value", "creatinine"]):
        obs = await execute_tool("search_observations", {}, patient_id)
        retrieved_resources.extend(obs)
        if obs:
            obs_summaries = []
            for o in obs:
                name = o.get("code", {}).get("coding", [{}])[0].get("display", "Test")
                val = o.get("valueQuantity", {}).get("value", "")
                unit = o.get("valueQuantity", {}).get("unit", "")
                dt = o.get("effectiveDateTime", "")[:10]
                obs_summaries.append(f"• {name}: {val} {unit} (recorded {dt})")
            answer = f"The chart records the following lab/vital results for this patient:\n" + "\n".join(obs_summaries)
        else:
            answer = "No lab results or vital sign observations were found in the patient's record."

    elif any(term in q_lower for term in ["condition", "diagnosis", "problem", "disease", "history", "diabetes", "hypertension"]):
        conds = await execute_tool("search_conditions", {}, patient_id)
        retrieved_resources.extend(conds)
        if conds:
            c_summaries = []
            for c in conds:
                name = c.get("code", {}).get("coding", [{}])[0].get("display", "Condition")
                status = c.get("clinicalStatus", {}).get("coding", [{}])[0].get("code", "active")
                onset = c.get("onsetDateTime", "unspecified date")
                c_summaries.append(f"• {name} (Status: {status}, Onset: {onset})")
            answer = f"The patient's problem list contains:\n" + "\n".join(c_summaries)
        else:
            answer = "No medical conditions or diagnoses were found on the patient's problem list."

    elif any(term in q_lower for term in ["medication", "med", "drug", "prescription", "rx", "dose", "taking"]):
        meds = await execute_tool("search_medications", {}, patient_id)
        retrieved_resources.extend(meds)
        if meds:
            m_summaries = []
            for m in meds:
                name = m.get("medicationCodeableConcept", {}).get("coding", [{}])[0].get("display", "Medication")
                status = m.get("status", "active")
                dosage = m.get("dosageInstruction", [{}])[0].get("text", "")
                m_summaries.append(f"• {name} [{status}] - {dosage}")
            answer = f"The patient's medication list shows:\n" + "\n".join(m_summaries)
        else:
            answer = "No active or past medications found in the patient's record."

    elif any(term in q_lower for term in ["allergy", "allergies", "reaction", "allergic", "penicillin", "latex"]):
        allergies = await execute_tool("search_allergies", {}, patient_id)
        retrieved_resources.extend(allergies)
        if allergies:
            a_summaries = []
            for a in allergies:
                name = a.get("code", {}).get("coding", [{}])[0].get("display", "Allergy")
                crit = a.get("criticality", "unspecified")
                a_summaries.append(f"• {name} (Criticality: {crit})")
            answer = f"The patient's record lists the following allergies/intolerances:\n" + "\n".join(a_summaries)
        else:
            answer = "No allergies or intolerances are recorded for this patient."

    elif any(term in q_lower for term in ["encounter", "visit", "appointment", "checkup", "consultation"]):
        encs = await execute_tool("search_encounters", {}, patient_id)
        retrieved_resources.extend(encs)
        if encs:
            e_summaries = []
            for e in encs:
                name = e.get("type", [{}])[0].get("coding", [{}])[0].get("display", "Visit")
                dt = e.get("period", {}).get("start", "")[:10]
                e_summaries.append(f"• {name} on {dt}")
            answer = f"The encounter history shows:\n" + "\n".join(e_summaries)
        else:
            answer = "No recent encounters or visit records were found for this patient."

    else:
        obs = await execute_tool("search_observations", {}, patient_id)
        conds = await execute_tool("search_conditions", {}, patient_id)
        meds = await execute_tool("search_medications", {}, patient_id)
        retrieved_resources = obs + conds + meds
        
        p = await fhir_service.get_patient(patient_id)
        p_name = "this patient"
        if p and p.get("name"):
            n = p["name"][0]
            p_name = f"{' '.join(n.get('given', []))} {n.get('family', '')}"

        answer = (
            f"Here is a summary of the clinical record for {p_name}:\n"
            f"• Conditions: {len(conds)} active/past diagnoses\n"
            f"• Medications: {len(meds)} recorded orders\n"
            f"• Observations/Labs: {len(obs)} lab results\n"
            f"You can ask specific questions about labs, medications, conditions, or allergies."
        )

    candidate_tokens = len(answer) // 4
    latency_ms = (time.time() - start_time) * 1000

    if db_session:
        log_entry = ApiUsageLog(
            userId=user_id,
            userEmail=user_email,
            userName=user_name,
            patientId=patient_id,
            modelName=model_used,
            promptTokens=prompt_tokens,
            candidateTokens=candidate_tokens,
            totalTokens=prompt_tokens + candidate_tokens,
            latencyMs=round(latency_ms, 2),
            status="success"
        )
        db_session.add(log_entry)
        db_session.commit()

    citations = extract_citations(retrieved_resources)
    return {"answer": answer, "citations": citations}
