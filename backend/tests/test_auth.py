from fastapi.testclient import TestClient
from sqlalchemy import text

from tests.conftest import PASSWORD

CREDENTIALS = {"username": "tester", "password": PASSWORD}


def test_health(client: TestClient) -> None:
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_status_before_and_after_setup(client: TestClient) -> None:
    assert client.get("/api/auth/status").json() == {"configured": False, "authenticated": False, "username": None}
    client.post("/api/auth/setup", json=CREDENTIALS)
    assert client.get("/api/auth/status").json() == {"configured": True, "authenticated": True, "username": "tester"}
    client.cookies.clear()
    assert client.get("/api/auth/status").json() == {"configured": True, "authenticated": False, "username": None}


def test_setup_sets_httponly_lax_cookie(client: TestClient) -> None:
    response = client.post("/api/auth/setup", json=CREDENTIALS)
    assert response.status_code == 201
    assert response.json() == {"username": "tester"}
    cookie = response.headers["set-cookie"].lower()
    assert "its_me_session=" in cookie and "httponly" in cookie and "samesite=lax" in cookie
    assert "secure" not in cookie.replace("samesite", "")


def test_second_setup_conflicts(client: TestClient) -> None:
    assert client.post("/api/auth/setup", json=CREDENTIALS).status_code == 201
    response = client.post("/api/auth/setup", json={"username": "other", "password": "another long password"})
    assert response.status_code == 409
    assert isinstance(response.json()["detail"], str)


def test_setup_validation(client: TestClient) -> None:
    for body in (
        {"username": "ab", "password": PASSWORD},
        {"username": "bad name!", "password": PASSWORD},
        {"username": "tester", "password": "short"},
        {"username": "tester", "password": "x" * 129},
    ):
        response = client.post("/api/auth/setup", json=body)
        assert response.status_code == 422
        assert isinstance(response.json()["detail"], list)


def test_password_is_hashed(client: TestClient, db_engine) -> None:
    client.post("/api/auth/setup", json=CREDENTIALS)
    with db_engine.connect() as conn:
        stored = conn.execute(text("SELECT password_hash FROM users")).scalar_one()
    assert PASSWORD not in stored
    assert stored.startswith("$argon2")


def test_login_success_and_failure(client: TestClient) -> None:
    client.post("/api/auth/setup", json=CREDENTIALS)
    client.cookies.clear()
    assert client.post("/api/auth/login", json={**CREDENTIALS, "password": "wrong password!"}).status_code == 401
    assert client.post("/api/auth/login", json={"username": "nobody", "password": PASSWORD}).status_code == 401
    assert client.get("/api/attributes").status_code == 401
    response = client.post("/api/auth/login", json=CREDENTIALS)
    assert response.status_code == 200
    assert response.json() == {"username": "tester"}
    assert client.get("/api/attributes").status_code == 200


def test_login_rate_limit(client: TestClient) -> None:
    client.post("/api/auth/setup", json=CREDENTIALS)
    bad = {**CREDENTIALS, "password": "wrong password!"}
    for _ in range(10):
        assert client.post("/api/auth/login", json=bad).status_code == 401
    assert client.post("/api/auth/login", json=bad).status_code == 429
    assert client.post("/api/auth/login", json=CREDENTIALS).status_code == 429


def test_logout_clears_session(auth: TestClient) -> None:
    response = auth.post("/api/auth/logout")
    assert response.status_code == 204
    assert auth.get("/api/attributes").status_code == 401


def test_protected_routes_require_auth(client: TestClient) -> None:
    for method, url in (
        ("get", "/api/attributes"),
        ("post", "/api/attributes"),
        ("patch", "/api/attributes/1"),
        ("delete", "/api/attributes/1"),
        ("get", "/api/attributes/1/entries"),
        ("post", "/api/entries"),
        ("patch", "/api/entries/1"),
        ("delete", "/api/entries/1"),
    ):
        response = client.request(method, url, json={})
        assert response.status_code == 401, (method, url)
        assert "detail" in response.json()


def test_tampered_token_rejected(client: TestClient) -> None:
    client.cookies.set("its_me_session", "not-a-valid-token")
    assert client.get("/api/attributes").status_code == 401
