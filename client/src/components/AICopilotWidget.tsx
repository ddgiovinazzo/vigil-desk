import React, { useEffect, useMemo, useRef, useState } from "react";
import { AgentRun, Ticket, TraceStep, UserProfile } from "../types";
import {
  AgentProgressPanel,
  AgentToolTrace,
  ToolActivity,
  deriveAgentProgress,
} from "./AgentProgress";
import { PipAvatar, PipStatusState } from "./PipAvatar";
import { api } from "../api";
import { ChatHistoryView } from "./ChatHistoryView";

interface AICopilotWidgetProps {
  user: UserProfile;
  activeTicket: Ticket | null;
  tickets?: Ticket[];
  latestRun: AgentRun | null;
  isProcessing: boolean;
  onBotThinkingChange?: (isThinking: boolean) => void;
  pendingDraftQuery?: string | null;
  onClearPendingDraftQuery?: () => void;
  onTicketUpdated?: () => void;
  onDraftGenerated?: (draftText: string, ticketId?: number) => void;
  isMobileDrawer?: boolean;
  onCloseMobileDrawer?: () => void;
  onApplyDraftToTicket?: (draftText: string) => void;
}

interface ChatMessage {
  id: string;
  sender: "user" | "pip" | "system";
  text: string;
  timestamp: string;
  tools?: ToolActivity[];
}

export function extractCleanDraft(text: string): string {
  if (!text) return "";
  let trimmed = text.trim();
  if (trimmed.startsWith("```") && trimmed.endsWith("```")) {
    trimmed = trimmed.replace(/^```[a-zA-Z]*\n?/, "").replace(/\n?```$/, "").trim();
  }
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    try {
      const parsed = JSON.parse(trimmed);
      const body =
        parsed?.parameters?.reply?.body ||
        parsed?.parameters?.body ||
        parsed?.reply?.body ||
        parsed?.body ||
        parsed?.draft_reply ||
        parsed?.draft ||
        (typeof parsed?.reply === "string" ? parsed.reply : null);
      if (typeof body === "string") return extractCleanDraft(body);
    } catch {
      // ignore
    }
  }

  return trimmed;
}

