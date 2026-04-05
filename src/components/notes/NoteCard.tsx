import React from 'react';
import { Note, Category } from '../../types';
import { formatDistanceToNow } from 'date-fns';
import './NoteCard.css';

interface NoteCardProps {
  note: Note;
  category?: Category;
  onClick: (note: Note) => void;
}

export default function NoteCard({ note, category, onClick }: NoteCardProps) {
  const updatedAgo = formatDistanceToNow(note.updatedAt.toDate(), { addSuffix: true });

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick(note);
    }
  }

  return (
    <article
      className={`note-card ${note.isPinned ? 'note-card--pinned' : ''}`}
      style={category ? { '--note-category-color': category.color } as React.CSSProperties : undefined}
      onClick={() => onClick(note)}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="article"
      aria-label={`${note.title}${note.isPinned ? ', pinned' : ''}${category ? `, ${category.name}` : ''}`}
    >
      {note.isPinned && (
        <span className="note-card-pin" aria-hidden="true">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z" />
          </svg>
        </span>
      )}

      <h3 className="note-card-title">{note.title}</h3>

      {note.content && (
        <p className="note-card-content">{note.content}</p>
      )}

      <div className="note-card-footer">
        {category && (
          <span
            className="note-card-category"
            style={{ background: category.color + '1A', color: category.color }}
          >
            {category.icon} {category.name}
          </span>
        )}
        <span className="note-card-time">{updatedAgo}</span>
      </div>
    </article>
  );
}
