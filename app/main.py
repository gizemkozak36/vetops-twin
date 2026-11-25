from enum import Enum
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

app = FastAPI(title="VetOps Twin API")


class UrgencyLevel(str, Enum):
    DUSUK = "Dusuk"
    ORTA = "Orta"
    ACIL = "Acil"


class TriageRequest(BaseModel):
    patient_name: str = Field(..., min_length=1)
    species: str = Field(..., min_length=1)
    urgency: UrgencyLevel
    complaint: str = Field(..., min_length=1)


def create_initial_state() -> dict:
    return {
        "rooms": [
            {"room_id": "OD-1", "status": "Bos", "current_patient": None},
            {"room_id": "OD-2", "status": "Bos", "current_patient": None},
        ],
        "queue": [],
    }


clinic_state = create_initial_state()


def _recalculate_queue_positions() -> None:
    for index, item in enumerate(clinic_state["queue"], start=1):
        item["position"] = index


@app.post("/triage", status_code=201)
def create_triage(payload: TriageRequest) -> dict:
    patient_record = {
        "patient_name": payload.patient_name,
        "species": payload.species,
        "urgency": payload.urgency.value,
        "complaint": payload.complaint,
    }

    for room in clinic_state["rooms"]:
        if room["status"] == "Bos":
            room["status"] = "Dolu"
            room["current_patient"] = patient_record
            return {
                "assignment": "room",
                "room_id": room["room_id"],
                "patient": patient_record,
            }

    queue_entry = {**patient_record, "position": 0}
    if payload.urgency == UrgencyLevel.ACIL:
        clinic_state["queue"].insert(0, queue_entry)
    else:
        clinic_state["queue"].append(queue_entry)

    _recalculate_queue_positions()
    assigned_entry = next(
        entry for entry in clinic_state["queue"] if entry is queue_entry
    )
    return {
        "assignment": "queue",
        "position": assigned_entry["position"],
        "patient": assigned_entry,
    }


@app.get("/clinic-state")
def get_clinic_state() -> dict:
    return clinic_state
