'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Plus, Trash2, Pencil, AlertCircle, Receipt,
  Wallet, TrendingDown, Filter, CheckCircle,
} from 'lucide-react';
import { createExpense, updateExpense, deleteExpense } from '@/lib/actions/expenses';
import { formatDate } from '@/lib/utils';
import Modal from '@/components/ui/Modal';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { useCurrency } from '@/contexts/CurrencyContext';
import { formatLBP, formatUSD, usdToLbp, lbpToUsd } from '@/lib/currency';

export type Expense = {
  id: string;
  type: 'expense' | 'salary';
  title: string;
  amount: number;       // always stored in USD
  amount_lbp?: number | null; // raw LBP if entered in LBP
  currency?: 'USD' | 'LBP';  // which currency was entered
  date: string;
  notes?: string | null;
  is_recurring?: boolean;
  created_at: string;
};

const METHODS = [
  { value: 'expense', label: 'Expense' },
  { value: 'salary', label: 'Salary' },
];

const MONTH_OPTIONS = [
  { value: '', label: 'All Months' },
  { value: '01', label: 'January' },
  { value: '02', label: 'February' },
  { value: '03', label: 'March' },
  { value: '04', label: 'April' },
  { value: '05', label: 'May' },
  { value: '06', label: 'June' },
  { value: '07', label: 'July' },
  { value: '08', label: 'August' },
  { value: '09', label: 'September' },
  { value: '10', label: 'October' },
  { value: '11', label: 'November' },
  { value: '12', label: 'December' },
];

const EMPTY_FORM = {
  type: 'expense' as 'expense' | 'salary',
  title: '',
  amountUsd: '',       // USD amount (string for input)
  amountLbp: '',       // LBP amount (string for input)
  inputCurrency: 'USD' as 'USD' | 'LBP',
  date: new Date().toISOString().split('T')[0],
  notes: '',
  is_recurring: false,
};

