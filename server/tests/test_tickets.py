from server.models import Ticket, db
from server.tools.ticket_tools import create_ticket, list_tickets, update_ticket, delete_ticket

def test_ticket_crud_routes(client, auth_headers):
    from server.models import User
    user = User.query.filter_by(email="me@test.com").first()
    ticket = Ticket(
        user_id=user.id,
        title="Broken Monitor",
        description="External display stays black on USB-C",
        priority="high",
        category="IT",
    )
    db.session.add(ticket)
    db.session.commit()
    ticket_id = ticket.id

    # 1. List tickets via GET /api/tickets
    res = client.get("/api/tickets", headers=auth_headers)
    assert res.status_code == 200
    tickets = res.get_json()
    assert len(tickets) >= 1
    assert any(t["id"] == ticket_id for t in tickets)

    # 2. Filter tickets by status
    res = client.get("/api/tickets?status=open", headers=auth_headers)
    assert res.status_code == 200
    assert len(res.get_json()) >= 1

    # 3. Update ticket via PATCH /api/tickets/<id>
    res = client.patch(
        f"/api/tickets/{ticket_id}",
        headers=auth_headers,
        json={"status": "resolved", "priority": "low"},
    )
    assert res.status_code == 200
    updated = res.get_json()
    assert updated["status"] == "resolved"
    assert updated["priority"] == "low"


def test_reseed_clears_audit_logs(client, auth_headers):
    from server.models import Conversation, Message, Run, RunStep, PendingAction, User
    # Get current user from db
    user = User.query.filter_by(email="me@test.com").first()
    
    # Setup a conversation, message, run, step, and pending action for this user
    conv = Conversation(user_id=user.id, title="Test audit logs")
    db.session.add(conv)
    db.session.flush()
    conv_id = conv.id
    
    msg = Message(conversation_id=conv_id, role="user", content="help")
    db.session.add(msg)
    db.session.flush()
    
    run = Run(conversation_id=conv_id, user_message_id=msg.id, status="running")
    db.session.add(run)
    db.session.flush()
    run_id = run.id
    
    step = RunStep(run_id=run_id, seq=1, kind="llm_call")
    db.session.add(step)
    
    pending = PendingAction(run_id=run_id, tool_name="escalate", arguments={})
    db.session.add(pending)
    
    db.session.commit()
    
    # Verify records exist
    assert Conversation.query.filter_by(user_id=user.id).count() == 1
    assert Message.query.filter_by(conversation_id=conv_id).count() == 1
    assert Run.query.filter_by(conversation_id=conv_id).count() == 1
    assert RunStep.query.filter_by(run_id=run_id).count() == 1
    assert PendingAction.query.filter_by(run_id=run_id).count() == 1
    
    # Call the reset route
    res = client.post("/api/tickets/reset", headers=auth_headers)
    assert res.status_code == 200
    
    # Verify everything was deleted
    assert Conversation.query.filter_by(user_id=user.id).count() == 0
    assert Message.query.filter_by(conversation_id=conv_id).count() == 0
    assert Run.query.filter_by(conversation_id=conv_id).count() == 0
    assert RunStep.query.filter_by(run_id=run_id).count() == 0
    assert PendingAction.query.filter_by(run_id=run_id).count() == 0
    
    # Verify tickets were re-seeded (at least one ticket should exist)
    tickets = Ticket.query.filter_by(user_id=user.id).all()
    assert len(tickets) > 0


def test_patch_resolution_notes_via_rest(client, auth_headers):
    from server.models import User
    user = User.query.filter_by(email="me@test.com").first()
    ticket = Ticket(
        user_id=user.id,
        title="VPN down",
        description="Can't connect to VPN",
    )
    db.session.add(ticket)
    db.session.commit()
    ticket_id = ticket.id

    res = client.patch(
        f"/api/tickets/{ticket_id}",
        headers=auth_headers,
        json={"status": "resolved", "resolution_notes": "Reset VPN token, reconnect worked."},
    )
    assert res.status_code == 200
    assert res.get_json()["resolution_notes"] == "Reset VPN token, reconnect worked."

    res = client.get("/api/tickets", headers=auth_headers)
    ticket_data = next(t for t in res.get_json() if t["id"] == ticket_id)
    assert ticket_data["resolution_notes"] == "Reset VPN token, reconnect worked."


