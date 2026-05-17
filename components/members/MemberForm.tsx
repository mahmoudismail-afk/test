'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { User, Mail, Phone, Calendar, AlertCircle, Save } from 'lucide-react';
import { createMember, updateMember } from '@/lib/actions/members';
import CurrencyInput from '@/components/ui/CurrencyInput';

interface MemberFormProps {
  plans: { id: string; name: string; price: number; duration_days: number }[];
  member?: any;
  profile?: any;
  isEdit?: boolean;
}

export default function MemberForm({ plans, member, profile, isEdit = false }: MemberFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    full_name: profile?.full_name ?? '',
    email: profile?.email ?? '',
    phone: profile?.phone ?? '',
    date_of_birth: member?.date_of_birth ?? '',
    gender: member?.gender ?? '',
    joined_at: member?.created_at ? member.created_at.split('T')[0] : '',
    notes: member?.notes ?? '',
    status: member?.status ?? 'active',
    plan_id: '',
    custom_price: '',
  });

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (isEdit && member) {
      const result = await updateMember(member.id, member.profile_id, {
        full_name: form.full_name,
        phone: form.phone,
        date_of_birth: form.date_of_birth,
        gender: form.gender,
        notes: form.notes,
        status: form.status,
      });

      if (result.error) { setError(result.error); setLoading(false); return; }
      router.push(`/members/${member.id}`);
      router.refresh();
    } else {
      const result = await createMember({
        full_name: form.full_name,
        phone: form.phone,
        email: form.email || undefined,
        date_of_birth: form.date_of_birth,
        gender: form.gender,
        joined_at: form.joined_at || undefined,
        notes: form.notes,
        status: form.status,
        plan_id: form.plan_id || undefined,
        custom_price: form.custom_price ? parseFloat(form.custom_price) : undefined,
      });

      if (result.error) { setError(result.error); setLoading(false); return; }
      router.push('/members');
      router.refresh();
    }

    setLoading(false);
  }

  return (
    <form onSubmit={handleSubmit} id="member-form" className="animate-fade">
      {error && (
        <div className="alert alert-danger" style={{ marginBottom: '1.5rem' }}>
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        {/* Personal Info */}
        <div className="card">
          <h3 style={{ color: 'var(--text-primary)', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <User size={18} style={{ color: 'var(--primary-light)' }} /> Personal Information
          </h3>
          <div className="grid-2" style={{ gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Full Name <span className="required">*</span></label>
              <div className="input-with-icon">
                <User size={15} className="input-icon" />
                <input name="full_name" type="text" className="form-input"
                  placeholder="John Smith" value={form.full_name} onChange={handleChange} required />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Phone Number <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>(optional)</span></label>
              <div className="input-with-icon">
                <Phone size={15} className="input-icon" />
                <input name="phone" type="tel" className="form-input"
                  placeholder="+1 555 000 0000" value={form.phone} onChange={handleChange} />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Email Address <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>(optional)</span></label>
              <div className="input-with-icon">
                <Mail size={15} className="input-icon" />
                <input name="email" type="email" className="form-input"
                  placeholder="john@example.com" value={form.email} onChange={handleChange}
                  disabled={isEdit} />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Date of Birth</label>
              <input name="date_of_birth" type="date" className="form-input"
                value={form.date_of_birth} onChange={handleChange} />
            </div>

            <div className="form-group">
              <label className="form-label">Gender</label>
              <select name="gender" className="form-input" value={form.gender} onChange={handleChange}>
                <option value="">Select gender</option>
                <option value="male">♂ Male</option>
                <option value="female">♀ Female</option>
              </select>
            </div>


            <div className="form-group">
              <label className="form-label">Status</label>
              <select name="status" className="form-input" value={form.status} onChange={handleChange}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="paused">Paused</option>
                <option value="expired">Expired</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Membership Start Date <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>(optional)</span></label>
              <div className="input-with-icon">
                <Calendar size={15} className="input-icon" />
                <input name="joined_at" type="date" className="form-input"
                  value={form.joined_at} onChange={handleChange}
                  max={new Date().toISOString().split('T')[0]} />
              </div>
              <span className="form-hint">This sets when the plan starts. Leave blank to use today&apos;s date.</span>
            </div>
          </div>
        </div>

        {/* Membership Plan (new member only) */}
        {!isEdit && plans.length > 0 && (
          <div className="card">
            <h3 style={{ color: 'var(--text-primary)', marginBottom: '1.25rem' }}>Membership Plan</h3>
            <div className="grid-2" style={{ gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Assign Plan <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>(optional)</span></label>
                <select name="plan_id" className="form-input" value={form.plan_id} onChange={(e) => {
                  const pid = e.target.value;
                  const selectedPlan = plans.find(p => p.id === pid);
                  setForm(prev => ({
                    ...prev,
                    plan_id: pid,
                    custom_price: selectedPlan ? selectedPlan.price.toString() : ''
                  }));
                }}>
                  <option value="">No plan yet</option>
                  {plans.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} — ${p.price} / {p.duration_days} days
                    </option>
                  ))}
                </select>
                <span className="form-hint">A payment record will be created automatically.</span>
              </div>
              
              {form.plan_id && (
                <div className="form-group">
                  <label className="form-label">Payment Amount</label>
                  <CurrencyInput
                    valueUsd={form.custom_price}
                    onChange={(val) => setForm(prev => ({ ...prev, custom_price: val }))}
                    id="custom-price"
                  />
                  <span className="form-hint">Overrides plan price for this payment.</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Notes */}
        <div className="card">
          <h3 style={{ color: 'var(--text-primary)', marginBottom: '1.25rem' }}>Notes</h3>
          <div className="form-group">
            <textarea name="notes" className="form-input" rows={4}
              placeholder="Any additional notes about this member..."
              value={form.notes} onChange={handleChange}
              style={{ resize: 'vertical' }} />
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
          <button type="button" className="btn btn-secondary" onClick={() => router.back()}>
            Cancel
          </button>
          <button type="submit" id="member-submit-btn"
            className={`btn btn-primary ${loading ? 'btn-loading' : ''}`} disabled={loading}>
            {loading ? <span className="spinner" /> : <Save size={16} />}
            {loading ? 'Saving...' : isEdit ? 'Save Changes' : 'Add Member'}
          </button>
        </div>
      </div>
    </form>
  );
}
