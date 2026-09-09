import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AuthPage, formatDemoEmail, getDemoParamsFromUrl } from "../auth/AuthPage";
import { jsonResponse, stubFetch } from "./helpers";

describe("Demo URL parameters and dynamic customization", () => {
  const originalLocation = window.location;

  afterEach(() => {
    vi.unstubAllGlobals();
    localStorage.clear();
    // Restore window.location
    delete (window as any).location;
    window.location = originalLocation;
  });

  function setWindowSearch(search: string) {
    delete (window as any).location;
    window.location = {
      ...originalLocation,
      search,
    } as any;
  }

  it("formatDemoEmail sanitizes names and formats {first}.{last}@{company}.tech", () => {
    expect(formatDemoEmail("Alexandra", "Vance")).toBe("alexandra.vance@apexcare.tech");
    expect(formatDemoEmail("Sarah", "Connor")).toBe("sarah.connor@apexcare.tech");
    expect(formatDemoEmail("Sarah", "Connor", "Cyberdyne")).toBe("sarah.connor@cyberdyne.tech");
    expect(formatDemoEmail("Bruce", "Wayne", "Wayne Enterprises")).toBe("bruce.wayne@wayneenterprises.tech");
    expect(formatDemoEmail("Jean-Luc", "Picard", "Starfleet")).toBe("jeanluc.picard@starfleet.tech");
    expect(formatDemoEmail("", "", "")).toBe("alexandra.vance@apexcare.tech");
  });

  it("getDemoParamsFromUrl extracts first_name, last_name, and workspace params", () => {
    setWindowSearch("?first_name=Taylor&last_name=Swift&workspace=Republic+Records");
    const params = getDemoParamsFromUrl();
    expect(params.firstName).toBe("Taylor");
    expect(params.lastName).toBe("Swift");
    expect(params.companyName).toBe("Republic Records");
  });

  it("getDemoParamsFromUrl falls back to Alexandra Vance at ApexCare when params missing", () => {
    setWindowSearch("");
    const params = getDemoParamsFromUrl();
    expect(params.firstName).toBe("Alexandra");
    expect(params.lastName).toBe("Vance");
    expect(params.companyName).toBe("ApexCare");
  });

  it("getDemoParamsFromUrl supports single name param and legacy company_name fallback", () => {
    setWindowSearch("?name=Elena+Fisher&company_name=NaughtyDog");
    const params = getDemoParamsFromUrl();
    expect(params.firstName).toBe("Elena");
    expect(params.lastName).toBe("Fisher");
    expect(params.companyName).toBe("NaughtyDog");
  });

  it("AuthPage renders prefilled inputs and email from URL parameters", () => {
    setWindowSearch("?first_name=Marcus&last_name=Aurelius&workspace=RomeCorp");
    const onLoginSuccess = vi.fn();
    render(<AuthPage onLoginSuccess={onLoginSuccess} />);

    const firstNameInput = screen.getByLabelText(/first name/i) as HTMLInputElement;
    const lastNameInput = screen.getByLabelText(/last name/i) as HTMLInputElement;
    const companyInput = screen.getByLabelText(/workspace/i) as HTMLInputElement;

    expect(firstNameInput.value).toBe("Marcus");
    expect(lastNameInput.value).toBe("Aurelius");
    expect(companyInput.value).toBe("RomeCorp");
    expect(screen.getByText(/📧 marcus.aurelius@romecorp.tech/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /launch recruiter demo \(marcus\)/i })).toBeInTheDocument();
  });

  it("changing demo inputs dynamically updates email, workspace badge, and button label", async () => {
    setWindowSearch("");
    const onLoginSuccess = vi.fn();
    render(<AuthPage onLoginSuccess={onLoginSuccess} />);

    const firstNameInput = screen.getByLabelText(/first name/i);
    const lastNameInput = screen.getByLabelText(/last name/i);
    const companyInput = screen.getByLabelText(/workspace/i);

    expect(screen.getByRole("button", { name: /launch recruiter demo \(alexandra\)/i })).toBeInTheDocument();

    await userEvent.clear(firstNameInput);
    await userEvent.type(firstNameInput, "Diana");

    await userEvent.clear(lastNameInput);
    await userEvent.type(lastNameInput, "Prince");

    await userEvent.clear(companyInput);
    await userEvent.type(companyInput, "Themyscira");

    expect(screen.getByText(/📧 diana.prince@themyscira.tech/i)).toBeInTheDocument();
    expect(screen.getByText(/Themyscira HR/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /launch recruiter demo \(diana\)/i })).toBeInTheDocument();
  });

  it("handleDemoLogin attempts login with dynamic email and company, calling onLoginSuccess", async () => {
    setWindowSearch("?first_name=Tony&last_name=Stark&company_name=Stark+Ind");
    let loginEmail = "";
    stubFetch({
      "POST /api/auth/login": async (req) => {
        const body = JSON.parse(req.body as string);
        loginEmail = body.email;
        return jsonResponse({
          token: "jwt-tony",
          id: 42,
          email: body.email,
          full_name: "Tony Stark",
          department: "HR Operations",
          role_title: "Lead Support Specialist",
          company_name: "Stark Ind",
        });
      },
    });

    const onLoginSuccess = vi.fn();
    render(<AuthPage onLoginSuccess={onLoginSuccess} />);

    const launchBtn = screen.getByRole("button", { name: /launch recruiter demo/i });
    await userEvent.click(launchBtn);

    expect(loginEmail).toBe("tony.stark@starkind.tech");
    expect(onLoginSuccess).toHaveBeenCalledWith(
      "jwt-tony",
      expect.objectContaining({ email: "tony.stark@starkind.tech", full_name: "Tony Stark", company_name: "Stark Ind" }),
      true,
      true
    );
  });
});
