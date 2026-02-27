import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import {
  subscribeToTransactions,
  addTransaction,
  deleteTransaction,
  computeBalance,
} from '../../services/emergencyFundService';
import { EmergencyFundTransaction } from '../../types';
import { format } from 'date-fns';
import './EmergencyFundView.css';

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(Math.abs(amount));
}

export default function EmergencyFundView() {
  const { currentUser } = useAuth();
  const { showToast } = useToast();

  const [transactions, setTransactions] = useState<EmergencyFundTransaction[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [description, setDescription] = useState('');
  const [amountStr, setAmountStr] = useState('');
  const [isWithdrawal, setIsWithdrawal] = useState(false);
  const [dateStr, setDateStr] = useState(() => format(new Date(), 'yyyy-MM-dd'));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!currentUser) return;
    const unsub = subscribeToTransactions(currentUser.uid, setTransactions);
    return unsub;
  }, [currentUser]);

  // Balance is the SUM of all transaction amounts — not just the latest entry
  const balance = computeBalance(transactions);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!currentUser) return;

      const parsed = parseFloat(amountStr);
      if (isNaN(parsed) || parsed <= 0) {
        showToast('Please enter a valid positive amount.', undefined, undefined);
        return;
      }

      setSaving(true);
      try {
        await addTransaction(currentUser.uid, {
          description: description || (isWithdrawal ? 'Withdrawal' : 'Deposit'),
          amount: isWithdrawal ? -parsed : parsed,
          date: new Date(dateStr + 'T12:00:00'),
        });
        setDescription('');
        setAmountStr('');
        setIsWithdrawal(false);
        setDateStr(format(new Date(), 'yyyy-MM-dd'));
        setShowForm(false);
      } catch {
        showToast('Failed to save transaction.', undefined, undefined);
      } finally {
        setSaving(false);
      }
    },
    [currentUser, description, amountStr, isWithdrawal, dateStr, showToast]
  );

  const handleDelete = useCallback(
    async (tx: EmergencyFundTransaction) => {
      if (!currentUser) return;
      try {
        await deleteTransaction(currentUser.uid, tx.id);
      } catch {
        showToast('Failed to delete transaction.', undefined, undefined);
      }
    },
    [currentUser, showToast]
  );

  return (
    <div className="ef-view">
      {/* Balance card */}
      <div className="ef-balance-card">
        <p className="ef-balance-label">Current Balance</p>
        <p className={`ef-balance-amount ${balance < 0 ? 'ef-balance-amount--negative' : ''}`}>
          {balance < 0 ? '-' : ''}{formatCurrency(balance)}
        </p>
        <p className="ef-balance-sub">
          {transactions.length} transaction{transactions.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Add transaction button */}
      <div className="ef-actions">
        <button
          className="ef-add-btn"
          onClick={() => setShowForm((v) => !v)}
          aria-expanded={showForm}
        >
          {showForm ? 'Cancel' : '+ Add Transaction'}
        </button>
      </div>

      {/* Add transaction form */}
      {showForm && (
        <form className="ef-form" onSubmit={handleSubmit} noValidate>
          <div className="ef-form-row">
            <label className="ef-form-label" htmlFor="ef-description">Description</label>
            <input
              id="ef-description"
              className="ef-form-input"
              type="text"
              placeholder="e.g. Savings allocation"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={100}
            />
          </div>

          <div className="ef-form-row ef-form-row--inline">
            <div className="ef-form-col">
              <label className="ef-form-label" htmlFor="ef-amount">Amount ($)</label>
              <input
                id="ef-amount"
                className="ef-form-input"
                type="number"
                placeholder="0.00"
                min="0.01"
                step="0.01"
                value={amountStr}
                onChange={(e) => setAmountStr(e.target.value)}
                required
              />
            </div>

            <div className="ef-form-col">
              <label className="ef-form-label" htmlFor="ef-date">Date</label>
              <input
                id="ef-date"
                className="ef-form-input"
                type="date"
                value={dateStr}
                onChange={(e) => setDateStr(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="ef-form-row ef-form-type">
            <button
              type="button"
              className={`ef-type-btn ${!isWithdrawal ? 'ef-type-btn--active ef-type-btn--deposit' : ''}`}
              onClick={() => setIsWithdrawal(false)}
            >
              + Deposit
            </button>
            <button
              type="button"
              className={`ef-type-btn ${isWithdrawal ? 'ef-type-btn--active ef-type-btn--withdrawal' : ''}`}
              onClick={() => setIsWithdrawal(true)}
            >
              – Withdrawal
            </button>
          </div>

          <button className="ef-save-btn" type="submit" disabled={saving}>
            {saving ? 'Saving…' : 'Save Transaction'}
          </button>
        </form>
      )}

      {/* Transaction list */}
      <div className="ef-tx-list">
        {transactions.length === 0 ? (
          <p className="ef-empty">No transactions yet. Add one to get started.</p>
        ) : (
          transactions.map((tx) => (
            <div key={tx.id} className="ef-tx-item">
              <div className="ef-tx-info">
                <span className="ef-tx-desc">{tx.description}</span>
                <span className="ef-tx-date">
                  {format(tx.date.toDate(), 'M/d/yyyy')}
                </span>
              </div>
              <div className="ef-tx-right">
                <span className={`ef-tx-amount ${tx.amount < 0 ? 'ef-tx-amount--negative' : 'ef-tx-amount--positive'}`}>
                  {tx.amount < 0 ? '-' : '+'}{formatCurrency(tx.amount)}
                </span>
                <button
                  className="ef-tx-delete"
                  onClick={() => handleDelete(tx)}
                  aria-label={`Delete transaction: ${tx.description}`}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6l-1 14H6L5 6" />
                    <path d="M10 11v6M14 11v6" />
                    <path d="M9 6V4h6v2" />
                  </svg>
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
