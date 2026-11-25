from fastapi.testclient import TestClient
from app.main import app, clinic_state, create_initial_state

client = TestClient(app)


def setup_function() -> None:
    clinic_state.clear()
    clinic_state.update(create_initial_state())


def test_urgent_case_assigned_to_empty_room() -> None:
    response = client.post(
        "/triage",
        json={
            "patient_name": "Pamuk",
            "species": "Kedi",
            "urgency": "Acil",
            "complaint": "Solunum sikintisi",
        },
    )
    assert response.status_code == 201
    body = response.json()
    assert body["assignment"] == "room"
    assert body["room_id"] == "OD-1"

    state = client.get("/clinic-state").json()
    assert state["rooms"][0]["status"] == "Dolu"
    assert state["rooms"][0]["current_patient"]["patient_name"] == "Pamuk"


def test_urgent_case_goes_to_front_of_queue_when_rooms_full() -> None:
    # 2 odayi doldur
    client.post(
        "/triage",
        json={
            "patient_name": "Pamuk",
            "species": "Kedi",
            "urgency": "Acil",
            "complaint": "Solunum sikintisi",
        },
    )
    client.post(
        "/triage",
        json={
            "patient_name": "Boncuk",
            "species": "Kedi",
            "urgency": "Orta",
            "complaint": "Kusma",
        },
    )

    # Odalar doluyken kuyruga sirayla Max ve Limon eklensin
    client.post(
        "/triage",
        json={
            "patient_name": "Max",
            "species": "Kopek",
            "urgency": "Orta",
            "complaint": "Topallama",
        },
    )
    client.post(
        "/triage",
        json={
            "patient_name": "Limon",
            "species": "Kedi",
            "urgency": "Dusuk",
            "complaint": "Kontrol",
        },
    )

    # Acil vaka kuyrugun basina (1. siraya) gecmeli
    urgent_response = client.post(
        "/triage",
        json={
            "patient_name": "Zeytin",
            "species": "Kopek",
            "urgency": "Acil",
            "complaint": "Travma",
        },
    )
    assert urgent_response.status_code == 201
    assert urgent_response.json()["assignment"] == "queue"
    assert urgent_response.json()["position"] == 1

    state = client.get("/clinic-state").json()
    assert [item["patient_name"] for item in state["queue"]] == [
        "Zeytin",
        "Max",
        "Limon",
    ]
    assert [item["position"] for item in state["queue"]] == [1, 2, 3]
