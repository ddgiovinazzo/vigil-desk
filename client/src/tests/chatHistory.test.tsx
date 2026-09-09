import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, test, vi } from "vitest";
import App from "../App";
import { jsonResponse, stubFetch } from "./helpers";

afterEach(() => {
  vi.unstubAllGlobals();
  localStorage.clear();
});

const TICKETS = [
  {
    id: 1,
    requester_name: "Dave",
    requester_email: "dave@test.com",
    title: "VPN ticket",
    description: "VPN issue",
    status: "open",
    priority: "medium",
    category: "IT Support",
    ticket_number: "T-101",
    sla_minutes_remaining: 30,
    created_at: "2026-08-03T00:00:00",
  },
];

const INITIAL_CONVERSATIONS = [
  {
    id: 10,
    title: "PTO Rollover Questions",
    created_at: new Date(Date.now() - 3600000).toISOString(),
    updated_at: new Date(Date.now() - 3600000).toISOString(),
    message_count: 2,
    last_message: "Here are the PTO rules",
  },
  {
    id: 20,
    title: "Medical Card Replacement",
    created_at: new Date(Date.now() - 7200000).toISOString(),
    updated_at: new Date(Date.now() - 7200000).toISOString(),
    message_count: 4,
    last_message: "Call Anthem at 1-800...",
  },
];

function renderAuthed(extraRoutes: Parameters<typeof stubFetch>[0] = {}) {
  localStorage.setItem("apexcare_token", "jwt-123");
  stubFetch({
    "GET /api/auth/me": () =>
      jsonResponse({
        id: 1,
        email: "me@test.com",
        full_name: "Alexandra Vance",
        department: "HR Operations",
        role_title: "Lead Support Specialist",
      }),
    "GET /api/tickets": () => jsonResponse(TICKETS),
    "GET /api/conversations": () => jsonResponse(INITIAL_CONVERSATIONS),
    ...extraRoutes,
  });
  return render(<App />);
}

test("opens Chat History view and displays past conversations", async () => {
  renderAuthed();

  expect(await screen.findByText(/I'm Pip, your ApexCare/i)).toBeInTheDocument();

  // Click the Chat History button in the Pip header
  const historyBtn = screen.getByRole("button", { name: /chat history/i });
  await userEvent.click(historyBtn);

  // Verifies the Chat History header and conversation items are displayed
  expect(await screen.findByText("Chat History")).toBeInTheDocument();
  expect(screen.getByText("PTO Rollover Questions")).toBeInTheDocument();
  expect(screen.getByText("Medical Card Replacement")).toBeInTheDocument();
});

test("renames a conversation title with the edit button", async () => {
  let patchedTitle = "";
  renderAuthed({
    "PATCH /api/conversations/10": async (init) => {
      const body = JSON.parse(init?.body as string);
      patchedTitle = body.title;
      return jsonResponse({ id: 10, title: body.title, updated_at: new Date().toISOString() });
    },
  });

  // Open Chat History
  const historyBtn = await screen.findByRole("button", { name: /chat history/i });
  await userEvent.click(historyBtn);

  expect(await screen.findByText("PTO Rollover Questions")).toBeInTheDocument();

  // Click the rename button for PTO Rollover Questions
  const editBtn = screen.getByRole("button", { name: /rename pto rollover questions/i });
  await userEvent.click(editBtn);

  // Edit the input text
  const input = screen.getByDisplayValue("PTO Rollover Questions");
  await userEvent.clear(input);
  await userEvent.type(input, "Updated PTO Policies");

  // Save the new title
  const saveBtn = screen.getByRole("button", { name: /save title/i });
  await userEvent.click(saveBtn);

  // Verify updated in UI and backend call was made
  await waitFor(() => {
    expect(screen.getByText("Updated PTO Policies")).toBeInTheDocument();
  });
  expect(patchedTitle).toBe("Updated PTO Policies");
});

test("deletes a conversation with confirmation", async () => {
  let deletedId: number | null = null;
  renderAuthed({
    "DELETE /api/conversations/20": () => {
      deletedId = 20;
      return jsonResponse({ success: true, id: 20 });
    },
  });

  // Open Chat History
  const historyBtn = await screen.findByRole("button", { name: /chat history/i });
  await userEvent.click(historyBtn);

  expect(await screen.findByText("Medical Card Replacement")).toBeInTheDocument();

  // Click delete button for Medical Card Replacement
  const deleteBtn = screen.getByRole("button", { name: /delete medical card replacement/i });
  await userEvent.click(deleteBtn);

  // Confirmation prompt appears
  expect(screen.getByText("Delete this chat?")).toBeInTheDocument();

  // Confirm delete
  const confirmBtn = screen.getByRole("button", { name: /^delete$/i });
  await userEvent.click(confirmBtn);

  // Verify conversation is removed from list
  await waitFor(() => {
    expect(screen.queryByText("Medical Card Replacement")).not.toBeInTheDocument();
  });
  expect(deletedId).toBe(20);
});

test("selecting a past conversation loads its message history back into the chat", async () => {
  renderAuthed({
    "GET /api/conversations/10/messages": () =>
      jsonResponse({
        conversation: { id: 10, title: "PTO Rollover Questions", created_at: "2026-08-01" },
        messages: [
          { id: 101, role: "user", content: "How many PTO days roll over?", created_at: "2026-08-01T10:00:00" },
          { id: 102, role: "assistant", content: "You may roll over up to 5 days.", created_at: "2026-08-01T10:01:00" },
        ],
        runs: [],
      }),
  });

  // Open Chat History
  const historyBtn = await screen.findByRole("button", { name: /chat history/i });
  await userEvent.click(historyBtn);

  // Click on the conversation
  const convItem = await screen.findByText("PTO Rollover Questions");
  await userEvent.click(convItem);

  // Verify it navigated back to the chat view and loaded the messages
  expect(await screen.findByText("How many PTO days roll over?")).toBeInTheDocument();
  expect(screen.getByText("You may roll over up to 5 days.")).toBeInTheDocument();

  // Verify active thread indicator in subtitle strip
  expect(screen.getByText("PTO Rollover Questions")).toBeInTheDocument();
});

test("starting a new conversation from Chat History view switches to fresh chat", async () => {
  renderAuthed({
    "GET /api/conversations/10/messages": () =>
      jsonResponse({
        conversation: { id: 10, title: "PTO Rollover Questions", created_at: "2026-08-01" },
        messages: [
          { id: 101, role: "user", content: "How many PTO days roll over?", created_at: "2026-08-01T10:00:00" },
          { id: 102, role: "assistant", content: "You may roll over up to 5 days.", created_at: "2026-08-01T10:01:00" },
        ],
        runs: [],
      }),
  });

  // Open Chat History
  const historyBtn = await screen.findByRole("button", { name: /chat history/i });
  await userEvent.click(historyBtn);

  // Load old conversation
  await userEvent.click(await screen.findByText("PTO Rollover Questions"));
  expect(await screen.findByText("How many PTO days roll over?")).toBeInTheDocument();

  // Re-open Chat History and click "+ New Chat"
  await userEvent.click(screen.getByRole("button", { name: /chat history/i }));
  const newChatBtn = await screen.findByRole("button", { name: /create new chat/i });
  await userEvent.click(newChatBtn);

  // Verifies it returned to fresh chat greeting and cleared thread title strip
  expect(await screen.findByText(/I'm Pip, your ApexCare/i)).toBeInTheDocument();
  expect(screen.queryByText("How many PTO days roll over?")).not.toBeInTheDocument();
  expect(screen.queryByText("All Chats")).not.toBeInTheDocument();
});

