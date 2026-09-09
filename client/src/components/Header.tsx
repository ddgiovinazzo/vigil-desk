import React from "react";
import { UserProfile } from "../types";

interface HeaderProps {
  user: UserProfile;
  activeView: "workbench" | "observability" | "knowledge";
  setActiveView: (view: "workbench" | "observability" | "knowledge") => void;
  darkMode: boolean;
  setDarkMode: (val: boolean) => void;
  onLogout: () => void;
  onReseed: () => void;
  isDemo?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  activeView,
  setActiveView,
  darkMode,
  setDarkMode,
  onLogout,
  onReseed,
  isDemo,
}) => {
  const [showMobileDrawer, setShowMobileDrawer] = React.useState(false);

  return (
    <>
      <header className="sticky top-0 z-40 px-4 py-2.5 sm:px-6 sm:py-3 flex items-center justify-between bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-xs transition-colors duration-200">
        {/* Brand & Organization */}
        <div className="flex items-center space-x-2.5 sm:space-x-3 cursor-pointer" onClick={() => setActiveView("workbench")}>
          <img
            src="/favicon.svg"
            alt="VigilDesk Logo"
            className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl shadow-md shadow-blue-500/20 shrink-0"
          />
          <div className="flex items-center space-x-2">
            <span className="font-bold text-base sm:text-lg tracking-tight text-slate-900 dark:text-white">VigilDesk</span>
            <span className="hidden sm:inline-block text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/20">
              {user.company_name || "ApexCare"} Workspace
            </span>
          </div>
        </div>

        {/* Center Navigation Tabs (Desktop only) */}
        <div className="hidden md:flex items-center space-x-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
          <button
            onClick={() => setActiveView("workbench")}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 ${
              activeView === "workbench"
                ? "bg-blue-600 text-white shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            Workbench
          </button>
          <button
            onClick={() => setActiveView("knowledge")}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 ${
              activeView === "knowledge"
                ? "bg-blue-600 text-white shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            Knowledge Base
          </button>
          <button
            onClick={() => setActiveView("observability")}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 ${
              activeView === "observability"
                ? "bg-blue-600 text-white shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            Audit Logs
          </button>
        </div>

        {/* Right User Identity & Actions (Desktop) */}
        <div className="hidden md:flex items-center space-x-3">
          {/* Quick Reseed Button (Demo Mode Only) */}
          {isDemo && (
            <button
              onClick={onReseed}
              title="Clear all audit logs, conversations, and reset sample tickets"
              className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition cursor-pointer border border-slate-200 dark:border-slate-700 flex items-center space-x-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <span>🔄</span>
              <span>Reset & Reseed</span>
            </button>
          )}

          {/* Dark/Light Mode Toggle */}
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="p-1.5 rounded-lg text-slate-700 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500"
            title="Toggle Theme"
          >
            {darkMode ? "☀️" : "🌙"}
          </button>

          {/* Specialist Profile Badge */}
          <div className="flex items-center space-x-2 pl-2 border-l border-slate-200 dark:border-slate-700">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-bold text-xs flex items-center justify-center shadow-xs">
              {user.full_name
                .split(" ")
                .map((n) => n[0])
                .join("")
                .toUpperCase()}
            </div>
            <span className="text-xs font-bold text-slate-900 dark:text-white">{user.full_name.split(" ")[0]}</span>
          </div>

          {/* Logout */}
          <button
            onClick={onLogout}
            className="text-xs font-semibold text-rose-600 dark:text-rose-400 hover:underline cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Logout
          </button>
        </div>

        {/* Mobile Header Actions */}
        <div className="flex md:hidden items-center space-x-2">
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="p-2 rounded-xl text-slate-700 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition cursor-pointer"
            title="Toggle Theme"
            aria-label="Toggle Theme"
          >
            {darkMode ? "☀️" : "🌙"}
          </button>

          <button
            onClick={() => setShowMobileDrawer(true)}
            className="flex items-center space-x-1.5 p-1 rounded-full hover:ring-2 hover:ring-blue-500 transition cursor-pointer"
            aria-label="Open User Menu"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-bold text-xs flex items-center justify-center shadow-xs">
              {user.full_name
                .split(" ")
                .map((n) => n[0])
                .join("")
                .toUpperCase()}
            </div>
          </button>
        </div>
      </header>

      {/* Mobile Slide-Over Profile Drawer */}
      {showMobileDrawer && (
        <div
          role="dialog"
          aria-modal="true"
          className="md:hidden fixed inset-0 z-50 flex justify-end bg-slate-950/60 backdrop-blur-xs animate-fadeIn"
          onClick={() => setShowMobileDrawer(false)}
        >
          <div
            className="w-80 max-w-[85vw] h-full bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col p-5 overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
              <span className="font-bold text-sm text-slate-900 dark:text-white">Specialist Profile</span>
              <button
                onClick={() => setShowMobileDrawer(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                aria-label="Close Profile Menu"
              >
                ✕
              </button>
            </div>

            {/* Profile Info */}
            <div className="py-5 space-y-4">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-black text-base flex items-center justify-center shadow-md">
                  {user.full_name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .toUpperCase()}
                </div>
                <div className="min-w-0">
                  <h4 className="font-bold text-base text-slate-900 dark:text-white truncate">{user.full_name}</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{user.email}</p>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Workspace</span>
                  <span className="font-semibold text-slate-900 dark:text-white">{user.company_name || "ApexCare"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Role</span>
                  <span className="font-semibold text-slate-900 dark:text-white">{user.role_title || "Specialist"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Department</span>
                  <span className="font-semibold text-slate-900 dark:text-white">{user.department || "HR Operations"}</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="mt-auto space-y-3 pt-4 border-t border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Dark Mode</span>
                <button
                  onClick={() => setDarkMode(!darkMode)}
                  className="px-3 py-1 rounded-lg text-xs font-bold bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 transition cursor-pointer"
                >
                  {darkMode ? "☀️ Light" : "🌙 Dark"}
                </button>
              </div>

              {isDemo && (
                <button
                  onClick={() => {
                    setShowMobileDrawer(false);
                    onReseed();
                  }}
                  className="w-full py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold transition flex items-center justify-center space-x-2 border border-slate-200 dark:border-slate-700 cursor-pointer"
                >
                  <span>🔄</span>
                  <span>Reset & Reseed Demo Data</span>
                </button>
              )}

              <button
                onClick={() => {
                  setShowMobileDrawer(false);
                  onLogout();
                }}
                className="w-full py-2.5 px-4 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/50 text-rose-600 dark:text-rose-400 text-xs font-bold transition flex items-center justify-center space-x-2 border border-rose-200 dark:border-rose-900/60 cursor-pointer"
              >
                <span>🚪</span>
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

