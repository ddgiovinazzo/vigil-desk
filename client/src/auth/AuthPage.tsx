import React, { useState } from "react";
import { login, register } from "../api";
import { UserProfile } from "../types";

interface AuthPageProps {
  onLoginSuccess: (token: string, user: UserProfile, isNewOrDemo?: boolean, isDemo?: boolean) => void;
}

export const AuthPage: React.FC<AuthPageProps> = ({ onLoginSuccess }) => {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState("alexandra.vance@apexcare.tech");
  const [password, setPassword] = useState("password123");
  const [fullName, setFullName] = useState("Alexandra Vance");
  const [companyName, setCompanyName] = useState("ApexCare");
  const [department, setDepartment] = useState("HR Operations");
  const [roleTitle, setRoleTitle] = useState("Lead Support Specialist");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleDemoLogin = async () => {
    setError(null);
    setLoading(true);
    const demoEmail = "alexandra.vance@apexcare.tech";
    const demoPassword = "password123";

    try {
      // Attempt standard login first
      const authData = await login(demoEmail, demoPassword);
      localStorage.setItem("vigil_token", authData.token);
      localStorage.setItem("vigil_is_demo", "true");
      onLoginSuccess(authData.token, authData.user, true, true);
    } catch (err) {
      // If account does not exist yet on fresh DB, auto-register then login
      try {
        await register({
          email: demoEmail,
          password: demoPassword,
          full_name: "Alexandra Vance",
          company_name: "ApexCare",
          department: "HR Operations",
          role_title: "Lead Support Specialist",
        });
        const authData = await login(demoEmail, demoPassword);
        localStorage.setItem("vigil_token", authData.token);
        localStorage.setItem("vigil_is_demo", "true");
        onLoginSuccess(authData.token, authData.user, true, true);
      } catch (regErr: any) {
        setError(regErr.message || "Failed to initialize demo account");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isRegister) {
        await register({
          email,
          password,
          full_name: fullName,
          company_name: companyName.trim() || "ApexCare",
          department,
          role_title: roleTitle,
        });
        // Auto-login after registration
        const authData = await login(email, password);
        localStorage.setItem("vigil_token", authData.token);
        localStorage.removeItem("vigil_is_demo");
        onLoginSuccess(authData.token, authData.user, true, false);
      } else {
        const authData = await login(email, password);
        localStorage.setItem("vigil_token", authData.token);
        localStorage.removeItem("vigil_is_demo");
        onLoginSuccess(authData.token, authData.user, false, false);
      }
    } catch (err: any) {
      setError(err.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-200">
      {/* Left Column: Branding Graphic */}
      <div className="hidden lg:flex lg:w-1/2 p-12 flex-col justify-between relative bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-950 border-r border-slate-800 text-white">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div>
          <div className="flex items-center space-x-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-400 flex items-center justify-center text-white font-bold shadow-lg shadow-blue-500/30 text-lg">
              🛡️
            </div>
            <div>
              <span className="font-bold text-2xl tracking-tight text-white">VigilDesk</span>
              <span className="ml-2 text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30 uppercase tracking-wide">
                Agentic Ops
              </span>
            </div>
          </div>

          <div className="max-w-md space-y-4">
            <h1 className="text-3xl font-extrabold tracking-tight text-white leading-tight">
              Autonomous Support Triage Agent & Policy RAG Copilot
            </h1>
            <p className="text-sm text-slate-300 leading-relaxed">
              Production-grade agentic triage copilot with bounded reasoning loops, stateful human-in-the-loop safety gates, and audited multi-tenant knowledge retrieval.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 max-w-md">
          <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1">
            <div className="text-xs font-bold text-blue-400">📚 Policy Grounded RAG</div>
            <div className="text-[11px] text-slate-400">Audited document citations & factual checks</div>
          </div>
          <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1">
            <div className="text-xs font-bold text-emerald-400">🛡️ Stateful HITL Guard</div>
            <div className="text-[11px] text-slate-400">Mandatory human confirmation for drafts</div>
          </div>
          <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1">
            <div className="text-xs font-bold text-cyan-400">📊 Trace Telemetry</div>
            <div className="text-[11px] text-slate-400">Real-time p50/p90 latency & token metrics</div>
          </div>
          <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1">
            <div className="text-xs font-bold text-purple-400">🏢 Multi-Tenant Dynamic</div>
            <div className="text-[11px] text-slate-400">Configurable company tenant branding</div>
          </div>
        </div>

        <div className="text-xs text-slate-500">
          © 2026 VigilDesk • AI Systems Architecture
        </div>
      </div>

      {/* Right Column: Auth Form */}
      <div className="flex-1 flex flex-col justify-center items-center p-8 lg:p-12">
        <div className="w-full max-w-md space-y-6">
          <div className="space-y-2 text-center lg:text-left">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
              {isRegister ? "Create Specialist Account" : "Sign In to VigilDesk"}
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              {isRegister
                ? "Configure your specialist profile and company workspace tenant."
                : "Sign in with your work credentials or launch the instant recruiter demo."}
            </p>
          </div>

          {/* One-Click Demo Button */}
          <div className="p-4 rounded-2xl bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-500/30 space-y-2.5 text-center shadow-xs">
            <div className="flex items-center justify-center space-x-2">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-xs font-bold text-blue-800 dark:text-blue-300 uppercase tracking-wider">Recruiter 1-Click Demo Mode</span>
            </div>
            <p className="text-xs text-slate-700 dark:text-slate-300 font-medium">
              Launch immediately as <strong>Alexandra Vance</strong> (ApexCare Workspace) with pre-loaded employee tickets.
            </p>
            <button
              type="button"
              onClick={handleDemoLogin}
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:opacity-95 text-slate-950 font-extrabold text-xs shadow-md active:scale-[0.98] transition flex items-center justify-center space-x-2 cursor-pointer"
            >
              <span>⚡</span>
              <span>Launch Recruiter Demo</span>
            </button>
          </div>

          <div className="relative flex py-1 items-center">
            <div className="flex-grow border-t border-slate-200 dark:border-slate-800"></div>
            <span className="flex-shrink mx-4 text-[10px] text-slate-500 font-semibold uppercase tracking-wider">or authenticate with credentials</span>
            <div className="flex-grow border-t border-slate-200 dark:border-slate-800"></div>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-400 text-xs font-medium">
              ⚠️ {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegister && (
              <>
                <div>
                  <label htmlFor="fullName" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Full Name</label>
                  <input
                    id="fullName"
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Alexandra Vance"
                    className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label htmlFor="companyName" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Company / Organization Name
                  </label>
                  <input
                    id="companyName"
                    type="text"
                    required
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="e.g. Acme Corp, Globex, or ApexCare"
                    className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                    Dynamically customizes the copilot persona, tickets domain, and policy citations.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="department" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Department</label>
                    <select
                      id="department"
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="HR Operations">HR Operations</option>
                      <option value="IT Service Desk">IT Service Desk</option>
                      <option value="People & Culture">People & Culture</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="roleTitle" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Role Title</label>
                    <select
                      id="roleTitle"
                      value={roleTitle}
                      onChange={(e) => setRoleTitle(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="Lead Support Specialist">Lead Specialist</option>
                      <option value="Senior HR Specialist">Senior Specialist</option>
                    </select>
                  </div>
                </div>
              </>
            )}

            <div>
              <label htmlFor="email" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Work Email</label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Password</label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md transition cursor-pointer"
            >
              {loading ? "Authenticating..." : isRegister ? "Create Account & Launch" : "Sign In"}
            </button>
          </form>

          <div className="text-center pt-2">
            <button
              type="button"
              role="tab"
              onClick={() => {
                setIsRegister(!isRegister);
                setError(null);
              }}
              className="text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition cursor-pointer"
            >
              {isRegister ? (
                <>Already have an account? <span className="font-bold text-blue-600 dark:text-blue-400">Sign In</span></>
              ) : (
                <>Need an account? <span className="font-bold text-blue-600 dark:text-blue-400">Register Profile</span></>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
