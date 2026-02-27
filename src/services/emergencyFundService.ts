import {
  collection,
  doc,
  addDoc,
  deleteDoc,
  query,
  orderBy,
  onSnapshot,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { EmergencyFundTransaction, EmergencyFundTransactionFormData } from '../types';
import { startOfDay } from 'date-fns';

function txCollection(userId: string) {
  return collection(db, 'users', userId, 'emergencyFund');
}

function txDoc(userId: string, txId: string) {
  return doc(db, 'users', userId, 'emergencyFund', txId);
}

export async function addTransaction(
  userId: string,
  formData: EmergencyFundTransactionFormData
): Promise<string> {
  const now = Timestamp.now();
  const data: Omit<EmergencyFundTransaction, 'id'> = {
    description: formData.description.trim(),
    amount: formData.amount,
    date: Timestamp.fromDate(startOfDay(formData.date)),
    createdAt: now,
    createdBy: userId,
  };
  const docRef = await addDoc(txCollection(userId), data);
  return docRef.id;
}

export async function deleteTransaction(userId: string, txId: string): Promise<void> {
  await deleteDoc(txDoc(userId, txId));
}

export function subscribeToTransactions(
  userId: string,
  callback: (transactions: EmergencyFundTransaction[]) => void
): () => void {
  const q = query(txCollection(userId), orderBy('date', 'desc'));
  return onSnapshot(q, (snapshot) => {
    const transactions = snapshot.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    })) as EmergencyFundTransaction[];
    callback(transactions);
  });
}

/**
 * The balance is the SUM of all transaction amounts.
 * This is the correct calculation — not just the latest transaction.
 */
export function computeBalance(transactions: EmergencyFundTransaction[]): number {
  return transactions.reduce((sum, t) => sum + t.amount, 0);
}
