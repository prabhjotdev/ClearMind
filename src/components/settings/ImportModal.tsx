import React, { useRef, useState, useEffect } from 'react';
import {
  parseImportFile,
  detectDuplicates,
  importTasksToFirestore,
  ImportPreview,
  DuplicateAction,
} from '../../services/importExportService';
import { getAllTasksForExport } from '../../services/taskService';
import { getAllCategories } from '../../services/categoryService';
import { Task, Category } from '../../types';
import './ImportModal.css';

interface ImportModalProps {
  userId: string;
  onClose: () => void;
  onImported: (result: { imported: number; skipped: number }) => void;
}

type ModalStep = 'pick' | 'preview' | 'importing' | 'done';

export default function ImportModal({ userId, onClose, onImported }: ImportModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<ModalStep>('pick');
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [duplicateAction, setDuplicateAction] = useState<DuplicateAction>('skip');
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ imported: number; skipped: number } | null>(null);
  const [existingTasks, setExistingTasks] = useState<Task[]>([]);
  const [existingCategories, setExistingCategories] = useState<Category[]>([]);

  // Fetch existing tasks and categories once for duplicate detection
  useEffect(() => {
    Promise.all([
      getAllTasksForExport(userId, 'all'),
      getAllCategories(userId),
    ]).then(([tasks, cats]) => {
      setExistingTasks(tasks);
      setExistingCategories(cats);
    });
  }, [userId]);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);

    try {
      const parsed = await parseImportFile(file);
      parsed.duplicateIndices = detectDuplicates(parsed.tasks, existingTasks, existingCategories);
      setPreview(parsed);
      setStep('preview');
    } catch (err: any) {
      setError(err.message ?? 'Failed to parse file.');
    }

    e.target.value = '';
  }

  async function handleImport() {
    if (!preview) return;
    setStep('importing');
    setError(null);

    try {
      const dupSet = new Set(preview.duplicateIndices);
      const importResult = await importTasksToFirestore(
        userId,
        preview.tasks,
        dupSet,
        duplicateAction,
        existingCategories
      );
      setResult(importResult);
      setStep('done');
      onImported(importResult);
    } catch (err: any) {
      setError(err.message ?? 'Import failed. Please try again.');
      setStep('preview');
    }
  }

  function handleBackdropClick(e: React.MouseEvent) {
    if (e.target === e.currentTarget) onClose();
  }

  const importCount = preview
    ? preview.tasks.length - (duplicateAction === 'skip' ? preview.duplicateIndices.length : 0)
    : 0;

  return (
    <div className="import-modal-backdrop" onClick={handleBackdropClick}>
      <div className="import-modal" role="dialog" aria-modal="true" aria-label="Import tasks">
        <div className="import-modal-header">
          <h2 className="import-modal-title">Import Tasks</h2>
          <button className="import-modal-close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        {/* ── Step: File Picker ── */}
        {step === 'pick' && (
          <div className="import-modal-body">
            <p className="import-modal-desc">
              Import tasks from a JSON or CSV file.
            </p>
            <ul className="import-modal-formats">
              <li><strong>.json</strong> — ClearMind backup file</li>
              <li><strong>.csv</strong> — Spreadsheet export</li>
            </ul>
            <p className="import-modal-limit">Maximum file size: 5 MB</p>
            {error && <p className="import-modal-error">{error}</p>}
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,.csv,application/json,text/csv"
              onChange={handleFileChange}
              className="import-modal-file-input"
              aria-label="Choose import file"
            />
            <div className="import-modal-actions">
              <button className="import-modal-btn import-modal-btn--secondary" onClick={onClose}>
                Cancel
              </button>
              <button
                className="import-modal-btn import-modal-btn--primary"
                onClick={() => fileInputRef.current?.click()}
              >
                Choose File
              </button>
            </div>
          </div>
        )}

        {/* ── Step: Preview ── */}
        {step === 'preview' && preview && (
          <div className="import-modal-body">
            <div className="import-preview-summary">
              <p>
                Found <strong>{preview.tasks.length}</strong> task{preview.tasks.length !== 1 ? 's' : ''}{' '}
                in <strong>{preview.categoryNames.length}</strong> categor{preview.categoryNames.length !== 1 ? 'ies' : 'y'}.
              </p>
              {preview.skippedCount > 0 && (
                <p className="import-modal-warn">
                  {preview.skippedCount} row{preview.skippedCount !== 1 ? 's' : ''} skipped (missing required fields).
                </p>
              )}
              {preview.duplicateIndices.length > 0 && (
                <p className="import-modal-warn">
                  {preview.duplicateIndices.length} potential duplicate{preview.duplicateIndices.length !== 1 ? 's' : ''} detected.
                </p>
              )}
            </div>

            {preview.categoryNames.length > 0 && (
              <div className="import-preview-section">
                <p className="import-preview-label">Categories</p>
                <div className="import-preview-cat-chips">
                  {preview.categoryNames.map((name) => (
                    <span key={name} className="import-cat-chip">{name}</span>
                  ))}
                </div>
              </div>
            )}

            {preview.duplicateIndices.length > 0 && (
              <div className="import-preview-section">
                <p className="import-preview-label">Handle duplicates</p>
                <div className="import-dupe-options">
                  <label className="import-radio-row">
                    <input
                      type="radio"
                      name="duplicateAction"
                      value="skip"
                      checked={duplicateAction === 'skip'}
                      onChange={() => setDuplicateAction('skip')}
                    />
                    <span><strong>Skip</strong> — keep existing tasks unchanged</span>
                  </label>
                  <label className="import-radio-row">
                    <input
                      type="radio"
                      name="duplicateAction"
                      value="new"
                      checked={duplicateAction === 'new'}
                      onChange={() => setDuplicateAction('new')}
                    />
                    <span><strong>Import as new</strong> — create alongside existing</span>
                  </label>
                </div>
              </div>
            )}

            {preview.errors.length > 0 && (
              <details className="import-preview-errors">
                <summary>{preview.errors.length} warning{preview.errors.length !== 1 ? 's' : ''}</summary>
                <ul>
                  {preview.errors.map((e, i) => (
                    <li key={i}>{e}</li>
                  ))}
                </ul>
              </details>
            )}

            {error && <p className="import-modal-error">{error}</p>}

            <div className="import-modal-actions">
              <button
                className="import-modal-btn import-modal-btn--secondary"
                onClick={() => { setStep('pick'); setPreview(null); setError(null); }}
              >
                Back
              </button>
              <button
                className="import-modal-btn import-modal-btn--primary"
                onClick={handleImport}
                disabled={importCount <= 0}
              >
                Import {importCount} task{importCount !== 1 ? 's' : ''}
              </button>
            </div>
          </div>
        )}

        {/* ── Step: Importing ── */}
        {step === 'importing' && (
          <div className="import-modal-body import-modal-loading">
            <div className="import-spinner" aria-label="Importing…" />
            <p>Importing tasks…</p>
          </div>
        )}

        {/* ── Step: Done ── */}
        {step === 'done' && result && (
          <div className="import-modal-body import-modal-done">
            <div className="import-done-icon" aria-hidden="true">✓</div>
            <p className="import-done-text">
              Imported <strong>{result.imported}</strong> task{result.imported !== 1 ? 's' : ''}.
              {result.skipped > 0 && ` Skipped ${result.skipped} duplicate${result.skipped !== 1 ? 's' : ''}.`}
            </p>
            <div className="import-modal-actions">
              <button className="import-modal-btn import-modal-btn--primary" onClick={onClose}>
                Done
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
