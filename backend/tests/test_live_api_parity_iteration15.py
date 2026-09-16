"""LIVE API parity checks (auth, schema, vehicles, QR resolve) for NekSathi mobile flows."""

from pathlib import Path
import uuid

import pytest
import requests


def _read_env(key: str) -> str:
    env_file = Path("/app/frontend/.env")
    if not env_file.exists():
        raise RuntimeError("/app/frontend/.env not found")
    for line in env_file.read_text().splitlines():
        if line.startswith(f"{key}="):
            return line.split("=", 1)[1].strip().strip('"')
    raise RuntimeError(f"{key} missing in /app/frontend/.env")


BASE_URL = _read_env("EXPO_PUBLIC_API_URL").rstrip("/")
API = f"{BASE_URL}/api"
DEMO_EMAIL = "demo@neksathi.app"
DEMO_PASSWORD = "demo1234"


@pytest.fixture(scope="module")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="module")
def token(session):
    resp = session.post(
        f"{API}/auth/login",
        json={"email": DEMO_EMAIL, "password": DEMO_PASSWORD},
        timeout=20,
    )
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body.get("access_token")
    return body["access_token"]


@pytest.fixture(scope="module")
def authed(session, token):
    session.headers.update({"Authorization": f"Bearer {token}"})
    return session


@pytest.fixture(scope="module")
def created_vehicle_ids():
    # vehicle cleanup IDs created during this suite
    return []


# Auth module
def test_auth_login_and_me(authed):
    me = authed.get(f"{API}/auth/me", timeout=20)
    assert me.status_code == 200, me.text
    data = me.json()
    assert data.get("email") == DEMO_EMAIL


def test_auth_me_requires_token(session):
    me = requests.get(f"{API}/auth/me", timeout=20)
    assert me.status_code == 401


# OpenAPI schema module
def test_openapi_contains_vehicle_rules():
    resp = requests.get(f"{BASE_URL}/openapi.json", timeout=20)
    assert resp.status_code == 200, resp.text
    schemas = resp.json().get("components", {}).get("schemas", {})
    vehicle_in = schemas.get("VehicleIn", {})
    props = vehicle_in.get("properties", {})
    assert "make_model" in props
    assert "color" in props
    assert "speed_limit_kmh" in props
    assert props.get("vehicle_type", {}).get("enum")


# Vehicles + QR module
def test_create_update_get_vehicle_and_verify_qr(authed, created_vehicle_ids):
    plate = f"MH{uuid.uuid4().hex[:2].upper()}AB{uuid.uuid4().int % 9000 + 1000}"
    create_payload = {
        "number_plate": plate,
        "vehicle_type": "car",
        "make_model": "TEST_PARITY_MODEL",
        "color": "Black",
        "speed_limit_kmh": 60,
    }
    created = authed.post(f"{API}/vehicles", json=create_payload, timeout=20)
    assert created.status_code in (200, 201), created.text
    vehicle = created.json()
    vid = vehicle.get("id")
    created_vehicle_ids.append(vid)
    assert vehicle.get("number_plate") == plate
    assert vehicle.get("qr_id")

    # Create -> GET persistence check
    fetched = authed.get(f"{API}/vehicles/{vid}", timeout=20)
    assert fetched.status_code == 200, fetched.text
    fetched_body = fetched.json()
    assert fetched_body.get("make_model") == "TEST_PARITY_MODEL"
    qr_id = fetched_body.get("qr_id")

    # Update -> GET persistence check
    updated = authed.put(
        f"{API}/vehicles/{vid}",
        json={
            "number_plate": plate,
            "vehicle_type": "bike",
            "make_model": "TEST_PARITY_MODEL_2",
            "color": "Blue",
            "speed_limit_kmh": 50,
        },
        timeout=20,
    )
    assert updated.status_code == 200, updated.text
    assert updated.json().get("qr_id") == qr_id

    fetched2 = authed.get(f"{API}/vehicles/{vid}", timeout=20)
    assert fetched2.status_code == 200
    fetched2_body = fetched2.json()
    assert fetched2_body.get("make_model") == "TEST_PARITY_MODEL_2"
    assert fetched2_body.get("vehicle_type") == "bike"
    assert fetched2_body.get("qr_id") == qr_id

    # Public QR resolver consistency
    public_qr = requests.get(f"{API}/public/qr/{qr_id}", timeout=20)
    assert public_qr.status_code == 200, public_qr.text
    public_body = public_qr.json()
    assert public_body.get("number_plate") == plate


def test_cleanup_created_vehicles_best_effort(authed, created_vehicle_ids):
    # Contract differs by deployment; cleanup is attempted and non-support is surfaced.
    unsupported = 0
    for vid in created_vehicle_ids:
        if not vid:
            continue
        resp = authed.delete(f"{API}/vehicles/{vid}", timeout=20)
        if resp.status_code in (200, 204, 404):
            continue
        if resp.status_code in (405, 422):
            unsupported += 1
            continue
        assert False, f"Unexpected cleanup response for {vid}: {resp.status_code} {resp.text}"
    if created_vehicle_ids:
        assert unsupported in (0, len(created_vehicle_ids))
