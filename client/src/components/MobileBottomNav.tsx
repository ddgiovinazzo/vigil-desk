import React from "react";

export type MobileTab = "tickets" | "copilot" | "knowledge" | "observability";

interface MobileBottomNavProps {
  activeTab: MobileTab;
  onTabChange: (tab: MobileTab) => void;
  openTicketCount?: number;
  isPipThinking?: boolean;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeTab,
  onTabChange,
  openTicketCount = 0,
  isPipThinking = false,
}) => {
  return (
    <nav
      aria-label="Mobile Navigation"
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 px-3 py-1.5 shadow-lg transition-colors duration-200"
      style={{ paddingBottom: "max(0.375rem, env(safe-area-inset-bottom))" }}
    >
      <div className="flex items-center justify-around max-w-lg mx-auto">
        {/* Tickets Tab */}
        <button
          onClick={() => onTabChange("tickets")}
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all cursor-pointer relative ${
            activeTab === "tickets"
              ? "text-blue-600 dark:text-blue-400 font-bold"
              : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 font-medium"
          }`}
        >
          <div className="relative">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={activeTab === "tickets" ? 2.5 : 2}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
              />
            </svg>
            {openTicketCount > 0 && (
              <span className="absolute -top-1 -right-2.5 min-w-[16px] h-4 px-1 rounded-full bg-blue-600 text-white text-[9px] font-black flex items-center justify-center shadow-xs">
                {openTicketCount > 99 ? "99+" : openTicketCount}
              </span>
            )}
          </div>
          <span className="text-[10px] mt-0.5 tracking-tight">Tickets</span>
          {activeTab === "tickets" && (
            <span className="w-1.5 h-1.5 rounded-full bg-blue-600 dark:bg-blue-400 absolute -bottom-0.5"></span>
          )}
        </button>

        {/* Pip AI Tab */}
        <button
          onClick={() => onTabChange("copilot")}
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all cursor-pointer relative ${
            activeTab === "copilot"
              ? "text-indigo-600 dark:text-indigo-400 font-bold"
              : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 font-medium"
          }`}
        >
          <div className="relative">
            <div
              className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black transition-all ${
                activeTab === "copilot"
                  ? "bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-sm shadow-blue-500/30"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700"
              } ${isPipThinking ? "animate-pulse ring-2 ring-indigo-400" : ""}`}
            >
              ✨
            </div>
            {isPipThinking && (
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
            )}
          </div>
          <span className="text-[10px] mt-0.5 tracking-tight">Pip AI</span>
          {activeTab === "copilot" && (
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 dark:bg-indigo-400 absolute -bottom-0.5"></span>
          )}
        </button>

        {/* Knowledge Tab */}
        <button
          onClick={() => onTabChange("knowledge")}
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all cursor-pointer relative ${
            activeTab === "knowledge"
              ? "text-blue-600 dark:text-blue-400 font-bold"
              : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 font-medium"
          }`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={activeTab === "knowledge" ? 2.5 : 2}
              d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
            />
          </svg>
          <span className="text-[10px] mt-0.5 tracking-tight">Knowledge</span>
          {activeTab === "knowledge" && (
            <span className="w-1.5 h-1.5 rounded-full bg-blue-600 dark:bg-blue-400 absolute -bottom-0.5"></span>
          )}
        </button>

        {/* Audit Tab */}
        <button
          onClick={() => onTabChange("observability")}
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all cursor-pointer relative ${
            activeTab === "observability"
              ? "text-blue-600 dark:text-blue-400 font-bold"
              : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 font-medium"
          }`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={activeTab === "observability" ? 2.5 : 2}
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
            />
          </svg>
          <span className="text-[10px] mt-0.5 tracking-tight">Audit</span>
          {activeTab === "observability" && (
            <span className="w-1.5 h-1.5 rounded-full bg-blue-600 dark:bg-blue-400 absolute -bottom-0.5"></span>
          )}
        </button>
      </div>
    </nav>
  );
};