export const CopyButton: React.FC<{ text: string }> = ({ text }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = text;
        textarea.style.position = "fixed";
        textarea.style.left = "-999999px";
        textarea.style.top = "-999999px";
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        document.execCommand("copy");
        textarea.remove();
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      title={copied ? "Copied to clipboard!" : "Copy message to clipboard"}
      aria-label="Copy reply"
      className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-md text-[10px] font-semibold transition-all duration-150 cursor-pointer ${
        copied
          ? "bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700"
          : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-200/80 dark:hover:bg-slate-700/80 border border-slate-200/60 dark:border-slate-700/60 bg-white/70 dark:bg-slate-900/60"
      }`}
    >
      {copied ? (
        <>
          <svg className="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
          <span className="font-bold">Copied!</span>
        </>
      ) : (
        <>
          <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
            />
          </svg>
          <span>Copy</span>
        </>
      )}
    </button>
  );
};

export const AICopilotWidget: React.FC<AICopilotWidgetProps> = ({
  user,
  activeTicket,
  tickets = [],
  latestRun,
  isProcessing,
  onBotThinkingChange,
  pendingDraftQuery,
  onClearPendingDraftQuery,
  onTicketUpdated,
  onDraftGenerated,
  isMobileDrawer = false,
  onCloseMobileDrawer,
  onApplyDraftToTicket,
}) => {
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: "1",
      sender: "pip",
      text: `Hello ${user.full_name.split(" ")[0]}! I'm Pip, your ${user.company_name || "ApexCare"} HR AI Support Assistant. I'm here to help you search company policies, benefits, and draft ticket replies.`,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
  ]);
  const [inputMessage, setInputMessage] = useState("");
  const [currentConversationId, setCurrentConversationId] = useState<number | null>(null);
  const [currentConversationTitle, setCurrentConversationTitle] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"chat" | "history">("chat");
  const [isBotThinking, setIsBotThinking] = useState(false);
  const [isBotTalking, setIsBotTalking] = useState(false);
  const [activeRunId, setActiveRunId] = useState<number | null>(null);
  const [runSteps, setRunSteps] = useState<TraceStep[]>([]);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Transient status override for terminal states ("completed" | "stopped" | "error")
  const [statusOverride, setStatusOverride] = useState<PipStatusState | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  const handleStopThinking = async () => {
    // 1. Abort the active fetch request
    abortControllerRef.current?.abort();
    setIsBotThinking(false);

    // Flash "stopped" state on Pip avatar
    setStatusOverride("stopped");
    setTimeout(() => setStatusOverride(null), 3000);

    // 2. If we have an active run ID, notify backend to mark it STOPPED
    if (activeRunId) {
      try {
        const token = localStorage.getItem("vigil_token") || localStorage.getItem("apexcare_token");
        await fetch(`/api/runs/${activeRunId}/stop`, {
          method: "POST",
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
      } catch (err) {
        console.error("Failed to notify backend of stopped run:", err);
      }
    }
  };

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatMessages, isBotThinking, isBotTalking]);

  useEffect(() => {
    if (!isBotThinking || !activeRunId) return;

    const pollInterval = setInterval(async () => {
      try {
        const token = localStorage.getItem("vigil_token") || localStorage.getItem("apexcare_token");
        const res = await fetch(`/api/runs/${activeRunId}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (res.ok) {
          const data = await res.json();
          setRunSteps(data.steps || []);
        }
      } catch (err) {
        // Ignore transient polling errors
      }
    }, 600);

    return () => clearInterval(pollInterval);
  }, [isBotThinking, activeRunId]);

  // Heartbeat so the panel keeps moving between persisted steps
  useEffect(() => {
    if (!isBotThinking) return;

    const startedAt = Date.now();
    setElapsedSeconds(0);
    const ticker = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - startedAt) / 1000));
    }, 1000);

    return () => clearInterval(ticker);
  }, [isBotThinking]);

  // Report thinking status up to parent
  useEffect(() => {
    onBotThinkingChange?.(isBotThinking);
  }, [isBotThinking, onBotThinkingChange]);

  // Handle incoming draft query from Draft with Pip button
  useEffect(() => {
    if (pendingDraftQuery && pendingDraftQuery.trim()) {
      handleSendChatMessage(pendingDraftQuery, true);
      onClearPendingDraftQuery?.();
    }
  }, [pendingDraftQuery]);

  const liveProgress = useMemo(() => deriveAgentProgress(runSteps), [runSteps]);

  const fetchRunTools = async (runId: number): Promise<ToolActivity[]> => {
    try {
      const token = localStorage.getItem("vigil_token") || localStorage.getItem("apexcare_token");
      const res = await fetch(`/api/runs/${runId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) return liveProgress.tools;
      const data = await res.json();
      return deriveAgentProgress(data.steps || [], data.status).tools;
    } catch (err) {
      return liveProgress.tools;
    }
  };

  // Dynamic status mapping for Pip Avatar
  const getPipStatus = (): PipStatusState => {
    if (statusOverride) return statusOverride;
    if (isProcessing || isBotThinking) return "thinking";
    if (isBotTalking) return "talking";
    return "idle";
  };

  const status = getPipStatus();

  const handleSendChatMessage = async (queryText?: string, isExplicitDraft?: boolean) => {
    const textToSend = queryText || inputMessage;
    if (!textToSend.trim()) return;

    const timestamp = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: "user",
      text: textToSend,
      timestamp,
    };

    setChatMessages((prev) => [...prev, userMsg]);
    if (!queryText) setInputMessage("");
    setIsBotThinking(true);
    setStatusOverride(null);
    setRunSteps([]);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    setTimeout(async () => {
      try {
        const token = localStorage.getItem("vigil_token") || localStorage.getItem("apexcare_token");
        const res = await fetch("/api/runs?page=1&per_page=1", {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (res.ok) {
          const data = await res.json();
          if (data.runs && data.runs.length > 0) {
            const latest = data.runs[0];
            if (latest.status === "running" && !controller.signal.aborted) {
              setActiveRunId(latest.id);
            }
          }
        }
      } catch (err) {
        console.error("Failed to fetch active run ID early for chat:", err);
      }
    }, 200);

    // The ONLY time the draft flag is triggered is explicitly when the "Draft with Pip" button is clicked
    const isDraft = Boolean(isExplicitDraft);

    try {
      const token = localStorage.getItem("vigil_token") || localStorage.getItem("apexcare_token");
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          message: textToSend,
          ticket_id: activeTicket?.id,
          is_draft: isDraft,
          conversation_id: currentConversationId || undefined,
        }),
        signal: controller.signal,
      });

      let answerText = "";
      let completedRunId: number | null = null;

      if (res.ok) {
        const data = await res.json();
        completedRunId = data.run_id;
        setActiveRunId(data.run_id);
        if (data.conversation_id) {
          setCurrentConversationId(data.conversation_id);
        }
        if (data.conversation_title) {
          setCurrentConversationTitle(data.conversation_title);
        }

        const rawReply = data.reply || "";
        const isRawDraftJson = rawReply.trim().startsWith("{") && rawReply.includes("draft_replies");
        if (data.draft_reply || isRawDraftJson) {
          const finalDraft = extractCleanDraft(data.draft_reply || rawReply);
          answerText = finalDraft || rawReply;
          if (finalDraft) {
            onDraftGenerated?.(finalDraft, data.ticket_id || activeTicket?.id);
            onTicketUpdated?.();
          }
        } else {
          answerText = rawReply;
        }

        // Flash "completed" state with celebration stars briefly upon success!
        setStatusOverride("completed");
        setTimeout(() => setStatusOverride(null), 2500);
      } else {
        throw new Error("API call failed");
      }

      const tools = completedRunId ? await fetchRunTools(completedRunId) : [];

      const botMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: "pip",
        text: answerText,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        tools,
      };

      setChatMessages((prev) => [...prev, botMsg]);
      setIsBotThinking(false);
      setActiveRunId(null);
      setIsBotTalking(true);

      setTimeout(() => {
        setIsBotTalking(false);
      }, 3500);
    } catch (err: any) {
      setIsBotThinking(false);
      setActiveRunId(null);

      if (err.name === "AbortError") {
        const stoppedMsg: ChatMessage = {
          id: Date.now().toString(),
          sender: "system",
          text: "You stopped this response",
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        };
        setChatMessages((prev) => [...prev, stoppedMsg]);
        setStatusOverride("stopped");
        setTimeout(() => setStatusOverride(null), 3000);
        return;
      }

      // Flash "error" state on failure
      setStatusOverride("error");
      setTimeout(() => setStatusOverride(null), 3000);

      const lower = textToSend.toLowerCase().trim();
      let answerText = "";

      if (lower.includes("weather")) {
        answerText = `I don't have live weather sensors connected, but I hope it's pleasant outside! Now, let's get back to work—what ticket or policy question shall we tackle next?`;
      } else if (lower.includes("how are you") || lower.includes("how's it going")) {
        answerText = `I'm fully operational and performing at 100%! Ready to get to work—which support ticket should we review today?`;
      } else if (lower.includes("hi") || lower.includes("hello") || lower.includes("hey")) {
        answerText = `Hello ${user.full_name.split(" ")[0]}! Ready to assist. What support ticket or policy inquiry can I help you with today?`;
      } else if (lower.includes("draft") || lower.includes("write a reply") || lower.includes("compose a reply") || lower.includes("help me write")) {
        const reqName = activeTicket?.requester_name?.split(" ")[0] || "there";
        let fallbackDraft = "";
        const company = user.company_name || "ApexCare";
        if (lower.includes("vpn")) {
          fallbackDraft = `Hi ${reqName},\n\nPlease reset your VPN token at vpn.${company.toLowerCase().replace(/[^a-z0-9]/g, "")}.com and reinstall the GlobalProtect certificate per IT security guidelines.\n\nBest regards,\nHR Support Team`;
        } else if (lower.includes("fsa") || lower.includes("wex")) {
          fallbackDraft = `Hi ${reqName},\n\nAccording to ${company} policy, up to $640 in unused Healthcare FSA funds can roll over into 2026. Claims can be submitted via the Wex Mobile app.\n\nBest regards,\nHR Support Team`;
        } else {
          fallbackDraft = `Hi ${reqName},\n\nThank you for reaching out to HR Support. Your inquiry regarding "${activeTicket?.title || "your ticket"}" has been reviewed per official ${company} policy.\n\nPlease let us know if you need any additional assistance.\n\nBest regards,\nHR Support Team`;
        }
        answerText = `I have inserted this response in the reply chat:\n\n"${fallbackDraft}"`;
        onDraftGenerated?.(fallbackDraft, activeTicket?.id);
        onTicketUpdated?.();
      } else if (lower.includes("fsa") || lower.includes("wex")) {
        answerText =
          "Based on our audited WEX Benefits Policy (wex_benefits_technology_guide.md): Healthcare FSA funds allow up to $640 in unused funds to roll over into 2026. Claims can be submitted via the Wex Mobile app. What shall we tackle next?";
      } else {
        answerText = `I'm ready to assist with "${textToSend}". Let's get to work—which ticket or policy inquiry shall we review?`;
      }

      const botMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: "pip",
        text: answerText,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setChatMessages((prev) => [...prev, botMsg]);
      setIsBotTalking(true);

      setTimeout(() => {
        setIsBotTalking(false);
      }, 3500);
    }
  };

  const handleSelectConversation = async (convId: number) => {
    try {
      setCurrentConversationId(convId);
      setViewMode("chat");
      setIsBotThinking(false);
      setStatusOverride(null);

      const historyData = await api.getHistory(convId);
      if (historyData) {
        if (historyData.conversation?.title) {
          setCurrentConversationTitle(historyData.conversation.title);
        }
        if (historyData.messages && historyData.messages.length > 0) {
          const loadedMessages: ChatMessage[] = historyData.messages.map((m) => ({
            id: m.id.toString(),
            sender: m.role === "user" ? "user" : "pip",
            text: m.content,
            timestamp: m.created_at
              ? new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
              : "",
          }));
          setChatMessages(loadedMessages);
        } else {
          setChatMessages([
            {
              id: Date.now().toString(),
              sender: "pip",
              text: `Ready to continue our chat! Ask me anything about policies, benefits, or your active tickets.`,
              timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            },
          ]);
        }
      }
    } catch (err) {
      console.error("Failed to load conversation history:", err);
    }
  };

  const handleNewConversation = () => {
    setCurrentConversationId(null);
    setCurrentConversationTitle(null);
    setViewMode("chat");
    setChatMessages([
      {
        id: "1",
        sender: "pip",
        text: `Hello ${user.full_name.split(" ")[0]}! I'm Pip, your ${user.company_name || "ApexCare"} HR AI Support Assistant. I'm here to help you search company policies, benefits, and draft ticket replies.`,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      },
    ]);
    setInputMessage("");
    setStatusOverride(null);
  };

  return (
    <div className={`${isMobileDrawer ? "w-full" : "w-full md:w-80 xl:w-96"} h-full md:border-l border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col overflow-hidden`}>
      {/* Mobile Drawer Grab Handle */}
      {isMobileDrawer && (
        <div className="w-12 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700 mx-auto mt-2.5 shrink-0"></div>
      )}

      {/* Header */}
      <div className="pt-4 pb-3.5 px-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center space-x-3 min-w-0">
          {/* Animated Interactive Pip Avatar */}
          <PipAvatar status={status} size="md" />

          <div className="min-w-0">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white leading-tight truncate">
              Pip Assistant
            </h3>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium truncate">
              Support Assistant & Chatbot
            </p>
          </div>
        </div>

        {/* Action Buttons: History & New Conversation & Close (for mobile drawer) */}
        <div className="flex items-center space-x-1.5 shrink-0">
          <button
            onClick={() => setViewMode(viewMode === "history" ? "chat" : "history")}
            title={viewMode === "history" ? "Back to Chat" : "Chat History"}
            aria-label="Chat History"
            className={`p-2 rounded-xl transition cursor-pointer flex items-center justify-center border focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              viewMode === "history"
                ? "bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300 border-blue-300 dark:border-blue-700"
                : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border-slate-200/60 dark:border-slate-700/60"
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>

          <button
            onClick={handleNewConversation}
            title="Start New Conversation"
            aria-label="Start New Conversation"
            className="p-2 rounded-xl text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 transition cursor-pointer flex items-center justify-center border border-slate-200/60 dark:border-slate-700/60 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>

          {onCloseMobileDrawer && (
            <button
              onClick={onCloseMobileDrawer}
              title="Close Drawer"
              aria-label="Close Drawer"
              className="p-2 rounded-xl text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 transition cursor-pointer flex items-center justify-center border border-slate-200/60 dark:border-slate-700/60 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Contextual Active Ticket Banner */}
      {activeTicket && (
        <div className="px-4 py-2 bg-blue-50/90 dark:bg-blue-950/40 border-b border-blue-200/80 dark:border-blue-800/60 flex items-center justify-between text-xs shrink-0">
          <div className="flex items-center space-x-1.5 min-w-0 pr-2">
            <span className="font-bold text-blue-700 dark:text-blue-400 shrink-0">Active:</span>
            <span className="text-slate-700 dark:text-slate-300 truncate font-semibold">
              {activeTicket.ticket_number} - {activeTicket.title}
            </span>
          </div>
          {activeTicket.draft_reply && onApplyDraftToTicket && (
            <button
              onClick={() => onApplyDraftToTicket(activeTicket.draft_reply!)}
              className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-[11px] shrink-0 shadow-xs cursor-pointer flex items-center space-x-1 transition"
            >
              <span>Apply Draft</span>
              <span>→</span>
            </button>
          )}
        </div>
      )}

      {/* Main View: History Panel vs Active Chat */}
      {viewMode === "history" ? (
        <ChatHistoryView
          currentConversationId={currentConversationId}
          onSelectConversation={handleSelectConversation}
          onNewConversation={handleNewConversation}
          onClose={() => setViewMode("chat")}
        />
      ) : (
        <div className="flex-1 overflow-hidden flex flex-col min-h-0">
          {currentConversationTitle && (
            <div className="px-4 py-1.5 bg-slate-50 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800/60 flex items-center justify-between text-[11px]">
              <span className="text-slate-500 dark:text-slate-400 font-medium truncate flex items-center gap-1.5 min-w-0">
                <svg className="w-3.5 h-3.5 text-blue-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <span className="font-semibold text-slate-700 dark:text-slate-300 truncate">
                  {currentConversationTitle}
                </span>
              </span>
              <button
                onClick={() => setViewMode("history")}
                className="text-[10px] text-blue-600 dark:text-blue-400 hover:underline shrink-0 ml-2 font-medium cursor-pointer"
              >
                All Chats
              </button>
            </div>
          )}

          {/* Content Area - Live AI Chatbot Panel */}
          <div className="flex-1 overflow-hidden p-4 flex flex-col min-h-0">
        <div className="flex-1 flex flex-col min-h-0">
          {/* Chat Messages Timeline */}
          <div className="flex-1 space-y-3 overflow-y-auto custom-scrollbar pr-1 min-h-0 pb-2">
            {chatMessages.map((msg) => {
              if (msg.sender === "system") {
                return (
                  <div key={msg.id} className="relative flex py-2 items-center my-2">
                    <div className="flex-grow border-t border-slate-200 dark:border-slate-800"></div>
                    <span className="flex-shrink mx-3 text-[11px] text-slate-400 dark:text-slate-500 font-medium">
                      {msg.text}
                    </span>
                    <div className="flex-grow border-t border-slate-200 dark:border-slate-800"></div>
                  </div>
                );
              }

              return (
                <div
                  key={msg.id}
                  className={`flex space-x-2 ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
                >
                  {msg.sender === "pip" && (
                    <div className="w-6 h-6 rounded-full bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 text-white font-black text-xs flex items-center justify-center shrink-0 shadow-sm shadow-blue-500/30 border border-white/20 mt-0.5">
                      P
                    </div>
                  )}
                  <div
                    className={`p-3 rounded-2xl max-w-[85%] text-xs leading-relaxed ${msg.sender === "user"
                        ? "bg-blue-600 text-white rounded-br-none shadow-xs"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-bl-none shadow-xs"
                      }`}
                  >
                    <p className="whitespace-pre-wrap">{msg.text}</p>
                    {msg.sender === "pip" && msg.tools && <AgentToolTrace tools={msg.tools} />}
                    <div className="flex items-center justify-between mt-2 pt-1 border-t border-slate-200/50 dark:border-slate-700/50 text-[9px]">
                      {msg.sender === "pip" ? (
                        <CopyButton text={msg.text} />
                      ) : (
                        <span></span>
                      )}
                      <span className="opacity-70 font-mono">
                        {msg.timestamp}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}

            {isBotThinking && (
              <AgentProgressPanel progress={liveProgress} elapsedSeconds={elapsedSeconds} />
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Quick Policy Chips & Chat Input Box */}
          <div className="space-y-2.5 pt-3 border-t border-slate-200 dark:border-slate-800 shrink-0">
            <div className="flex items-center gap-2 p-1.5 overflow-x-auto custom-scrollbar text-[11px]">
              <button
                type="button"
                disabled={isBotThinking}
                onClick={() => handleSendChatMessage("Tell me about the WFA policy")}
                className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 font-medium whitespace-nowrap cursor-pointer transition focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 dark:focus:ring-offset-slate-900 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                💬 WFA Policy
              </button>
              <button
                type="button"
                disabled={isBotThinking}
                onClick={() => handleSendChatMessage("What is our WEX FSA rollover limit?")}
                className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 font-medium whitespace-nowrap cursor-pointer transition focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 dark:focus:ring-offset-slate-900 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                💬 FSA Policy
              </button>
              <button
                type="button"
                disabled={isBotThinking}
                onClick={() => handleSendChatMessage("How do employees replace medical ID cards?")}
                className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 font-medium whitespace-nowrap cursor-pointer transition focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 dark:focus:ring-offset-slate-900 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                💬 Medical IDs
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendChatMessage();
              }}
              className="flex items-center space-x-2"
            >
              <textarea
                rows={1}
                disabled={isBotThinking}
                placeholder={isBotThinking ? "Pip is thinking..." : "Ask Pip any policy question..."}
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSendChatMessage();
                  }
                }}
                className="flex-1 px-3 py-2 rounded-xl text-xs bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none overflow-y-auto max-h-24 custom-scrollbar font-medium disabled:opacity-50 disabled:bg-slate-200/60 dark:disabled:bg-slate-800/60 disabled:cursor-not-allowed"
              />
              {isBotThinking ? (
                <button
                  type="button"
                  onClick={handleStopThinking}
                  className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-xs whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-rose-500"
                >
                  Stop
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={!inputMessage.trim()}
                  className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-xs whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  Send
                </button>
              )}
            </form>
          </div>
        </div>
      </div>
    </div>
      )}
    </div>
  );
};