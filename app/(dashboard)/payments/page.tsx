import { query } from '@/lib/db';
import PaymentsClient from '@/components/payments/PaymentsClient';
import { requirePermission } from '@/lib/auth-guard';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Payments' };
export const dynamic = 'force-dynamic';

export default async function PaymentsPage() {
  await requirePermission('payments');

  const [paymentsRes, deletedPaymentsRes, membersRes] = await Promise.all([
    query(`
      SELECT p.*, pr.full_name as member_name
      FROM payments p
      LEFT JOIN members m ON p.member_id = m.id
      LEFT JOIN profiles pr ON m.profile_id = pr.id
      WHERE p.deleted_at IS NULL
      ORDER BY p.payment_date DESC
      LIMIT 200
    `),
    query(`
      SELECT p.*, pr.full_name as member_name
      FROM payments p
      LEFT JOIN members m ON p.member_id = m.id
      LEFT JOIN profiles pr ON m.profile_id = pr.id
      WHERE p.deleted_at IS NOT NULL
      ORDER BY p.deleted_at DESC
      LIMIT 200
    `),
    query(`
      SELECT m.id, pr.full_name
      FROM members m
      LEFT JOIN profiles pr ON m.profile_id = pr.id
      WHERE m.status = 'active'
    `),
  ]);

  const payments = paymentsRes.rows.map(r => ({
    ...r,
    member: { profile: { full_name: r.member_name } }
  }));
  const deletedPayments = deletedPaymentsRes.rows.map(r => ({
    ...r,
    member: { profile: { full_name: r.member_name } }
  }));
  const members = membersRes.rows.map(r => ({
    id: r.id,
    profile: { full_name: r.full_name }
  }));

  return <PaymentsClient payments={payments} deletedPayments={deletedPayments} members={members} />;
}
