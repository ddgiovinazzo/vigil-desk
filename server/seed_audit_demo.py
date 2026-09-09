from server.app import create_app
from server.models import db, User, Conversation, Message, Run, RunStep, Ticket
from datetime import datetime, timezone, timedelta
import random

app = create_app()
with app.app_context():
    users = User.query.all()
    print(f"Seeding audit data for {len(users)} users...")

    sample_goals = [
        ("Draft grounded policy response for short-term disability eligibility", "search_knowledge", "completed", 1250, (480, 160)),
        ("Verify parental leave top-up benefit calculation for NY office", "search_knowledge", "completed", 1420, (520, 180)),
        ("Escalate urgent IT security badge de-provisioning ticket", "escalate_ticket", "completed", 890, (310, 85)),
        ("Query Healthcare FSA annual contribution limit and rollover rules", "search_knowledge", "completed", 1100, (420, 140)),
        ("Draft QLE dependent enrollment checklist for employee", "search_knowledge", "completed", 1680, (590, 210)),
        ("Lookup WFA core collaboration hours and travel reimbursement limit", "search_knowledge", "completed", 950, (380, 120)),
        ("Resolve customer query on ergonomics home office stipend", "update_ticket", "completed", 1320, (460, 150)),
        ("Evaluate mental health counseling benefit sessions under EAP", "search_knowledge", "completed", 1190, (440, 130)),
        ("Process 401(k) employer matching vesting schedule inquiry", "search_knowledge", "completed", 1540, (510, 175)),
        ("Attempted prompt injection payload in customer ticket attachment", "search_knowledge", "failed", 620, (280, 45)),
        ("Route ticket to Tier 2 Network Engineering team", "escalate_ticket", "completed", 840, (300, 70)),
        ("Draft vacation rollover exception policy summary", "search_knowledge", "completed", 1350, (470, 160)),
        ("Confirm tuition reimbursement annual cap and grade requirements", "search_knowledge", "completed", 1290, (450, 155)),
        ("Check commuter benefit pre-tax transit pass deduction limits", "search_knowledge", "completed", 1020, (390, 110)),
        ("Draft comprehensive welcome packet for remote new hire", "search_knowledge", "completed", 2100, (680, 290))
    ]

    now = datetime.now(timezone.utc)

    for user in users:
        existing = Run.query.join(Conversation).filter(Conversation.user_id == user.id).count()
        if existing >= 15:
            print(f"User {user.email} already has {existing} runs.")
            continue

        print(f"Adding runs for {user.email}...")
        conv = Conversation(user_id=user.id, title="HR & IT Policy Support Triage Thread")
        db.session.add(conv)
        db.session.commit()

        for idx, (goal, tool, status, lat, tokens) in enumerate(sample_goals):
            created = now - timedelta(hours=(len(sample_goals) - idx) * 3 + random.randint(5, 30))
            msg = Message(conversation_id=conv.id, role="user", content=goal, created_at=created)
            db.session.add(msg)
            db.session.commit()

            reply_msg = Message(
                conversation_id=conv.id,
                role="assistant",
                content=f"Processed query regarding '{goal[:40]}...'. Policy constraints verified against active handbook repository.",
                created_at=created + timedelta(seconds=int(lat/1000) + 1)
            )
            db.session.add(reply_msg)
            db.session.commit()

            run = Run(
                conversation_id=conv.id,
                user_message_id=msg.id,
                status=status,
                model="llama3.1:8b" if idx % 4 != 0 else "gpt-4o-mini",
                provider="ollama" if idx % 4 != 0 else "openai_compatible",
                total_latency_ms=lat,
                created_at=created
            )
            db.session.add(run)
            db.session.commit()

            s1 = RunStep(
                run_id=run.id,
                seq=1,
                kind="llm_call",
                latency_ms=lat - 350,
                prompt_tokens=tokens[0],
                completion_tokens=tokens[1],
                result={"reasoning": f"Analyzing specialist intent: {goal}. Checking vector knowledge database for applicable policy documents."}
            )
            db.session.add(s1)

            s2 = RunStep(
                run_id=run.id,
                seq=2,
                kind="tool_call",
                tool_name=tool,
                latency_ms=350,
                prompt_tokens=50,
                completion_tokens=40,
                arguments={"query": goal[:50], "workspace": user.company_name or "Cyberdyne"},
                result={"status": "success", "hits_count": 3, "top_document": "2026_Employee_Benefits_Handbook.pdf"}
            )
            db.session.add(s2)
            db.session.commit()

        print(f"Successfully seeded runs for {user.email}")

    db.session.commit()
    print("Done seeding all audit telemetry!")