def test_agent_update_ticket_stores_resolution_notes(app):
    from flask import g
    from server.models import User
    with app.test_request_context():
        user = User(email="agent-tool@test.com", password_hash="x")
        db.session.add(user)
        db.session.commit()
        g.user = user

        created = create_ticket(title="Printer jam", description="Paper stuck in tray 2")
        ticket_id = created["ticket"]["id"]

        result = update_ticket(
            ticket_id=ticket_id,
            status="resolved",
            resolution_notes="Cleared jam, replaced pickup roller.",
        )
        assert result["success"] is True

        ticket = db.session.get(Ticket, ticket_id)
        assert ticket.status == "resolved"
        assert ticket.resolution_notes == "Cleared jam, replaced pickup roller."


def test_create_ticket_route(client, auth_headers):
    payload = {
        "title": "Need 4K Monitor Stand",
        "description": "Ergonomic dual monitor arm for sit-stand desk setup.",
        "category": "Facilities & Office",
        "priority": "low",
        "channel": "Slack HR Connect",
        "requester_name": "Alice Wonder",
        "requester_email": "alice@apexcare.tech",
        "requester_department": "Design",
        "sla_minutes_remaining": 360,
    }
    res = client.post("/api/tickets", headers=auth_headers, json=payload)
    assert res.status_code == 201
    data = res.get_json()
    assert data["title"] == "Need 4K Monitor Stand"
    assert data["description"] == "Ergonomic dual monitor arm for sit-stand desk setup."
    assert data["category"] == "Facilities & Office"
    assert data["priority"] == "low"
    assert data["requester_name"] == "Alice Wonder"
    assert data["ticket_number"].startswith("APX-")

    # Verify ticket is returned in user's ticket list
    list_res = client.get("/api/tickets", headers=auth_headers)
    assert any(t["id"] == data["id"] for t in list_res.get_json())


def test_create_ticket_validation(client, auth_headers):
    # Missing title
    res1 = client.post("/api/tickets", headers=auth_headers, json={"description": "No title here"})
    assert res1.status_code == 400
    assert "Title is required" in res1.get_json()["error"]

    # Missing description
    res2 = client.post("/api/tickets", headers=auth_headers, json={"title": "No desc here"})
    assert res2.status_code == 400
    assert "Description is required" in res2.get_json()["error"]


def test_delete_ticket_route(client, auth_headers):
    # Create a ticket first
    create_res = client.post(
        "/api/tickets",
        headers=auth_headers,
        json={"title": "To be deleted", "description": "Temporary ticket"},
    )
    assert create_res.status_code == 201
    ticket_id = create_res.get_json()["id"]

    # Delete the ticket
    del_res = client.delete(f"/api/tickets/{ticket_id}", headers=auth_headers)
    assert del_res.status_code == 200
    assert del_res.get_json()["success"] is True

    # Verify it no longer exists
    get_res = client.get(f"/api/tickets/{ticket_id}", headers=auth_headers)
    assert get_res.status_code == 404

    # Second delete returns 404
    del_res2 = client.delete(f"/api/tickets/{ticket_id}", headers=auth_headers)
    assert del_res2.status_code == 404


def test_ticket_isolation_between_users(client, auth_headers):
    # Create ticket under me@test.com
    create_res = client.post(
        "/api/tickets",
        headers=auth_headers,
        json={"title": "User A ticket", "description": "Secret issue"},
    )
    t_id = create_res.get_json()["id"]

    # Register and login User B
    client.post("/api/auth/register", json={"email": "other@test.com", "password": "password123"})
    login_b = client.post("/api/auth/login", json={"email": "other@test.com", "password": "password123"})
    token_b = login_b.get_json()["token"]
    headers_b = {"Authorization": f"Bearer {token_b}"}

    # User B cannot read, update, or delete User A's ticket
    assert client.get(f"/api/tickets/{t_id}", headers=headers_b).status_code == 404
    assert client.patch(f"/api/tickets/{t_id}", headers=headers_b, json={"title": "Hacked"}).status_code == 404
    assert client.delete(f"/api/tickets/{t_id}", headers=headers_b).status_code == 404


