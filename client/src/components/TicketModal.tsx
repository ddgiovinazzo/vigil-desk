import React, { useState } from "react";
import { Ticket } from "../types";

interface TicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (ticketData: Partial<Ticket>) => Promise<void>;
  initialTicket?: Ticket | null; // If provided, modal is in Edit mode; otherwise Create mode
}

export const TicketModal: React.FC<TicketModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialTicket,
}) => {
  const isEdit = Boolean(initialTicket);

  const [title, setTitle] = useState(initialTicket?.title || "");
  const [description, setDescription] = useState(initialTicket?.description || "");
  const [category, setCategory] = useState<string>(initialTicket?.category || "HR & Benefits");
  const [priority, setPriority] = useState<string>(initialTicket?.priority || "medium");
  const [status, setStatus] = useState<string>(initialTicket?.status || "open");
  const [channel, setChannel] = useState<string>(initialTicket?.channel || "Workday Portal");
  const [requesterName, setRequesterName] = useState(initialTicket?.requester_name || "");
  const [requesterEmail, setRequesterEmail] = useState(initialTicket?.requester_email || "");
  const [requesterDepartment, setRequesterDepartment] = useState(
    initialTicket?.requester_department || "Commercial Operations"
  );
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sync state when initialTicket changes or modal opens
  React.useEffect(() => {
    if (initialTicket) {
      setTitle(initialTicket.title || "");
      setDescription(initialTicket.description || "");
      setCategory(initialTicket.category || "HR & Benefits");
      setPriority(initialTicket.priority || "medium");
      setStatus(initialTicket.status || "open");
      setChannel(initialTicket.channel || "Workday Portal");
      setRequesterName(initialTicket.requester_name || "");
      setRequesterEmail(initialTicket.requester_email || "");
      setRequesterDepartment(initialTicket.requester_department || "Commercial Operations");
    } else {
      setTitle("");
      setDescription("");
      setCategory("HR & Benefits");
      setPriority("medium");
      setStatus("open");
      setChannel("Workday Portal");
      setRequesterName("");
      setRequesterEmail("");
      setRequesterDepartment("Commercial Operations");
    }
    setError(null);
    setIsSubmitting(false);
  }, [initialTicket, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError("Please enter a ticket title.");
      return;
    }
    if (!description.trim()) {
      setError("Please enter a ticket description.");
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      await onSubmit({
        title: title.trim(),
        description: description.trim(),
        category,
        priority,
        status,
        channel,
        requester_name: requesterName.trim() || undefined,
        requester_email: requesterEmail.trim() || undefined,
        requester_department: requesterDepartment.trim() || undefined,
      });
      onClose();
    } catch (err: any) {
      setError(err?.message || "Failed to save ticket. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="ticket-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div
        className="w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-base border border-blue-500/20">
              {isEdit ? "✏️" : "🎫"}
            </div>
            <div>
              <h2 id="ticket-modal-title" className="font-bold text-base text-slate-900 dark:text-white">
                {isEdit ? `Edit Ticket ${initialTicket?.ticket_number || ""}` : "Create New Support Ticket"}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {isEdit
                  ? "Update support ticket details, metadata, and status"
                  : "Add an employee support issue to the human specialist queue"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            title="Close modal"
          >
            ✕
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-4">
          {error && (
            <div className="p-3 text-xs font-semibold rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
              {error}
            </div>
          )}

          {/* Title */}
          <div>
            <label htmlFor="ticket-title-input" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Ticket Title <span className="text-rose-500">*</span>
            </label>
            <input
              id="ticket-title-input"
              type="text"
              required
              placeholder="e.g. Parental Leave Request & Healthcare Enrollment"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl text-xs bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Description */}
          <div>
            <label htmlFor="ticket-desc-input" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Description <span className="text-rose-500">*</span>
            </label>
            <textarea
              id="ticket-desc-input"
              required
              rows={4}
              placeholder="Describe the employee request or issue in detail..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl text-xs bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
            />
          </div>

          {/* Grid: Category & Priority & Status */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label htmlFor="ticket-category-select" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Category
              </label>
              <select
                id="ticket-category-select"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 rounded-xl text-xs font-medium bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
              >
                <option value="HR & Benefits">HR & Benefits</option>
                <option value="Leaves & Disability">Leaves & Disability</option>
                <option value="Policies & Claims">Policies & Claims</option>
                <option value="IT Support">IT Support</option>
                <option value="General">General</option>
              </select>
            </div>

            <div>
              <label htmlFor="ticket-priority-select" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Priority
              </label>
              <select
                id="ticket-priority-select"
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full px-3 py-2 rounded-xl text-xs font-medium bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>

            <div>
              <label htmlFor="ticket-status-select" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Status
              </label>
              <select
                id="ticket-status-select"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full px-3 py-2 rounded-xl text-xs font-medium bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
              >
                <option value="open">Open</option>
                <option value="in_triage">In Triage</option>
                <option value="draft_pending">Draft Pending</option>
                <option value="escalated">Escalated</option>
                <option value="resolved">Resolved</option>
              </select>
            </div>
          </div>

          {/* Grid: Requester Name, Email, Department */}
          <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
            <span className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
              Requester Information
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label htmlFor="ticket-req-name" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Requester Name
                </label>
                <input
                  id="ticket-req-name"
                  type="text"
                  placeholder="Jane Doe"
                  value={requesterName}
                  onChange={(e) => setRequesterName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-xs bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label htmlFor="ticket-req-email" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Requester Email
                </label>
                <input
                  id="ticket-req-email"
                  type="email"
                  placeholder="jane.doe@apexcare.tech"
                  value={requesterEmail}
                  onChange={(e) => setRequesterEmail(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-xs bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label htmlFor="ticket-req-dept" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Department
                </label>
                <input
                  id="ticket-req-dept"
                  type="text"
                  placeholder="Commercial Operations"
                  value={requesterDepartment}
                  onChange={(e) => setRequesterDepartment(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-xs bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Channel */}
          <div>
            <label htmlFor="ticket-channel-select" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Filing Channel
            </label>
            <select
              id="ticket-channel-select"
              value={channel}
              onChange={(e) => setChannel(e.target.value)}
              className="w-full sm:w-1/2 px-3 py-2 rounded-xl text-xs font-medium bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              <option value="Workday Portal">Workday Portal</option>
              <option value="Slack HR Connect">Slack HR Connect</option>
              <option value="Email">Email</option>
              <option value="Helpdesk">Helpdesk</option>
            </select>
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white transition shadow-sm cursor-pointer disabled:opacity-50 flex items-center space-x-1.5"
            >
              {isSubmitting && <span className="animate-spin text-xs">⏳</span>}
              <span>{isEdit ? "Save Changes" : "Create Ticket"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