export default function ExpensesClient({ initialExpenses }: { initialExpenses: Expense[] }) {
  const router = useRouter();
  const { lbpRate } = useCurrency();
  const [expenses, setExpenses] = useState<Expense[]>(initialExpenses);
  const [filterType, setFilterType] = useState('');
  const [filterMonth, setFilterMonth] = useState('');

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [postingRecurring, setPostingRecurring] = useState(false);

  // Delete state
  const [deleteTarget, setDeleteTarget] = useState<Expense | null>(null);
  const [deleting, setDeleting] = useState(false);

  // ─── Currency toggle in modal ────────────────────────────────────────────
  function toggleInputCurrency() {
    const next = form.inputCurrency === 'USD' ? 'LBP' : 'USD';
    // Try to cross-convert so the value persists after switching
    if (next === 'LBP') {
      const usd = parseFloat(form.amountUsd);
      const lbp = !isNaN(usd) && usd > 0
        ? String(Math.round(usdToLbp(usd, lbpRate) / 1000) * 1000)
        : '';
      setForm(prev => ({ ...prev, inputCurrency: 'LBP', amountLbp: lbp }));
    } else {
      const lbp = parseFloat(form.amountLbp);
      const usd = !isNaN(lbp) && lbp > 0
        ? String(lbpToUsd(lbp, lbpRate))
        : '';
      setForm(prev => ({ ...prev, inputCurrency: 'USD', amountUsd: usd }));
    }
  }

  function handleAmountChange(raw: string) {
    if (form.inputCurrency === 'LBP') {
      const lbp = parseFloat(raw);
      const usd = !isNaN(lbp) && lbp > 0 ? String(lbpToUsd(lbp, lbpRate)) : '';
      setForm(prev => ({ ...prev, amountLbp: raw, amountUsd: usd }));
    } else {
      const usd = parseFloat(raw);
      const lbp = !isNaN(usd) && usd > 0
        ? String(Math.round(usdToLbp(usd, lbpRate) / 1000) * 1000)
        : '';
      setForm(prev => ({ ...prev, amountUsd: raw, amountLbp: lbp }));
    }
  }

  // ─── Recurring ───────────────────────────────────────────────────────────
  async function handlePostRecurring() {
    setPostingRecurring(true);
    const recurringSalaries = expenses.filter(e => e.type === 'salary' && e.is_recurring);
    const uniqueTitles = Array.from(new Set(recurringSalaries.map(e => e.title)));
    const currentMonthPrefix = new Date().toISOString().slice(0, 7);
    const today = new Date().toISOString().split('T')[0];
    let addedCount = 0;

    for (const title of uniqueTitles) {
      const template = recurringSalaries.find(e => e.title === title)!;
      const existsThisMonth = expenses.some(
        e => e.title === title && e.date.startsWith(currentMonthPrefix)
      );
      if (!existsThisMonth) {
        const payload = {
          type: 'salary',
          title: template.title,
          amount: template.amount,
          amount_lbp: template.amount_lbp ?? null,
          currency: template.currency ?? 'USD',
          date: today,
          notes: template.notes,
          is_recurring: true,
        };
        const { data, error } = await createExpense(payload);
        if (!error && data) {
          setExpenses(prev => [data, ...prev]);
          addedCount++;
        }
      }
    }

    setPostingRecurring(false);
    if (addedCount > 0) router.refresh();
    else alert('No new recurring salaries to post this month.');
  }

  // ─── Open modal ──────────────────────────────────────────────────────────
  function openAdd() {
    setEditing(null);
    setForm({ ...EMPTY_FORM });
    setSaveError('');
    setModalOpen(true);
  }

  function openEdit(exp: Expense) {
    setEditing(exp);
    const inputCurrency = exp.currency === 'LBP' ? 'LBP' : 'USD';
    setForm({
      type: exp.type,
      title: exp.title,
      amountUsd: String(exp.amount),
      amountLbp: exp.amount_lbp ? String(exp.amount_lbp) : String(Math.round(usdToLbp(exp.amount, lbpRate) / 1000) * 1000),
      inputCurrency,
      date: exp.date,
      notes: exp.notes ?? '',
      is_recurring: exp.is_recurring ?? false,
    });
    setSaveError('');
    setModalOpen(true);
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    const value = e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value;
    setForm(prev => ({ ...prev, [e.target.name]: value }));
  }

  // ─── Save ────────────────────────────────────────────────────────────────
  async function handleSave() {
    if (!form.title.trim()) { setSaveError('Title is required.'); return; }

    const amountUsd = parseFloat(form.amountUsd);
    const amountLbp = parseFloat(form.amountLbp);

    if (isNaN(amountUsd) || amountUsd <= 0) { setSaveError('Please enter a valid amount.'); return; }
    if (!form.date) { setSaveError('Date is required.'); return; }

    setSaveError('');
    setSaving(true);

    const payload = {
      type: form.type,
      title: form.title.trim(),
      amount: amountUsd,
      amount_lbp: !isNaN(amountLbp) && amountLbp > 0 ? amountLbp : null,
      currency: form.inputCurrency,
      date: form.date,
      notes: form.notes.trim() || null,
      is_recurring: form.type === 'salary' ? form.is_recurring : false,
    };

    if (editing) {
      const { error } = await updateExpense(editing.id, payload);
      if (error) { setSaveError(error); setSaving(false); return; }
      setExpenses(prev => prev.map(e => e.id === editing.id ? { ...e, ...payload } : e));
    } else {
      const { data, error } = await createExpense(payload);
      if (error) { setSaveError(error); setSaving(false); return; }
      setExpenses(prev => [data, ...prev]);
    }

    setSaving(false);
    setModalOpen(false);
    router.refresh();
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    const { error } = await deleteExpense(deleteTarget.id);
    if (!error) {
      setExpenses(prev => prev.filter(e => e.id !== deleteTarget.id));
      router.refresh();
    }
    setDeleteTarget(null);
    setDeleting(false);
  }

  // ─── Derived totals (always in USD for summary cards) ────────────────────
  const filtered = useMemo(() => {
    return expenses.filter(e => {
      const typeMatch = !filterType || e.type === filterType;
      const monthMatch = !filterMonth || e.date.startsWith(`${new Date().getFullYear()}-${filterMonth}`);
      return typeMatch && monthMatch;
    }).sort((a, b) => b.date.localeCompare(a.date));
  }, [expenses, filterType, filterMonth]);

  const totalExpenses = filtered.filter(e => e.type === 'expense').reduce((s, e) => s + Number(e.amount), 0);
  const totalSalaries = filtered.filter(e => e.type === 'salary').reduce((s, e) => s + Number(e.amount), 0);
  const grandTotal = totalExpenses + totalSalaries;

  // Display amount for a row — show original currency if recorded
  function displayAmount(exp: Expense) {
    if (exp.currency === 'LBP' && exp.amount_lbp) {
      return formatLBP(exp.amount_lbp);
    }
    return formatUSD(Number(exp.amount));
  }

  const isLBP = form.inputCurrency === 'LBP';
  const amountDisplay = isLBP ? form.amountLbp : form.amountUsd;

  return (
    <>
      {/* Summary Cards */}
      <div className="grid-stats" style={{ marginBottom: '1.5rem' }}>
        {[
          { label: 'Total Expenses', value: formatUSD(totalExpenses), icon: Receipt, color: '#ef4444', bg: 'rgba(239,68,68,0.15)' },
          { label: 'Total Salaries', value: formatUSD(totalSalaries), icon: Wallet, color: '#f59e0b', bg: 'rgba(245,158,11,0.15)' },
          { label: 'Grand Total', value: formatUSD(grandTotal), icon: TrendingDown, color: '#8b5cf6', bg: 'rgba(139,92,246,0.15)' },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.25rem' }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: bg, color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Icon size={20} />
            </div>
            <div>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>{label}</p>
              <p style={{ fontSize: '1.375rem', fontWeight: 700, color: 'var(--text-primary)' }}>{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Table Card */}
      <div className="card" style={{ padding: 0 }}>
        {/* Toolbar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem', padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <Filter size={15} style={{ color: 'var(--text-muted)' }} />
            <select
              className="form-input"
              style={{ width: 'auto', minWidth: 130, padding: '0.4rem 0.75rem', fontSize: '0.875rem' }}
              value={filterType}
              onChange={e => setFilterType(e.target.value)}
              id="filter-type"
            >
              <option value="">All Types</option>
              <option value="expense">Expense</option>
              <option value="salary">Salary</option>
            </select>
            <select
              className="form-input"
              style={{ width: 'auto', minWidth: 150, padding: '0.4rem 0.75rem', fontSize: '0.875rem' }}
              value={filterMonth}
              onChange={e => setFilterMonth(e.target.value)}
              id="filter-month"
            >
              {MONTH_OPTIONS.map(m => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button className={`btn btn-secondary btn-sm ${postingRecurring ? 'btn-loading' : ''}`} onClick={handlePostRecurring} disabled={postingRecurring}>
              {postingRecurring ? <span className="spinner" /> : <Plus size={15} />} Post Recurring
            </button>
            <button className="btn btn-primary btn-sm" onClick={openAdd} id="add-expense-btn">
              <Plus size={15} /> Add Entry
            </button>
          </div>
        </div>

        {/* Table */}
        {filtered.length === 0 ? (
          <div className="empty-state" style={{ padding: '3rem' }}>
            <Receipt size={40} style={{ color: 'var(--text-muted)', marginBottom: '0.75rem' }} />
            <p style={{ color: 'var(--text-muted)' }}>No entries found. Add your first expense or salary.</p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Title</th>
                  <th>Amount</th>
                  <th>Notes</th>
                  <th style={{ width: 80 }}></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(exp => (
                  <tr key={exp.id}>
                    <td style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>{formatDate(exp.date)}</td>
                    <td>
                      <span className={`badge ${exp.type === 'salary' ? 'badge-warning' : 'badge-danger'}`}
                        style={{
                          background: exp.type === 'salary' ? 'rgba(245,158,11,0.15)' : 'rgba(239,68,68,0.15)',
                          color: exp.type === 'salary' ? '#f59e0b' : '#ef4444',
                          border: 'none',
                          textTransform: 'capitalize',
                        }}>
                        {exp.type}
                      </span>
                    </td>
                    <td style={{ fontWeight: 500, color: 'var(--text-primary)' }}>
                      {exp.title}
                      {exp.is_recurring && (
                        <span className="badge badge-accent" style={{ marginLeft: 8, fontSize: '0.65rem' }}>Recurring</span>
                      )}
                    </td>
                    <td>
                      <div style={{ color: '#ef4444', fontWeight: 600 }}>
                        {displayAmount(exp)}
                      </div>
                      {/* Show USD equivalent if LBP was used */}
                      {exp.currency === 'LBP' && exp.amount_lbp && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          ≈ {formatUSD(Number(exp.amount))}
                        </div>
                      )}
                    </td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>{exp.notes || '—'}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.375rem' }}>
                        <button className="btn btn-ghost btn-sm btn-icon" onClick={() => openEdit(exp)} title="Edit">
                          <Pencil size={14} />
                        </button>
                        <button className="btn btn-ghost btn-sm btn-icon" style={{ color: 'var(--danger)' }} onClick={() => setDeleteTarget(exp)} title="Delete">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit Entry' : 'Add Expense / Salary'}
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
            <button
              className={`btn btn-primary ${saving ? 'btn-loading' : ''}`}
              onClick={handleSave}
              disabled={saving}
              id="save-expense-btn"
            >
              {saving ? <span className="spinner" /> : <CheckCircle size={15} />}
              {saving ? 'Saving...' : editing ? 'Update Entry' : 'Add Entry'}
            </button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {saveError && (
            <div className="alert alert-danger">
              <AlertCircle size={15} /> <span>{saveError}</span>
            </div>
          )}

          <div className="grid-2" style={{ gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Type <span className="required">*</span></label>
              <select name="type" className="form-input" value={form.type} onChange={handleChange}>
                {METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Date <span className="required">*</span></label>
              <input name="date" type="date" className="form-input" value={form.date} onChange={handleChange} />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Title <span className="required">*</span></label>
            <input name="title" type="text" className="form-input" placeholder="e.g. Electricity bill, Staff salary…"
              value={form.title} onChange={handleChange} />
          </div>

          {/* Amount with USD/LBP toggle */}
          <div className="form-group">
            <label className="form-label">Amount <span className="required">*</span></label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {/* Currency toggle pill */}
              <button
                type="button"
                onClick={toggleInputCurrency}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  gap: '0.2rem', padding: '0 0.75rem',
                  fontSize: isLBP ? '0.7rem' : '0.85rem',
                  fontWeight: 700,
                  color: isLBP ? '#f59e0b' : '#10b981',
                  background: isLBP ? 'rgba(245,158,11,0.12)' : 'rgba(16,185,129,0.12)',
                  border: `1.5px solid ${isLBP ? 'rgba(245,158,11,0.35)' : 'rgba(16,185,129,0.35)'}`,
                  borderRadius: '0.5rem', cursor: 'pointer', whiteSpace: 'nowrap',
                  transition: 'all 0.18s ease', minWidth: '3.5rem', userSelect: 'none',
                }}
              >
                {isLBP ? 'ل.ل' : '$'} <span style={{ fontSize: '0.6rem', opacity: 0.7, marginLeft: 1 }}>▾</span>
              </button>
              <input
                id="expense-amount"
                type="number"
                min="0"
                step={isLBP ? '1000' : '0.01'}
                className="form-input"
                placeholder={isLBP ? '0' : '0.00'}
                value={amountDisplay}
                onChange={e => handleAmountChange(e.target.value)}
                style={{ flex: 1 }}
              />
            </div>
            {/* Show equivalent in other currency */}
            {amountDisplay && parseFloat(amountDisplay) > 0 && (
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
                {isLBP
                  ? `≈ ${formatUSD(parseFloat(form.amountUsd || '0'))}`
                  : `≈ ${formatLBP(usdToLbp(parseFloat(form.amountUsd || '0'), lbpRate))}`}
              </p>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">Notes</label>
            <textarea
              name="notes"
              className="form-input"
              style={{ resize: 'vertical', minHeight: 72 }}
              placeholder="Optional note…"
              value={form.notes}
              onChange={handleChange}
            />
          </div>

          {form.type === 'salary' && (
            <div className="form-group" style={{ flexDirection: 'row', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
              <input type="checkbox" name="is_recurring" id="is_recurring" checked={form.is_recurring} onChange={handleChange} style={{ width: 16, height: 16 }} />
              <label htmlFor="is_recurring" className="form-label" style={{ cursor: 'pointer', marginBottom: 0 }}>
                Mark as recurring monthly salary
              </label>
            </div>
          )}
        </div>
      </Modal>

      {/* Delete Confirm */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Entry"
        message={`Are you sure you want to delete "${deleteTarget?.title}"? This action cannot be undone.`}
        confirmLabel="Delete"
        loading={deleting}
      />
    </>
  );
}
