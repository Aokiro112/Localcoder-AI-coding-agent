import { ShieldAlert, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { useAgentStore } from '../../store/agentStore';
import { approvalApi } from '../../api/client';

export function ApprovalModal() {
  const { pendingApproval, setPendingApproval } = useAgentStore();

  if (!pendingApproval) return null;

  const handleApprove = async () => {
    await approvalApi.approve(pendingApproval.id);
    setPendingApproval(null);
  };

  const handleReject = async () => {
    await approvalApi.reject(pendingApproval.id);
    setPendingApproval(null);
  };

  const isDelete = pendingApproval.type === 'deleteFile';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-surface-900 border border-white/10 rounded-2xl shadow-2xl w-full max-w-md mx-4 animate-slide-up">
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-white/5">
          <div className="w-9 h-9 rounded-xl bg-warning/15 flex items-center justify-center">
            <ShieldAlert size={18} className="text-warning" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">Approval Required</h3>
            <p className="text-xs text-slate-500">
              {isDelete ? 'File deletion' : 'Dangerous command'} needs your confirmation
            </p>
          </div>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {isDelete && (
            <div className="flex items-start gap-3 p-3 rounded-xl bg-danger/10 border border-danger/20">
              <AlertTriangle size={16} className="text-danger flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-danger">Delete File</p>
                <p className="text-xs text-danger/70 mt-0.5">
                  This will permanently delete the file. This cannot be undone.
                </p>
              </div>
            </div>
          )}

          <div>
            <p className="text-xs text-slate-500 mb-2">Operation Details</p>
            <pre className="text-xs font-mono text-slate-200 bg-black/40 border border-white/5 rounded-xl p-3 overflow-x-auto whitespace-pre-wrap break-all">
              {pendingApproval.description}
            </pre>
          </div>

          {pendingApproval.payload && (
            <div>
              <p className="text-xs text-slate-500 mb-2">Payload</p>
              <pre className="text-xs font-mono text-slate-400 bg-black/40 border border-white/5 rounded-xl p-3 overflow-x-auto max-h-32 overflow-y-auto">
                {JSON.stringify(pendingApproval.payload, null, 2)}
              </pre>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 px-5 py-4 border-t border-white/5">
          <button
            id="btn-approval-reject"
            onClick={() => void handleReject()}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white text-sm font-medium transition-all"
          >
            <XCircle size={15} />
            Reject
          </button>
          <button
            id="btn-approval-approve"
            onClick={() => void handleApprove()}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-success/15 hover:bg-success/25 text-success text-sm font-medium transition-all border border-success/20"
          >
            <CheckCircle size={15} />
            Approve
          </button>
        </div>
      </div>
    </div>
  );
}
