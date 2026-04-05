import React, { useState } from 'react';
import { NoteFormData, Category } from '../../types';
import './NoteForm.css';

interface NoteFormProps {
  categories: Category[];
  initialData?: Partial<NoteFormData>;
  onSubmit: (data: NoteFormData) => void;
  onCancel: () => void;
  submitLabel?: string;
}

export default function NoteForm({
  categories,
  initialData,
  onSubmit,
  onCancel,
  submitLabel = 'Save Note',
}: NoteFormProps) {
  const [title, setTitle] = useState(initialData?.title || '');
  const [content, setContent] = useState(initialData?.content || '');
  const [categoryId, setCategoryId] = useState(
    initialData?.categoryId || categories[0]?.id || ''
  );
  const [error, setError] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!title.trim()) {
      setError('Note title is required');
      return;
    }

    if (!categoryId) {
      setError('Please select a category');
      return;
    }

    setError('');
    onSubmit({
      title: title.trim(),
      content: content.trim(),
      categoryId,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="note-form">
      <div className="note-form-header">
        <span className="task-form-handle" aria-hidden="true" />
      </div>

      {error && (
        <div className="note-form-error" role="alert">
          {error}
        </div>
      )}

      <div className="note-form-field">
        <label htmlFor="note-title" className="sr-only">Note title</label>
        <input
          id="note-title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Note title"
          className="note-form-input note-form-input--title"
          autoFocus
          maxLength={200}
        />
      </div>

      <div className="note-form-field">
        <label className="note-form-label">Category</label>
        <div className="note-form-chips" role="radiogroup" aria-label="Category">
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              role="radio"
              aria-checked={categoryId === cat.id}
              className={`note-form-chip ${categoryId === cat.id ? 'note-form-chip--active' : ''}`}
              style={categoryId === cat.id ? { background: cat.color, color: 'white' } : {}}
              onClick={() => setCategoryId(cat.id)}
            >
              {cat.icon} {cat.name}
            </button>
          ))}
        </div>
      </div>

      <div className="note-form-field">
        <label htmlFor="note-content" className="note-form-label">Content</label>
        <textarea
          id="note-content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Write your note..."
          className="note-form-input note-form-textarea"
          rows={6}
          maxLength={5000}
        />
      </div>

      <div className="note-form-actions">
        <button type="button" className="note-form-cancel" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="note-form-submit">
          {submitLabel}
        </button>
      </div>
    </form>
  );
}
