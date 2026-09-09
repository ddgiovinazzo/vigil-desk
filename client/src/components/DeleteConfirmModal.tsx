import React, { useState } from "react";
import { Ticket } from "../types";

interface DeleteConfirmModalProps {
  isOpen: boolean;
  ticket: Ticket | null;
  onClose: () => void;
  onConfirmDelete: (ticketId: number) => Promise<void>;
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  isOpen,
  ticket,
  onClose,
  onConfirmDelete,
}) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !ticket) return null;

  const handleDelete = async () => {
    setError(null);
    setIsDeleting(true);
    try {
      await onConfirmDelete(ticket.id);
      onClose();
    } catch (err: any) {
      setError(err?.message || "Failed to delete ticket.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div
        className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden p-6 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center font-bold text-lg border border-rose-500/20 shrink-0">
            ⚠️
          </div>
          <div>
            <h3 id="delete-modal-title" className="font-bold text-base text-slate-900 dark:text-white">
              Delete Ticket?
            </h3>
            <span className="text-xs font-mono font-bold text-rose-600 dark:text-rose-400">
              {ticket.ticket_number}
            </span>
          </div>
        </div>

        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
          Are you sure you want to permanently delete{" "}
          <strong className="text-slate-900 dark:text-white font-semibold">"{ticket.title}"</strong>?
          This action cannot be undone.
        </p>

        {error && (
          <div className="p-3 text-xs font-semibold rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
            {error}
          </div>
        )}

        <div className="pt-2 flex items-center justify-end space-x-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="px-4 py-2 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={isDeleting}
            className="px-5 py-2 text-xs font-bold rounded-xl bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white transition shadow-sm cursor-pointer disabled:opacity-50 flex items-center space-x-1.5"
          >
            {isDeleting && <span className="animate-spin text-xs">⏳</span>}
            <span>Delete Permanently</span>
          </button>
        </div>
      </div>
    </div>
  );
};
