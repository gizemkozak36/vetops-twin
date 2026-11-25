from enum import Enum
from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

app = FastAPI(title="VetOps Twin API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class UrgencyLevel(str, Enum):
    DUSUK = "Dusuk"
    ORTA = "Orta"
    ACIL = "Acil"


class TriageRequest(BaseModel):
    patient_name: str = Field(..., min_length=1)
    species: str = Field(..., min_length=1)
    urgency: UrgencyLevel
    complaint: str = Field(..., min_length=1)


class UsedItem(BaseModel):
    item_id: str
    quantity: int = Field(..., gt=0)


class CompleteTreatmentRequest(BaseModel):
    room_id: str
    used_items: list[UsedItem] = []


def create_initial_state() -> dict:
    return {
        "rooms": [
            {"room_id": "OD-1", "status": "Bos", "current_patient": None},
            {"room_id": "OD-2", "status": "Bos", "current_patient": None},
        ],
        "queue": [],
        "inventory": [
            {"item_id": "STK-1", "name": "Izotonik Serum", "quantity": 10, "critical_threshold": 3},
            {"item_id": "STK-2", "name": "Genis Spektrumlu Antibiyotik", "quantity": 4, "critical_threshold": 3},
            {"item_id": "STK-3", "name": "Agri Kesici Enjeksiyon", "quantity": 8, "critical_threshold": 2},
        ],
        "alerts": [],
    }


state = create_initial_state()
clinic_state = state


def _sync_queue_positions() -> None:
    for idx, item in enumerate(state["queue"], start=1):
        item["position"] = idx


def _refresh_alerts() -> None:
    _sync_queue_positions()
    state["alerts"] = [
        f"Kritik stok uyarisi: {item['name']} (Kalan: {item['quantity']}, Esik: {item['critical_threshold']})"
        for item in state["inventory"]
        if item["quantity"] <= item["critical_threshold"]
    ]


@app.get("/state")
def get_state():
    _refresh_alerts()
    return state


@app.get("/clinic-state")
def get_clinic_state():
    _refresh_alerts()
    return state


@app.post("/triage", status_code=status.HTTP_201_CREATED)
def create_triage(payload: TriageRequest):
    patient = payload.model_dump()
    assigned_room = None
    assignment = "queue"
    position = None

    empty_room = next((room for room in state["rooms"] if room["status"] == "Bos"), None)

    if empty_room is not None and payload.urgency == UrgencyLevel.ACIL:
        empty_room["status"] = "Dolu"
        empty_room["current_patient"] = patient
        assigned_room = empty_room["room_id"]
        assignment = "room"

    occupied_count = sum(1 for r in state["rooms"] if r["status"] == "Dolu")
    if assigned_room is None and empty_room is not None and occupied_count < 2 and len(state["queue"]) == 0:
        empty_room["status"] = "Dolu"
        empty_room["current_patient"] = patient
        assigned_room = empty_room["room_id"]
        assignment = "room"

    if assigned_room is None:
        if payload.urgency == UrgencyLevel.ACIL:
            state["queue"].insert(0, patient)
        else:
            state["queue"].append(patient)
        _sync_queue_positions()
        position = patient["position"]

    _refresh_alerts()
    return {
        "assignment": assignment,
        "room_id": assigned_room,
        "assigned_room": assigned_room,
        "position": position,
        "queued": assignment == "queue",
        "patient": patient,
        "state": state,
    }


@app.post("/treatment/complete")
def complete_treatment(payload: CompleteTreatmentRequest):
    target_room = next((r for r in state["rooms"] if r["room_id"] == payload.room_id), None)
    if not target_room:
        raise HTTPException(status_code=404, detail="Oda bulunamadi")
    if target_room["status"] != "Dolu":
        raise HTTPException(status_code=400, detail="Odada aktif hasta yok")

    for used in payload.used_items:
        stock_item = next((i for i in state["inventory"] if i["item_id"] == used.item_id), None)
        if not stock_item:
            raise HTTPException(status_code=404, detail=f"Stok kalemi bulunamadi: {used.item_id}")
        if stock_item["quantity"] < used.quantity:
            raise HTTPException(status_code=400, detail=f"Yetersiz stok: {stock_item['name']}")
        stock_item["quantity"] -= used.quantity

    if state["queue"]:
        next_patient = state["queue"].pop(0)
        next_patient.pop("position", None)
        target_room["current_patient"] = next_patient
        target_room["status"] = "Dolu"
        _sync_queue_positions()
    else:
        target_room["current_patient"] = None
        target_room["status"] = "Bos"

    _refresh_alerts()
    return {
        "completed_room": target_room["room_id"],
        "alerts": state["alerts"],
        "state": state,
    }