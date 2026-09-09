import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, test, vi } from "vitest";
import App from "../App";
import { jsonResponse, stubFetch } from "./helpers";

afterEach(() => {
  vi.unstubAllGlobals();
  localStorage.clear();
});

const mockUser = {
  id: 1,
  email: "alexandra.vance@apexcare.tech",
  full_name: "Alexandra Vance",
  department: "HR Operations",
  role_title: "Lead Support Specialist",
  company_name: "ApexCare",
};

const sampleTicket = {
  id: 42,
  ticket_number: "APX-2042",
  user_id: 1,
  requester_name: "Sarah Connor",
  requester_email: "sarah@apexcare.tech",
  requester_department: "Security Operations",
  title: "FSA Rollover Inquiry",
  description: "What is the deadline and rollover limit for healthcare FSA this calendar year?",
  status: "open",
  priority: "medium",
  category: "HR & Benefits",
  channel: "Email Intake",
  sla_minutes_remaining: 180,
  created_at: "2026-09-08T12:00:00Z",
};

function setupMobileApp() {
  localStorage.setItem("vigil_token", "jwt-mobile-test");

  stubFetch({
    "GET /api/auth/me": () => jsonResponse(mockUser),
    "GET /api/tickets": () => jsonResponse([sampleTicket]),
    "GET /api/conversations": () => jsonResponse([]),
    "GET /api/knowledge-base": () => jsonResponse([]),
    "GET /api/knowledge/documents": () => jsonResponse([]),
    "GET /api/runs": () => jsonResponse({ runs: [] }),
    "GET /api/runs?page=1&per_page=1": () => jsonResponse({ runs: [] }),
    "GET /api/runs/stats": () => jsonResponse({ total_runs: 0, latency_buckets: [], tool_counts: [] }),
  });

  return render(<App />);
}

test("mobile master-detail navigation: selecting ticket opens detail, back returns to list", async () => {
  setupMobileApp();

  // Wait for ticket to appear in queue
  const ticketCards = await screen.findAllByText("APX-2042");
  expect(ticketCards.length).toBeGreaterThan(0);

  // Select ticket to open detail view
  await userEvent.click(ticketCards[0]);

  // Detail view should be visible with back button
  const backBtn = await screen.findByRole("button", { name: /back to tickets/i });
  expect(backBtn).toBeInTheDocument();
  expect(screen.getAllByText("Sarah Connor").length).toBeGreaterThan(0);

  // Tap Back button
  await userEvent.click(backBtn);

  // Should return to ticket list
  expect((await screen.findAllByText("APX-2042")).length).toBeGreaterThan(0);
});

test("mobile bottom navigation switches between views", async () => {
  setupMobileApp();

  // Verify bottom nav exists
  const bottomNav = await screen.findByRole("navigation", { name: /mobile navigation/i });
  expect(bottomNav).toBeInTheDocument();

  // Tap Pip AI tab
  const pipAiTab = within(bottomNav).getByRole("button", { name: /pip ai/i });
  await userEvent.click(pipAiTab);

  // Full Pip Assistant should be active
  expect(await screen.findByText("Pip Assistant")).toBeInTheDocument();

  // Tap Knowledge tab
  const knowledgeTab = within(bottomNav).getByRole("button", { name: /knowledge/i });
  await userEvent.click(knowledgeTab);
  expect(await screen.findByText(/Policy Knowledge Base/i)).toBeInTheDocument();

  // Tap Audit tab
  const auditTab = within(bottomNav).getByRole("button", { name: /audit/i });
  await userEvent.click(auditTab);
  expect(await screen.findByText(/agent run audit & observability/i)).toBeInTheDocument();

  // Tap Tickets tab to return
  const ticketsTab = within(bottomNav).getByRole("button", { name: /tickets/i });
  await userEvent.click(ticketsTab);
  expect((await screen.findAllByText("APX-2042")).length).toBeGreaterThan(0);
});

