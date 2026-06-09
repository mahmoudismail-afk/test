'use client';

import { AlertTriangle } from 'lucide-react';
import Modal from './Modal';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'primary';
  loading?: boolean;
}

export default function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'danger',
  loading = false,
}: ConfirmDialogProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm"
      footer={
        <>
          <button className="btn btn-secondary" onClick={onClose} disabled={loading} id="confirm-cancel-btn">
            {cancelLabel}
          </button>
          <button
            className={`btn btn-${variant} ${loading ? 'btn-loading' : ''}`}
            onClick={onConfirm}
            disabled={loading}
            id="confirm-action-btn"
          >
            {loading ? <span className="spinner" /> : null}
            {loading ? 'Please wait...' : confirmLabel}
          </button>
        </>
      }
    >
      <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
        <div style={{
          width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
          background: variant === 'danger' ? 'var(--danger-bg)' : 'var(--warning-bg)',
          color: variant === 'danger' ? 'var(--danger)' : 'var(--warning)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <AlertTriangle size={20} />
        </div>
        <div style={{ color: 'var(--text-secondary)', lineHeight: 1.6, paddingTop: '0.5rem', flex: 1 }}>
          {message}
        </div>
      </div>
    </Modal>
  );
}
