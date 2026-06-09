'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Phone, Mail, Calendar, CreditCard,
  Dumbbell, RefreshCw, AlertCircle, DollarSign, Users, MessageCircle, Venus, Mars
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import {
  formatDate, formatDateTime, formatCurrency,
  getInitials, getMemberStatusColor, getMembershipStatusColor, daysRemaining
} from '@/lib/utils';
import Modal from '@/components/ui/Modal';
import { renewMembership } from '@/lib/actions/members';
import CurrencyInput from '@/components/ui/CurrencyInput';
import { useCurrency } from '@/contexts/CurrencyContext';

const METHODS = ['cash', 'card', 'bank_transfer', 'other'];

export default function MemberDetailClient({ member, plans }: { member: any; plans: any[] }) {
  const router = useRouter();
  const { format } = useCurrency();
  const name = member.profile?.full_name ?? 'Unknown';
  const activeMembership = member.memberships?.find((m: any) => m.status === 'active');
  const totalPaid = (member.payments ?? []).reduce((s: number, p: any) => s + Number(p.amount), 0);
  const remaining = activeMembership ? daysRemaining(activeMembership.end_date) : null;

  const sendReminder = () => {
    const phone = member.profile?.phone ?? '';
    if (!phone) return;
    const name = member.profile?.full_name ?? 'there';
    const message = `Hello ${name}, your membership at Salon Raed expires ${remaining === 0 ? 'today' : remaining === 1 ? 'tomorrow' : `in ${remaining} days`}! Don't forget to renew.`;
    const url = `https://wa.me/${phone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  // Renew modal state
  const [renewOpen, setRenewOpen] = useState(false);
  const [renewForm, setRenewForm] = useState({
    plan_id: plans[0]?.id ?? '',
    start_date: new Date().toISOString().split('T')[0],
    payment_method: 'cash',
    record_payment: true,
    custom_price: plans[0]?.price?.toString() ?? '',
  });
  const [renewing, setRenewing] = useState(false);
  const [renewError, setRenewError] = useState('');

  function handleRenewChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const val = e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value;
    if (e.target.name === 'plan_id') {
      const selected = plans.find(p => p.id === val);
      setRenewForm(prev => ({ ...prev, plan_id: val as string, custom_price: selected ? selected.price.toString() : '' }));
    } else {
      setRenewForm(prev => ({ ...prev, [e.target.name]: val }));
    }
  }

  async function handleRenew() {
    if (!renewForm.plan_id) { setRenewError('Please select a plan.'); return; }
    setRenewError('');
    setRenewing(true);
    const paymentAmount = renewForm.custom_price ? parseFloat(renewForm.custom_price) : undefined;
    
    const res = await renewMembership(member.id, {
      plan_id: renewForm.plan_id,
      start_date: renewForm.start_date,
      record_payment: renewForm.record_payment,
      payment_method: renewForm.payment_method,
      custom_price: paymentAmount,
    });

    if (res?.error) {
      setRenewError(res.error);
      setRenewing(false);
      return;
    }

    setRenewOpen(false);
    setRenewing(false);
    router.refresh();
  }

  const selectedPlan = plans.find(p => p.id === renewForm.plan_id);

  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '1.5rem', alignItems: 'start' }}
        className="member-detail-grid">
        {/* Left: Profile */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="card" style={{ textAlign: 'center' }}>
            <div className="avatar avatar-xl" style={{ margin: '0 auto 1rem' }}>
              {member.profile?.avatar_url
                ? <img src={member.profile.avatar_url} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : getInitials(name)}
            </div>
            <h3 style={{ color: 'var(--text-primary)', marginBottom: '0.375rem' }}>{name}</h3>
            <span className={`badge ${getMemberStatusColor(member.status)}`}>{member.status}</span>

            <div className="divider" style={{ margin: '1rem 0' }} />

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', textAlign: 'left' }}>
              {member.profile?.email && !member.profile.email.includes('@amagym.local') && !member.profile.email.includes('@salonraed.local') && (
                <div style={{ display: 'flex', gap: '0.625rem', alignItems: 'center', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                  <Mail size={15} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{member.profile.email}</span>
                </div>
              )}
              {member.profile?.phone && (
                <div style={{ display: 'flex', gap: '0.625rem', alignItems: 'center', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                  <Phone size={15} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                  <a 
                    href={`https://wa.me/${member.profile.phone.replace(/\\D/g, '')}`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    style={{ color: 'inherit', textDecoration: 'none', fontWeight: 500 }}
                    title="Chat on WhatsApp"
                  >
                    {member.profile.phone}
                  </a>
                </div>
              )}

              {member.date_of_birth && (
                <div style={{ display: 'flex', gap: '0.625rem', alignItems: 'center', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                  <Calendar size={15} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                  {formatDate(member.date_of_birth)}
                </div>
              )}
              {member.gender && (
                <div style={{ display: 'flex', gap: '0.625rem', alignItems: 'center', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                  {member.gender === 'male'
                    ? <Mars size={15} style={{ color: '#60a5fa', flexShrink: 0 }} />
                    : <Venus size={15} style={{ color: '#f472b6', flexShrink: 0 }} />}
                  <span style={{
                    textTransform: 'capitalize',
                    fontWeight: 500,
                    color: member.gender === 'male' ? '#60a5fa' : '#f472b6',
                  }}>{member.gender}</span>
                </div>
              )}
            </div>

            {member.notes && (
              <>
                <div className="divider" style={{ margin: '1rem 0' }} />
                <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', textAlign: 'left' }}>{member.notes}</p>
              </>
            )}
          </div>

          {/* Quick Stats */}
          <div className="card">
            <h4 style={{ color: 'var(--text-primary)', marginBottom: '1rem' }}>Quick Stats</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
              {[
                { label: 'Total Paid', value: format(totalPaid), icon: CreditCard, color: '#f59e0b' },
                { label: 'Member Since', value: formatDate(member.created_at), icon: Calendar, color: '#6c63ff' },
              ].map(({ label, value, icon: Icon, color }) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{ width: 36, height: 36, borderRadius: 8, background: `${color}20`, color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Icon size={16} />
                  </div>
                  <div>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{label}</p>
                    <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>{String(value)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Details */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Active Membership */}
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <h4 style={{ color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Dumbbell size={16} style={{ color: 'var(--primary-light)' }} /> Membership
              </h4>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {remaining !== null && remaining <= 1 && member.profile?.phone && (
                  <button className="btn btn-secondary btn-sm" style={{ borderColor: '#25D366', color: '#25D366' }} onClick={sendReminder}>
                    <MessageCircle size={14} /> Send Reminder
                  </button>
                )}
                <button className="btn btn-primary btn-sm" onClick={() => { setRenewOpen(true); setRenewError(''); }} id="renew-btn">
                  <RefreshCw size={14} /> Renew Subscription
                </button>
              </div>
            </div>
            {activeMembership ? (
              <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
                <div>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Plan</p>
                  <p style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{activeMembership.plan?.name}</p>
                </div>
                <div>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Started</p>
                  <p style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{formatDate(activeMembership.start_date)}</p>
                </div>
                <div>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Expires</p>
                  <p style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{formatDate(activeMembership.end_date)}</p>
                </div>
                <div>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Days Left</p>
                  <p style={{ fontWeight: 700, color: remaining !== null && remaining > 7 ? 'var(--success)' : 'var(--danger)' }}>
                    {remaining !== null ? `${remaining} days` : '—'}
                  </p>
                </div>
                <div>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Status</p>
                  <span className={`badge ${getMembershipStatusColor(activeMembership.status)}`}>{activeMembership.status}</span>
                </div>
              </div>
            ) : (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                No active membership. Click <strong>Renew Subscription</strong> to assign one.
              </p>
            )}
          </div>

          {/* Payment History */}
          <div className="card">
            <h4 style={{ color: 'var(--text-primary)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <CreditCard size={16} style={{ color: 'var(--primary-light)' }} /> Payment History
            </h4>
            {(member.payments ?? []).length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>No payments recorded yet.</p>
            ) : (
              <div className="table-wrapper">
                <table className="table">
                  <thead><tr><th>Date</th><th>Amount</th><th>Method</th><th>Notes</th></tr></thead>
                  <tbody>
                    {member.payments.slice().sort((a: any, b: any) => b.payment_date.localeCompare(a.payment_date)).map((p: any) => (
                      <tr key={p.id}>
                        <td>{formatDate(p.payment_date)}</td>
                        <td style={{ color: 'var(--success)', fontWeight: 600 }}>
                          {formatCurrency(p.amount)}
                        </td>
                        <td><span className="badge badge-neutral">{p.payment_method.replace('_', ' ')}</span></td>
                        <td style={{ color: 'var(--text-muted)' }}>{p.notes || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* Renew Subscription Modal */}
      <Modal
        isOpen={renewOpen}
        onClose={() => setRenewOpen(false)}
        title="Renew Subscription"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setRenewOpen(false)}>Cancel</button>
            <button
              className={`btn btn-primary ${renewing ? 'btn-loading' : ''}`}
              onClick={handleRenew}
              disabled={renewing}
              id="confirm-renew-btn"
            >
              {renewing ? <span className="spinner" /> : <RefreshCw size={15} />}
              {renewing ? 'Renewing...' : 'Renew & Save'}
            </button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.125rem' }}>
          {renewError && (
            <div className="alert alert-danger">
              <AlertCircle size={15} /> <span>{renewError}</span>
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Membership Plan <span className="required">*</span></label>
            <select name="plan_id" className="form-input" value={renewForm.plan_id} onChange={handleRenewChange}>
              {plans.map(p => (
                <option key={p.id} value={p.id}>{p.name} — {formatCurrency(p.price)} / {p.duration_days} days</option>
              ))}
            </select>
          </div>

          {selectedPlan && (
            <div style={{ background: 'var(--bg-base)', borderRadius: 10, padding: '0.875rem', fontSize: '0.8125rem', color: 'var(--text-secondary)', display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
              <div>
                <p style={{ color: 'var(--text-muted)', marginBottom: 2 }}>Base Price</p>
                <p style={{ color: 'var(--success)', fontWeight: 700 }}>{format(selectedPlan.price)}</p>
              </div>
              <div>
                <p style={{ color: 'var(--text-muted)', marginBottom: 2 }}>Duration</p>
                <p>{selectedPlan.duration_days} days</p>
              </div>
              <div>
                <p style={{ color: 'var(--text-muted)', marginBottom: 2 }}>New Expiry</p>
                <p>{(() => {
                  const d = new Date(renewForm.start_date);
                  d.setDate(d.getDate() + selectedPlan.duration_days);
                  return formatDate(d.toISOString());
                })()}</p>
              </div>
            </div>
          )}

          <div className="grid-2" style={{ gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Start Date</label>
              <input name="start_date" type="date" className="form-input" value={renewForm.start_date} onChange={handleRenewChange} />
            </div>

            <div className="form-group">
              <label className="form-label">Payment Amount</label>
              <CurrencyInput
                valueUsd={renewForm.custom_price}
                onChange={(val) => setRenewForm(prev => ({ ...prev, custom_price: val }))}
                disabled={!renewForm.record_payment}
                id="renew-custom-price"
              />
            </div>
          </div>

          <div style={{ padding: '0.875rem', background: 'var(--bg-base)', borderRadius: 10, border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: renewForm.record_payment ? '0.875rem' : 0 }}>
              <input
                type="checkbox"
                id="record-payment-check"
                name="record_payment"
                checked={renewForm.record_payment as boolean}
                onChange={handleRenewChange}
                style={{ width: 16, height: 16, accentColor: 'var(--primary)' }}
              />
              <label htmlFor="record-payment-check" className="form-label" style={{ margin: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                <DollarSign size={14} /> Also record a payment entry
              </label>
            </div>
            {renewForm.record_payment && (
              <div className="form-group" style={{ marginTop: '0.75rem', marginBottom: 0 }}>
                <label className="form-label">Payment Method</label>
                <select name="payment_method" className="form-input" value={renewForm.payment_method} onChange={handleRenewChange}>
                  {METHODS.map(m => <option key={m} value={m}>{m.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}</option>)}
                </select>
              </div>
            )}
          </div>
        </div>
      </Modal>
    </>
  );
}
