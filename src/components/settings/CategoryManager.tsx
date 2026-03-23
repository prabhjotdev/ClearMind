import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { Category } from '../../types';
import {
  subscribeToCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} from '../../services/categoryService';
import './CategoryManager.css';

const PRESET_COLORS = [
  '#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444',
  '#EC4899', '#14B8A6', '#F97316', '#6366F1', '#84CC16',
];

const PRESET_ICONS = [
  '💼', '🏠', '💪', '📚', '🎯', '🛒', '✈️', '🎨', '💡', '🔧',
  '🌱', '🎵', '🏋️', '💊', '🧘', '🍳', '🐾', '🚗', '💰', '📅',
];

interface CategoryFormState {
  name: string;
  color: string;
  icon: string;
}

const DEFAULT_FORM: CategoryFormState = {
  name: '',
  color: '#3B82F6',
  icon: '📋',
};

export default function CategoryManager() {
  const { currentUser } = useAuth();
  const { showToast } = useToast();
  const userId = currentUser?.uid;

  const [categories, setCategories] = useState<Category[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState<CategoryFormState>(DEFAULT_FORM);
  const [addingCategory, setAddingCategory] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<CategoryFormState>(DEFAULT_FORM);
  const [savingEdit, setSavingEdit] = useState(false);

  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [showIconPicker, setShowIconPicker] = useState<'add' | 'edit' | null>(null);

  useEffect(() => {
    if (!userId) return;
    return subscribeToCategories(userId, setCategories);
  }, [userId]);

  // ─── Add ────────────────────────────────────────────────────

  async function handleAddCategory() {
    if (!userId || !addForm.name.trim()) return;

    const nameExists = categories.some(
      (c: Category) => c.name.trim().toLowerCase() === addForm.name.trim().toLowerCase()
    );
    if (nameExists) {
      showToast('A category with that name already exists.');
      return;
    }

    setAddingCategory(true);
    try {
      await createCategory(userId, {
        name: addForm.name.trim(),
        color: addForm.color,
        icon: addForm.icon,
      });
      setAddForm(DEFAULT_FORM);
      setShowAddForm(false);
      showToast('Category created.');
    } catch {
      showToast('Failed to create category. Please try again.');
    } finally {
      setAddingCategory(false);
    }
  }

  // ─── Edit ────────────────────────────────────────────────────

  function startEdit(cat: Category) {
    setEditingId(cat.id);
    setEditForm({ name: cat.name, color: cat.color, icon: cat.icon });
    setShowAddForm(false);
    setDeleteConfirmId(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setShowIconPicker(null);
  }

  async function handleSaveEdit() {
    if (!userId || !editingId || !editForm.name.trim()) return;

    const nameExists = categories.some(
      (c: Category) =>
        c.id !== editingId &&
        c.name.trim().toLowerCase() === editForm.name.trim().toLowerCase()
    );
    if (nameExists) {
      showToast('A category with that name already exists.');
      return;
    }

    setSavingEdit(true);
    try {
      await updateCategory(userId, editingId, {
        name: editForm.name.trim(),
        color: editForm.color,
        icon: editForm.icon,
      });
      setEditingId(null);
      showToast('Category updated.');
    } catch {
      showToast('Failed to update category. Please try again.');
    } finally {
      setSavingEdit(false);
    }
  }

  // ─── Delete ──────────────────────────────────────────────────

  async function handleDelete(categoryId: string) {
    if (!userId) return;
    setDeletingId(categoryId);
    try {
      await deleteCategory(userId, categoryId);
      setDeleteConfirmId(null);
      showToast('Category deleted.');
    } catch {
      showToast('Failed to delete category. Please try again.');
    } finally {
      setDeletingId(null);
    }
  }

  // ─── Render ──────────────────────────────────────────────────

  return (
    <div className="cat-manager">
      {/* Category list */}
      <ul className="cat-manager-list">
        {categories.map((cat) => {
          const isEditing = editingId === cat.id;
          const isDeleting = deletingId === cat.id;
          const isConfirmingDelete = deleteConfirmId === cat.id;

          return (
            <li key={cat.id} className="cat-manager-item">
              {isEditing ? (
                /* ── Edit form ── */
                <div className="cat-manager-edit-form">
                  <div className="cat-manager-form-row">
                    {/* Icon button */}
                    <div className="cat-manager-icon-wrap">
                      <button
                        type="button"
                        className="cat-manager-icon-btn"
                        onClick={() =>
                          setShowIconPicker(showIconPicker === 'edit' ? null : 'edit')
                        }
                        aria-label="Choose icon"
                        title="Choose icon"
                        style={{ borderColor: editForm.color }}
                      >
                        {editForm.icon}
                      </button>
                      {showIconPicker === 'edit' && (
                        <div className="cat-manager-icon-picker">
                          {PRESET_ICONS.map((ic) => (
                            <button
                              key={ic}
                              type="button"
                              className={`cat-manager-icon-option ${editForm.icon === ic ? 'cat-manager-icon-option--active' : ''}`}
                              onClick={() => {
                                setEditForm((f: CategoryFormState) => ({ ...f, icon: ic }));
                                setShowIconPicker(null);
                              }}
                            >
                              {ic}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Name input */}
                    <input
                      type="text"
                      className="cat-manager-name-input"
                      value={editForm.name}
                      onChange={(e) => setEditForm((f: CategoryFormState) => ({ ...f, name: e.target.value }))}
                      placeholder="Category name"
                      maxLength={40}
                      autoFocus
                    />
                  </div>

                  {/* Color swatches */}
                  <div className="cat-manager-colors">
                    {PRESET_COLORS.map((color) => (
                      <button
                        key={color}
                        type="button"
                        className={`cat-manager-color-swatch ${editForm.color === color ? 'cat-manager-color-swatch--active' : ''}`}
                        style={{ background: color }}
                        onClick={() => setEditForm((f: CategoryFormState) => ({ ...f, color }))}
                        aria-label={color}
                      />
                    ))}
                    <input
                      type="color"
                      className="cat-manager-color-custom"
                      value={editForm.color}
                      onChange={(e) => setEditForm((f: CategoryFormState) => ({ ...f, color: e.target.value }))}
                      title="Custom color"
                    />
                  </div>

                  {/* Actions */}
                  <div className="cat-manager-form-actions">
                    <button
                      type="button"
                      className="cat-manager-btn"
                      onClick={cancelEdit}
                      disabled={savingEdit}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="cat-manager-btn cat-manager-btn--primary"
                      onClick={handleSaveEdit}
                      disabled={savingEdit || !editForm.name.trim()}
                    >
                      {savingEdit ? 'Saving…' : 'Save'}
                    </button>
                  </div>
                </div>
              ) : isConfirmingDelete ? (
                /* ── Delete confirm ── */
                <div className="cat-manager-delete-confirm">
                  <span className="cat-manager-delete-warning">
                    Delete <strong>{cat.name}</strong>? Tasks in this category won't be deleted.
                  </span>
                  <div className="cat-manager-form-actions">
                    <button
                      type="button"
                      className="cat-manager-btn"
                      onClick={() => setDeleteConfirmId(null)}
                      disabled={isDeleting}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="cat-manager-btn cat-manager-btn--danger"
                      onClick={() => handleDelete(cat.id)}
                      disabled={isDeleting}
                    >
                      {isDeleting ? 'Deleting…' : 'Delete'}
                    </button>
                  </div>
                </div>
              ) : (
                /* ── Normal row ── */
                <div className="cat-manager-row">
                  <span
                    className="cat-manager-color-dot"
                    style={{ background: cat.color }}
                    aria-hidden="true"
                  />
                  <span className="cat-manager-row-icon">{cat.icon}</span>
                  <span className="cat-manager-row-name">{cat.name}</span>
                  {cat.isDefault && (
                    <span className="cat-manager-default-badge">Default</span>
                  )}
                  <div className="cat-manager-row-actions">
                    <button
                      type="button"
                      className="cat-manager-action-btn"
                      onClick={() => startEdit(cat)}
                      aria-label={`Edit ${cat.name}`}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="cat-manager-action-btn cat-manager-action-btn--danger"
                      onClick={() => {
                        setDeleteConfirmId(cat.id);
                        setEditingId(null);
                      }}
                      aria-label={`Delete ${cat.name}`}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {/* Add category */}
      {showAddForm ? (
        <div className="cat-manager-add-form">
          <p className="cat-manager-add-title">New Category</p>

          <div className="cat-manager-form-row">
            {/* Icon picker */}
            <div className="cat-manager-icon-wrap">
              <button
                type="button"
                className="cat-manager-icon-btn"
                onClick={() =>
                  setShowIconPicker(showIconPicker === 'add' ? null : 'add')
                }
                aria-label="Choose icon"
                title="Choose icon"
                style={{ borderColor: addForm.color }}
              >
                {addForm.icon}
              </button>
              {showIconPicker === 'add' && (
                <div className="cat-manager-icon-picker">
                  {PRESET_ICONS.map((ic) => (
                    <button
                      key={ic}
                      type="button"
                      className={`cat-manager-icon-option ${addForm.icon === ic ? 'cat-manager-icon-option--active' : ''}`}
                      onClick={() => {
                        setAddForm((f: CategoryFormState) => ({ ...f, icon: ic }));
                        setShowIconPicker(null);
                      }}
                    >
                      {ic}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Name */}
            <input
              type="text"
              className="cat-manager-name-input"
              value={addForm.name}
              onChange={(e) => setAddForm((f: CategoryFormState) => ({ ...f, name: e.target.value }))}
              placeholder="Category name"
              maxLength={40}
              autoFocus
            />
          </div>

          {/* Color swatches */}
          <div className="cat-manager-colors">
            {PRESET_COLORS.map((color) => (
              <button
                key={color}
                type="button"
                className={`cat-manager-color-swatch ${addForm.color === color ? 'cat-manager-color-swatch--active' : ''}`}
                style={{ background: color }}
                onClick={() => setAddForm((f: CategoryFormState) => ({ ...f, color }))}
                aria-label={color}
              />
            ))}
            <input
              type="color"
              className="cat-manager-color-custom"
              value={addForm.color}
              onChange={(e) => setAddForm((f: CategoryFormState) => ({ ...f, color: e.target.value }))}
              title="Custom color"
            />
          </div>

          {/* Preview */}
          <div className="cat-manager-preview">
            <span
              className="cat-manager-preview-chip"
              style={{ background: addForm.color + '1A', color: addForm.color }}
            >
              {addForm.icon} {addForm.name || 'Preview'}
            </span>
          </div>

          <div className="cat-manager-form-actions">
            <button
              type="button"
              className="cat-manager-btn"
              onClick={() => {
                setShowAddForm(false);
                setAddForm(DEFAULT_FORM);
                setShowIconPicker(null);
              }}
              disabled={addingCategory}
            >
              Cancel
            </button>
            <button
              type="button"
              className="cat-manager-btn cat-manager-btn--primary"
              onClick={handleAddCategory}
              disabled={addingCategory || !addForm.name.trim()}
            >
              {addingCategory ? 'Creating…' : 'Create'}
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          className="cat-manager-add-btn"
          onClick={() => {
            setShowAddForm(true);
            setEditingId(null);
            setDeleteConfirmId(null);
            setShowIconPicker(null);
          }}
        >
          + Add Category
        </button>
      )}
    </div>
  );
}
