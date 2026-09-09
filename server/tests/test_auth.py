def test_register_login_roundtrip(client):
    resp = client.post(
        "/api/auth/register", json={"email": "a@b.com", "password": "password123"}
    )
    assert resp.status_code == 201
    resp = client.post(
        "/api/auth/login", json={"email": "a@b.com", "password": "password123"}
    )
    assert resp.status_code == 200
    assert "token" in resp.get_json()


def test_register_rejects_short_password(client):
    resp = client.post("/api/auth/register", json={"email": "a@b.com", "password": "short"})
    assert resp.status_code == 400


def test_register_duplicate_email(client):
    client.post("/api/auth/register", json={"email": "a@b.com", "password": "password123"})
    resp = client.post(
        "/api/auth/register", json={"email": "a@b.com", "password": "password123"}
    )
    assert resp.status_code == 409


def test_login_wrong_password(client):
    client.post("/api/auth/register", json={"email": "a@b.com", "password": "password123"})
    resp = client.post("/api/auth/login", json={"email": "a@b.com", "password": "nope-nope"})
    assert resp.status_code == 401


def test_require_auth(app, client):
    from flask import g

    from server.auth import require_auth

    @app.route("/api/probe")
    @require_auth
    def probe():
        return {"email": g.user.email}

    client.post("/api/auth/register", json={"email": "a@b.com", "password": "password123"})
    token = client.post(
        "/api/auth/login", json={"email": "a@b.com", "password": "password123"}
    ).get_json()["token"]

    assert client.get("/api/probe").status_code == 401
    assert (
        client.get("/api/probe", headers={"Authorization": "Bearer garbage"}).status_code
        == 401
    )
    ok = client.get("/api/probe", headers={"Authorization": f"Bearer {token}"})
    assert ok.status_code == 200
    assert ok.get_json()["email"] == "a@b.com"


def test_login_reports_admin_flag(app, client):
    app.config["ADMIN_EMAILS"] = {"boss@test.com"}
    for email in ("boss@test.com", "pleb@test.com"):
        client.post("/api/auth/register", json={"email": email, "password": "password123"})
    boss = client.post(
        "/api/auth/login", json={"email": "boss@test.com", "password": "password123"}
    ).get_json()
    pleb = client.post(
        "/api/auth/login", json={"email": "pleb@test.com", "password": "password123"}
    ).get_json()
    assert boss["is_admin"] is True and boss["email"] == "boss@test.com"
    assert pleb["is_admin"] is False


def test_register_and_login_with_company_name(client):
    # 1. Custom company name
    resp = client.post(
        "/api/auth/register",
        json={
            "email": "engineer@acme.com",
            "password": "password123",
            "full_name": "Wile E. Coyote",
            "company_name": "Acme Corp",
        },
    )
    assert resp.status_code == 201
    data = resp.get_json()
    assert data["company_name"] == "Acme Corp"

    # Login returns company_name
    login_resp = client.post(
        "/api/auth/login",
        json={"email": "engineer@acme.com", "password": "password123"},
    )
    assert login_resp.status_code == 200
    login_data = login_resp.get_json()
    assert login_data["company_name"] == "Acme Corp"
    token = login_data["token"]

    # /api/auth/me returns company_name
    me_resp = client.get(
        "/api/auth/me", headers={"Authorization": f"Bearer {token}"}
    )
    assert me_resp.status_code == 200
    assert me_resp.get_json()["company_name"] == "Acme Corp"

    # 2. Default fallback company name
    default_resp = client.post(
        "/api/auth/register",
        json={"email": "default@test.com", "password": "password123"},
    )
    assert default_resp.status_code == 201
    assert default_resp.get_json()["company_name"] == "ApexCare"
