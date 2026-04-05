import React from 'react';
import { Note, Category } from '../../types';
import { format } from 'date-fns';
import './NoteDetail.css';

interface NoteDetailProps {
  note: Note;
  category?: Category;
  onEdit: () => void;
  onDelete: () => void;
  onClose: () => void;
  onTogglePin: () => void;
}

export default function NoteDetail({
  note,
  category,
  onEdit,
  onDelete,
  onClose,
  onTogglePin,
}: NoteDetailProps) {
  return (
    <div className="note-detail">
      <div className="note-detail-header">
        <span className="task-form-handle" aria-hidden="true" />
      </div>

      {category && (
        <div className="note-detail-category">
          <span
            className="note-detail-category-badge"
            style={{ background: category.color + '1A', color: category.color }}
          >
            {category.icon} {category.name}
          </span>
        </div>
      )}

      <h2 className="note-detail-title">{note.title}</h2>

      {note.content && (
        <p className="note-detail-content">{note.content}</p>
      )}

      <div className="note-detail-timestamps">
        Created: {format(note.createdAt.toDate(), 'MMM d, yyyy')}
        {note.updatedAt && ` · Modified: ${format(note.updatedAt.toDate(), 'MMM d, yyyy')}`}
      </div>

      <div className="note-detail-actions">
        <button
          className={`note-detail-action ${note.isPinned ? 'note-detail-action--unpin' : 'note-detail-action--pin'}`}
          onClick={onTogglePin}
        >
          {note.isPinned ? '✕ Unpin' : '📌 Pin'}
        </button>
        <button className="note-detail-action note-detail-action--edit" onClick={onEdit}>
          ✏ Edit
        </button>
        <button className="note-detail-action note-detail-action--delete" onClick={onDelete}>
          🗑 Delete
        </button>
      </div>
    </div>
  );
}
