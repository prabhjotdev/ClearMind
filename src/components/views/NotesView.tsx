import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import {
  subscribeToNotes,
  createNote,
  updateNote,
  deleteNote,
  togglePin,
} from '../../services/noteService';
import { subscribeToCategories } from '../../services/categoryService';
import { Note, Category, NoteFormData } from '../../types';
import NoteCard from '../notes/NoteCard';
import NoteForm from '../notes/NoteForm';
import NoteDetail from '../notes/NoteDetail';
import BottomSheet from '../common/BottomSheet';
import FAB from '../common/FAB';
import { TaskListSkeleton } from '../common/Skeleton';
import './NotesView.css';

export default function NotesView() {
  const { currentUser } = useAuth();
  const { showToast } = useToast();
  const [notes, setNotes] = useState<Note[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<string | null>(null);

  const userId = currentUser?.uid;

  // Load categories
  useEffect(() => {
    if (!userId) return;
    return subscribeToCategories(userId, setCategories);
  }, [userId]);

  // Load notes
  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    return subscribeToNotes(
      userId,
      (newNotes) => {
        setNotes(newNotes);
        setLoading(false);
      },
      () => {
        // On error (e.g. missing index), stop loading so empty state shows
        setLoading(false);
      }
    );
  }, [userId]);

  const getCategoryForNote = useCallback(
    (note: Note) => categories.find((c) => c.id === note.categoryId),
    [categories]
  );

  const filteredNotes = activeCategoryFilter
    ? notes.filter((n) => n.categoryId === activeCategoryFilter)
    : notes;

  async function handleCreate(formData: NoteFormData) {
    if (!userId) return;
    await createNote(userId, formData);
    setShowCreateForm(false);
    showToast('Note created');
  }

  async function handleEdit(formData: NoteFormData) {
    if (!userId || !editingNote) return;
    await updateNote(userId, editingNote.id, formData);
    setEditingNote(null);
    setSelectedNote(null);
    showToast('Note updated');
  }

  async function handleDelete(noteId: string) {
    if (!userId) return;
    const note = notes.find((n) => n.id === noteId);
    await deleteNote(userId, noteId);
    setSelectedNote(null);
    if (note) {
      showToast(`"${note.title}" deleted`);
    }
  }

  async function handleTogglePin(noteId: string) {
    if (!userId) return;
    const note = notes.find((n) => n.id === noteId);
    if (!note) return;
    await togglePin(userId, noteId, !note.isPinned);
    // Update the selectedNote in place so the detail sheet reflects the change
    setSelectedNote((prev) => prev && prev.id === noteId ? { ...prev, isPinned: !prev.isPinned } : prev);
    showToast(note.isPinned ? 'Note unpinned' : 'Note pinned');
  }

  const pinnedCount = filteredNotes.filter((n) => n.isPinned).length;

  return (
    <div className="notes-view">
      {/* Header */}
      <div className="notes-view-header">
        <h2 className="notes-view-title">Notes</h2>
        <span className="notes-view-count">{filteredNotes.length}</span>
      </div>

      {/* Category Filters */}
      {categories.length > 0 && (
        <div className="notes-view-filters">
          <button
            className={`notes-view-filter ${activeCategoryFilter === null ? 'notes-view-filter--active' : ''}`}
            onClick={() => setActiveCategoryFilter(null)}
          >
            All
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              className={`notes-view-filter ${activeCategoryFilter === cat.id ? 'notes-view-filter--active' : ''}`}
              style={activeCategoryFilter === cat.id ? { background: cat.color, color: 'white', borderColor: cat.color } : {}}
              onClick={() => setActiveCategoryFilter(cat.id)}
            >
              {cat.icon} {cat.name}
            </button>
          ))}
        </div>
      )}

      {/* Skeleton loading */}
      {loading && <TaskListSkeleton rows={4} />}

      {/* Pinned Section */}
      {!loading && pinnedCount > 0 && (
        <section className="notes-view-section">
          <h3 className="notes-view-section-header">
            📌 Pinned ({pinnedCount})
          </h3>
          <div className="notes-view-grid">
            {filteredNotes
              .filter((n) => n.isPinned)
              .map((note) => (
                <NoteCard
                  key={note.id}
                  note={note}
                  category={getCategoryForNote(note)}
                  onClick={setSelectedNote}
                />
              ))}
          </div>
        </section>
      )}

      {/* Other Notes */}
      {!loading && filteredNotes.filter((n) => !n.isPinned).length > 0 && (
        <section className="notes-view-section">
          {pinnedCount > 0 && (
            <h3 className="notes-view-section-header">
              Others ({filteredNotes.length - pinnedCount})
            </h3>
          )}
          <div className="notes-view-grid">
            {filteredNotes
              .filter((n) => !n.isPinned)
              .map((note) => (
                <NoteCard
                  key={note.id}
                  note={note}
                  category={getCategoryForNote(note)}
                  onClick={setSelectedNote}
                />
              ))}
          </div>
        </section>
      )}

      {/* Empty State */}
      {!loading && filteredNotes.length === 0 && (
        <div className="notes-view-empty">
          <div className="notes-view-empty-icon" aria-hidden="true">📝</div>
          <p className="notes-view-empty-title">
            {activeCategoryFilter ? 'No notes in this category' : 'No notes yet'}
          </p>
          <p className="notes-view-empty-text">
            {activeCategoryFilter
              ? 'Create a note in this category to get started.'
              : 'Capture your thoughts, ideas, and reminders.'}
          </p>
          <button
            className="notes-view-empty-cta"
            onClick={() => setShowCreateForm(true)}
          >
            + Create a note
          </button>
        </div>
      )}

      {/* FAB */}
      <FAB onClick={() => setShowCreateForm(true)} label="Add new note" />

      {/* Create Note Sheet */}
      <BottomSheet
        isOpen={showCreateForm}
        onClose={() => setShowCreateForm(false)}
        ariaLabel="Create new note"
      >
        <NoteForm
          categories={categories}
          onSubmit={handleCreate}
          onCancel={() => setShowCreateForm(false)}
        />
      </BottomSheet>

      {/* Note Detail Sheet */}
      <BottomSheet
        isOpen={!!selectedNote && !editingNote}
        onClose={() => setSelectedNote(null)}
        ariaLabel="Note details"
      >
        {selectedNote && (
          <NoteDetail
            note={selectedNote}
            category={getCategoryForNote(selectedNote)}
            onEdit={() => setEditingNote(selectedNote)}
            onDelete={() => handleDelete(selectedNote.id)}
            onClose={() => setSelectedNote(null)}
            onTogglePin={() => handleTogglePin(selectedNote.id)}
          />
        )}
      </BottomSheet>

      {/* Edit Note Sheet */}
      <BottomSheet
        isOpen={!!editingNote}
        onClose={() => setEditingNote(null)}
        ariaLabel="Edit note"
      >
        {editingNote && (
          <NoteForm
            categories={categories}
            initialData={{
              title: editingNote.title,
              content: editingNote.content,
              categoryId: editingNote.categoryId,
            }}
            onSubmit={handleEdit}
            onCancel={() => setEditingNote(null)}
            submitLabel="Save Changes"
          />
        )}
      </BottomSheet>
    </div>
  );
}