test("mobile contextual Pip drawer opens on 'Draft with Pip' and can be closed", async () => {
  setupMobileApp();

  // Open the ticket detail
  const ticketCards = await screen.findAllByText("APX-2042");
  await userEvent.click(ticketCards[0]);

  // Click "Draft with Pip" button
  const draftWithPipBtn = await screen.findByRole("button", { name: /draft with pip/i });
  await userEvent.click(draftWithPipBtn);

  // Contextual drawer dialog should open
  const drawer = await screen.findByRole("dialog");
  const closeDrawerBtn = within(drawer).getByRole("button", { name: /close drawer/i });
  expect(closeDrawerBtn).toBeInTheDocument();
  expect(within(drawer).getByText(/active:/i)).toBeInTheDocument();
  expect(within(drawer).getByText(/APX-2042 - FSA Rollover Inquiry/i)).toBeInTheDocument();

  // Close the drawer
  await userEvent.click(closeDrawerBtn);
  await waitFor(() => {
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});

test("mobile profile drawer opens from header and shows specialist info", async () => {
  setupMobileApp();

  // Click mobile avatar in header
  const openMenuBtn = await screen.findByRole("button", { name: /open user menu/i });
  await userEvent.click(openMenuBtn);

  // Profile drawer should appear
  expect(await screen.findByText("Specialist Profile")).toBeInTheDocument();
  expect(screen.getAllByText("Alexandra Vance").length).toBeGreaterThan(0);
  expect(screen.getByText("alexandra.vance@apexcare.tech")).toBeInTheDocument();
  expect(screen.getAllByText("HR Operations").length).toBeGreaterThan(0);

  // Close profile drawer
  const closeMenuBtn = screen.getByRole("button", { name: /close profile menu/i });
  await userEvent.click(closeMenuBtn);
  await waitFor(() => {
    expect(screen.queryByRole("button", { name: /close profile menu/i })).not.toBeInTheDocument();
  });
});

test("mobile contextual drawer allows tapping 'Apply Draft' to apply draft and dismiss drawer", async () => {
  const ticketWithDraft = {
    ...sampleTicket,
    draft_reply: "Hi Sarah,\n\nThe FSA rollover maximum is $640.\n\nBest regards,\nHR Support Team",
    status: "draft_pending",
  };

  localStorage.setItem("vigil_token", "jwt-mobile-test");
  stubFetch({
    "GET /api/auth/me": () => jsonResponse(mockUser),
    "GET /api/tickets": () => jsonResponse([ticketWithDraft]),
    "GET /api/conversations": () => jsonResponse([]),
    "GET /api/knowledge-base": () => jsonResponse([]),
    "GET /api/runs?page=1&per_page=1": () => jsonResponse({ runs: [] }),
    "GET /api/stats": () =>
      jsonResponse({
        total_runs: 10,
        active_tickets: 1,
        success_rate: 90,
        tool_counts: {},
        latency_buckets: {},
        daily_trends: [],
      }),
  });

  render(<App />);

  // Open ticket detail
  const ticketCards = await screen.findAllByText("APX-2042");
  await userEvent.click(ticketCards[0]);

  // Click "Draft with Pip" to open mobile drawer
  const draftWithPipBtn = await screen.findByRole("button", { name: /draft with pip/i });
  await userEvent.click(draftWithPipBtn);

  // Drawer dialog mounts and shows "Apply Draft" button
  const drawer = await screen.findByRole("dialog");
  const applyDraftBtn = within(drawer).getByRole("button", { name: /apply draft/i });
  expect(applyDraftBtn).toBeInTheDocument();

  // Click "Apply Draft"
  await userEvent.click(applyDraftBtn);

  // Drawer should close
  await waitFor(() => {
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  // Ticket workbench reply textarea should contain the draft
  const replyTextarea = screen.getByPlaceholderText(/Write a reply to Sarah/i) as HTMLTextAreaElement;
  expect(replyTextarea.value).toContain("The FSA rollover maximum is $640");
});

