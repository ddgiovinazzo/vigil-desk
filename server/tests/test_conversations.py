import pytest
from server.models import Conversation, Message, Run, RunStep, db


def test_list_conversations_empty(client, auth_headers):
    res = client.get("/api/conversations", headers=auth_headers)
    assert res.status_code == 200
    assert res.get_json() == []


def test_create_conversation(client, auth_headers):
    res = client.post("/api/conversations", headers=auth_headers, json={"title": "My Test Chat"})
    assert res.status_code == 201
    data = res.get_json()
    assert data["title"] == "My Test Chat"
    assert "id" in data
    assert data["message_count"] == 0


def test_rename_conversation(client, auth_headers):
    # Create
    create_res = client.post("/api/conversations", headers=auth_headers, json={"title": "Old Name"})
    conv_id = create_res.get_json()["id"]

    # Rename
    patch_res = client.patch(f"/api/conversations/{conv_id}", headers=auth_headers, json={"title": "New Name"})
    assert patch_res.status_code == 200
    assert patch_res.get_json()["title"] == "New Name"

    # Empty rename fails
    bad_res = client.patch(f"/api/conversations/{conv_id}", headers=auth_headers, json={"title": ""})
    assert bad_res.status_code == 400


def test_delete_conversation(client, auth_headers):
    create_res = client.post("/api/conversations", headers=auth_headers, json={"title": "To Delete"})
    conv_id = create_res.get_json()["id"]

    del_res = client.delete(f"/api/conversations/{conv_id}", headers=auth_headers)
    assert del_res.status_code == 200
    assert del_res.get_json()["success"] is True

    # Check it's gone
    list_res = client.get("/api/conversations", headers=auth_headers)
    assert len(list_res.get_json()) == 0


def test_get_conversation_messages(client, auth_headers):
    create_res = client.post("/api/conversations", headers=auth_headers, json={"title": "Message Thread"})
    conv_id = create_res.get_json()["id"]

    # Add a user and assistant message directly
    with client.application.app_context():
        m1 = Message(conversation_id=conv_id, role="user", content="Hello Pip")
        m2 = Message(conversation_id=conv_id, role="assistant", content="Hello Human")
        db.session.add_all([m1, m2])
        db.session.commit()

    res = client.get(f"/api/conversations/{conv_id}/messages", headers=auth_headers)
    assert res.status_code == 200
    data = res.get_json()
    assert data["conversation"]["title"] == "Message Thread"
    assert len(data["messages"]) == 2
    assert data["messages"][0]["content"] == "Hello Pip"
    assert data["messages"][1]["content"] == "Hello Human"


def test_chat_generates_title_and_returns_conv_info(client, auth_headers, monkeypatch):
    # Mock generate to return a canned answer and title
    def fake_generate(messages, tools=None):
        content = messages[-1]["content"]
        if "concise 3 to 5 word title" in content or "concise 3-5 word title" in content:
            return {"content": "PTO Carryover Guidelines"}
        return {"content": "You can carry over up to 5 days of PTO."}

    monkeypatch.setattr("server.routes.generate", fake_generate)

    res = client.post(
        "/api/chat",
        headers=auth_headers,
        json={"message": "Can you explain how PTO rollover works for next year?"},
    )
    assert res.status_code == 200
    data = res.get_json()
    assert "conversation_id" in data
    assert data["conversation_title"] == "PTO Carryover Guidelines"

    # Verify conversation in list
    convs_res = client.get("/api/conversations", headers=auth_headers)
    convs = convs_res.get_json()
    assert len(convs) == 1
    assert convs[0]["title"] == "PTO Carryover Guidelines"
