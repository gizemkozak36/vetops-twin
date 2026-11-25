from fastapi.testclient import TestClient

import app.main as main_module
from app.main import app, create_initial_state


def setup_function():
    fresh_state = create_initial_state()
    if hasattr(main_module, "state") and isinstance(main_module.state, dict):
        main_module.state.clear()
        main_module.state.update(fresh_state)
    if hasattr(main_module, "clinic_state") and isinstance(main_module.clinic_state, dict):
        main_module.clinic_state.clear()
        main_module.clinic_state.update(fresh_state)


client = TestClient(app)


def test_treatment_decrements_stock_and_triggers_critical_alert():
    triage_resp = client.post(
        "/triage",
        json={
            "patient_name": "Pamuk",
            "species": "Kedi",
            "urgency": "Acil",
            "complaint": "Solunum sikintisi",
        },
    )
    assert triage_resp.status_code == 201
    triage_data = triage_resp.json()
    assert triage_data["assignment"] == "room"
    assert triage_data["room_id"] == "OD-1"

    complete_resp = client.post(
        "/treatment/complete",
        json={
            "room_id": "OD-1",
            "used_items": [{"item_id": "STK-2", "quantity": 2}],
        },
    )
    assert complete_resp.status_code == 200
    data = complete_resp.json()
    assert data["completed_room"] == "OD-1"
    assert data["state"]["rooms"][0]["status"] == "Bos"
    assert any("Genis Spektrumlu Antibiyotik" in alert for alert in data["alerts"])


def test_treatment_complete_rejects_empty_room_or_insufficient_stock():
    empty_room_resp = client.post(
        "/treatment/complete",
        json={"room_id": "OD-1", "used_items": []},
    )
    assert empty_room_resp.status_code == 400

    client.post(
        "/triage",
        json={
            "patient_name": "Pamuk",
            "species": "Kedi",
            "urgency": "Acil",
            "complaint": "Solunum sikintisi",
        },
    )
    over_stock_resp = client.post(
        "/treatment/complete",
        json={
            "room_id": "OD-1",
            "used_items": [{"item_id": "STK-2", "quantity": 99}],
        },
    )
    assert over_stock_resp.status_code == 400