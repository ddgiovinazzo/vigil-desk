import { render, screen, waitFor } from "@testing-library/react";
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
  email: "specialist@apexcare.tech",
  full_name: "Sarah Specialist",
  department: "HR Operations",
  role_title: "Support Specialist",
  company_name: "ApexCare",
};

const sampleTicket = {
  id: 10,
  ticket_number: "APX-1010",
  user_id: 1,
  requester_name: "Marcus Vance",
  requester_email: "marcus@apexcare.tech",
  requester_department: "Engineering",
  title: "Parental Leave Questions",
  description: "How many weeks of paid parental leave do we get?",
  status: "open",
  priority: "high",
  category: "HR & Benefits",
  channel: "Workday Portal",
  sla_minutes_remaining: 120,
  created_at: "2026-09-08T12:00:00Z",
};

test("human user can create a ticket via '+ New Ticket' modal", async () => {
  localStorage.setItem("vigil_token", "jwt-test");

  const createdTicket = {
    ...sampleTicket,
    id: 11,
    ticket_number: "APX-1011",
    title: "New Ergonomic Chair Request",
    description: "Requesting adjustable lumbar ergonomic chair for home office.",
  };

  let postedBody: any = null;

  stubFetch({
    "GET /api/auth/me": () => jsonResponse(mockUser),
    "GET /api/tickets": () => jsonResponse([sampleTicket]),
    "POST /api/tickets": (init) => {
      postedBody = JSON.parse(init?.body as string);
      return jsonResponse(createdTicket, 201);
    },
  });

  render(<App />);

  // Wait for initial ticket to appear
  expect((await screen.findAllByText("Parental Leave Questions")).length).toBeGreaterThan(0);

  // Click "+ New Ticket" button
  const newTicketBtn = screen.getByRole("button", { name: /\+ New Ticket/i });
  await userEvent.click(newTicketBtn);

  // Modal dialog should be open
  expect(screen.getByRole("dialog")).toBeInTheDocument();
  expect(screen.getByText("Create New Support Ticket")).toBeInTheDocument();

  // Fill in title and description
  const titleInput = screen.getByLabelText(/ticket title/i);
  const descInput = screen.getByLabelText(/description/i);

  await userEvent.type(titleInput, "New Ergonomic Chair Request");
  await userEvent.type(descInput, "Requesting adjustable lumbar ergonomic chair for home office.");

  // Submit form
  const submitBtn = screen.getByRole("button", { name: /create ticket/i });
  await userEvent.click(submitBtn);

  // Verify POST payload and new ticket in queue
  await waitFor(() => {
    expect(postedBody).toMatchObject({
      title: "New Ergonomic Chair Request",
      description: "Requesting adjustable lumbar ergonomic chair for home office.",
    });
  });

  // Modal should close and new ticket should be in the queue
  expect((await screen.findAllByText("New Ergonomic Chair Request")).length).toBeGreaterThan(0);
});

test("human user can edit a ticket via 'Edit' button and modal", async () => {
  localStorage.setItem("vigil_token", "jwt-test");

  let patchedBody: any = null;

  stubFetch({
    "GET /api/auth/me": () => jsonResponse(mockUser),
    "GET /api/tickets": () => jsonResponse([sampleTicket]),
    "PATCH /api/tickets/10": (init) => {
      patchedBody = JSON.parse(init?.body as string);
      return jsonResponse({
        ...sampleTicket,
        title: "Updated Parental Leave Policy Inquiry",
        priority: "urgent",
      });
    },
  });

  render(<App />);

  expect((await screen.findAllByText("Parental Leave Questions")).length).toBeGreaterThan(0);

  // Click Edit button in workbench
  const editBtn = screen.getByRole("button", { name: /edit/i });
  await userEvent.click(editBtn);

  expect(screen.getByRole("dialog")).toBeInTheDocument();
  expect(screen.getByText(/edit ticket apx-1010/i)).toBeInTheDocument();

  // Change title and priority
  const titleInput = screen.getByLabelText(/ticket title/i);
  await userEvent.clear(titleInput);
  await userEvent.type(titleInput, "Updated Parental Leave Policy Inquiry");

  const prioritySelect = screen.getByLabelText(/priority/i);
  await userEvent.selectOptions(prioritySelect, "urgent");

  // Save changes
  const saveBtn = screen.getByRole("button", { name: /save changes/i });
  await userEvent.click(saveBtn);

  await waitFor(() => {
    expect(patchedBody).toMatchObject({
      title: "Updated Parental Leave Policy Inquiry",
      priority: "urgent",
    });
  });

  // Updated title should now appear
  expect((await screen.findAllByText("Updated Parental Leave Policy Inquiry")).length).toBeGreaterThan(0);
});

test("human user can delete a ticket via 'Delete' button with confirmation", async () => {
  localStorage.setItem("vigil_token", "jwt-test");

  let deleteCalled = false;

  stubFetch({
    "GET /api/auth/me": () => jsonResponse(mockUser),
    "GET /api/tickets": () => jsonResponse([sampleTicket]),
    "DELETE /api/tickets/10": () => {
      deleteCalled = true;
      return jsonResponse({ success: true, message: "Ticket #10 deleted successfully." });
    },
  });

  render(<App />);

  expect((await screen.findAllByText("Parental Leave Questions")).length).toBeGreaterThan(0);

  // Click Delete button in workbench
  const deleteBtn = screen.getByRole("button", { name: /delete/i });
  await userEvent.click(deleteBtn);

  // Confirmation modal dialog should appear
  expect(screen.getByRole("dialog")).toBeInTheDocument();
  expect(screen.getByText(/delete ticket\?/i)).toBeInTheDocument();

  // Click Delete Permanently button
  const confirmBtn = screen.getByRole("button", { name: /delete permanently/i });
  await userEvent.click(confirmBtn);

  await waitFor(() => {
    expect(deleteCalled).toBe(true);
  });

  // Ticket should be gone from the document
  await waitFor(() => {
    expect(screen.queryByText("Parental Leave Questions")).not.toBeInTheDocument();
  });
});
