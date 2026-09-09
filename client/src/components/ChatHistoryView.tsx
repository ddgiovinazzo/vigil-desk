import React, { useEffect, useState } from "react";
import { Conversation } from "../types";
import { api } from "../api";

interface ChatHistoryViewProps {
  currentConversationId: number | null;
  onSelectConversation: (convId: number) => void;
  onNewConversation: () => void;
  onClose: () => void;
}

function formatRelativeTime(dateStr?: string): string {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHours = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSec < 60) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export const ChatHistoryView: React.FC<ChatHistoryViewProps> = ({
  currentConversationId,
  onSelectConversation,
  onNewConversation,
  onClose,
}) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const fetchConversations = async () => {
    try {
      setLoading(true);
      const list = await api.listConversations();
      setConversations(list || []);
    } catch (err) {
      console.error("Failed to load conversations:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConversations();
  }, []);

  const handleStartEdit = (conv: Conversation, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(conv.id);
    setEditTitle(conv.title);
    setDeletingId(null);
  };

  const handleCancelEdit = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setEditingId(null);
    setEditTitle("");
  };

  const handleSaveEdit = async (convId: number, e?: React.MouseEvent | React.FormEvent) => {
    e?.stopPropagation();
    e?.preventDefault();
    const trimmed = editTitle.trim();
    if (!trimmed) return;

    try {
      setIsSaving(true);
      const updated = await api.updateConversation(convId, trimmed);
      setConversations((prev) =>
        prev.map((c) => (c.id === convId ? { ...c, title: updated.title, updated_at: updated.title } : c))
      );
      setEditingId(null);
    } catch (err) {
      console.error("Failed to rename conversation:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleStartDelete = (convId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeletingId(convId);
    setEditingId(null);
  };

  const handleCancelDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setDeletingId(null);
  };

  const handleConfirmDelete = async (convId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await api.deleteConversation(convId);
      setConversations((prev) => prev.filter((c) => c.id !== convId));
      setDeletingId(null);
      if (currentConversationId === convId) {
        onNewConversation();
      }
    } catch (err) {
      console.error("Failed to delete conversation:", err);
    }
  };

  const filteredConversations = conversations.filter((c) =>
    c.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="h-full flex flex-col overflow-hidden bg-white dark:bg-slate-900">
      {/* Top Header */}
      <div className="pt-5 pb-4 px-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
        <div className="flex items-center space-x-2 min-w-0">
          <button
            onClick={onClose}
            title="Back to Active Chat"
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white leading-tight truncate">
                Chat History
              </h3>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200/60 dark:border-slate-700/60">
                {conversations.length}
              </span>
            </div>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium truncate">
              Past conversations with Pip
            </p>
          </div>
        </div>

        {/* New Chat Button */}
        <button
          onClick={onNewConversation}
          title="Create New Chat"
          aria-label="Create New Chat"
          className="inline-flex items-center space-x-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 dark:hover:bg-blue-900/60 transition cursor-pointer border border-blue-200/60 dark:border-blue-800/60 shrink-0"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
          </svg>
          <span>New Chat</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="p-3 border-b border-slate-100 dark:border-slate-800/80">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search chat history..."
            className="w-full pl-8 pr-7 py-1.5 text-xs bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700/80 rounded-lg text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Conversation List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1.5 custom-scrollbar min-h-0">
        {loading ? (
          <div className="p-4 space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse flex flex-col space-y-2 p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800">
                <div className="h-3.5 bg-slate-200 dark:bg-slate-700 rounded w-3/4"></div>
                <div className="h-2.5 bg-slate-200 dark:bg-slate-700 rounded w-1/3"></div>
              </div>
            ))}
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="p-8 text-center flex flex-col items-center justify-center">
            <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 mb-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
            </div>
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              {searchQuery ? "No matching chats found" : "No chat history yet"}
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              {searchQuery
                ? "Try searching for another topic"
                : "Ask Pip questions about policies, benefits, or tickets to start"}
            </p>
          </div>
        ) : (
          filteredConversations.map((conv) => {
            const isActive = conv.id === currentConversationId;
            const isEditing = conv.id === editingId;
            const isDeleting = conv.id === deletingId;

            return (
              <div
                key={conv.id}
                onClick={() => {
                  if (!isEditing && !isDeleting) {
                    onSelectConversation(conv.id);
                  }
                }}
                className={`group relative rounded-xl p-2.5 transition cursor-pointer border text-left flex flex-col gap-1 ${
                  isActive
                    ? "bg-blue-50/70 dark:bg-blue-950/40 border-blue-300 dark:border-blue-700 shadow-xs"
                    : "bg-white dark:bg-slate-800/40 border-slate-200/70 dark:border-slate-700/60 hover:bg-slate-50 dark:hover:bg-slate-800/80 hover:border-slate-300 dark:hover:border-slate-600"
                }`}
              >
                {/* Deleting Confirmation Overlay */}
                {isDeleting ? (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="p-1 flex items-center justify-between gap-2"
                  >
                    <span className="text-xs font-medium text-rose-600 dark:text-rose-400">
                      Delete this chat?
                    </span>
                    <div className="flex items-center space-x-1.5">
                      <button
                        onClick={handleCancelDelete}
                        className="px-2 py-0.5 rounded text-[11px] font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={(e) => handleConfirmDelete(conv.id, e)}
                        className="px-2 py-0.5 rounded text-[11px] font-semibold text-white bg-rose-600 hover:bg-rose-700 transition shadow-xs"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ) : isEditing ? (
                  /* Inline Renaming Form */
                  <form
                    onSubmit={(e) => handleSaveEdit(conv.id, e)}
                    onClick={(e) => e.stopPropagation()}
                    className="flex items-center gap-1.5"
                  >
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      autoFocus
                      disabled={isSaving}
                      onKeyDown={(e) => {
                        if (e.key === "Escape") handleCancelEdit();
                      }}
                      className="flex-1 px-2 py-1 text-xs bg-white dark:bg-slate-900 border border-blue-500 rounded-md text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                    <button
                      type="submit"
                      disabled={isSaving || !editTitle.trim()}
                      title="Save title"
                      aria-label="Save title"
                      className="p-1 rounded bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 transition cursor-pointer"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={handleCancelEdit}
                      title="Cancel rename"
                      aria-label="Cancel rename"
                      className="p-1 rounded text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </form>
                ) : (
                  /* Regular Conversation Item Display */
                  <>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        {isActive && (
                          <span
                            title="Active conversation"
                            className="w-2 h-2 rounded-full bg-blue-600 dark:bg-blue-400 shrink-0"
                          />
                        )}
                        <h4
                          className={`text-xs font-semibold truncate leading-tight ${
                            isActive
                              ? "text-blue-900 dark:text-blue-100"
                              : "text-slate-800 dark:text-slate-200"
                          }`}
                        >
                          {conv.title}
                        </h4>
                      </div>

                      {/* Action buttons (Edit & Delete) */}
                      <div className="flex items-center space-x-1 shrink-0 opacity-80 group-hover:opacity-100 transition">
                        <button
                          type="button"
                          onClick={(e) => handleStartEdit(conv, e)}
                          title="Rename chat"
                          aria-label={`Rename ${conv.title}`}
                          className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/80 dark:hover:bg-slate-700/80 transition cursor-pointer"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                            />
                          </svg>
                        </button>
                        <button
                          type="button"
                          onClick={(e) => handleStartDelete(conv.id, e)}
                          title="Delete chat"
                          aria-label={`Delete ${conv.title}`}
                          className="p-1 rounded text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition cursor-pointer"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                          </svg>
                        </button>
                      </div>
                    </div>

                    {/* Metadata Subtitle */}
                    <div className="flex items-center justify-between text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                      <span>
                        {conv.message_count !== undefined
                          ? `${conv.message_count} ${conv.message_count === 1 ? "turn" : "turns"}`
                          : ""}
                      </span>
                      <span>{formatRelativeTime(conv.updated_at || conv.created_at)}</span>
                    </div>
                  </>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
