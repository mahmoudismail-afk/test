'use server';

import { getAdmin } from '@/lib/db';
import { revalidatePath } from 'next/cache';

export async function createExpense(payload: any) {
  try {
    const { data, error } = await getAdmin()
      .from('expenses')
      .insert({
        type: payload.type,
        title: payload.title,
        amount: payload.amount,
        amount_lbp: payload.amount_lbp ?? null,
        currency: payload.currency ?? 'USD',
        date: payload.date,
        notes: payload.notes || null,
        is_recurring: payload.is_recurring,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    revalidatePath('/expenses');
    return { data };
  } catch (err: any) {
    return { error: err.message };
  }
}

export async function updateExpense(id: string, payload: any) {
  try {
    const { data, error } = await getAdmin()
      .from('expenses')
      .update({
        type: payload.type,
        title: payload.title,
        amount: payload.amount,
        amount_lbp: payload.amount_lbp ?? null,
        currency: payload.currency ?? 'USD',
        date: payload.date,
        notes: payload.notes || null,
        is_recurring: payload.is_recurring,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    revalidatePath('/expenses');
    return { data };
  } catch (err: any) {
    return { error: err.message };
  }
}

export async function deleteExpense(id: string) {
  try {
    const { error } = await getAdmin()
      .from('expenses')
      .delete()
      .eq('id', id);

    if (error) throw new Error(error.message);
    revalidatePath('/expenses');
    return { success: true };
  } catch (err: any) {
    return { error: err.message };
  }
}
