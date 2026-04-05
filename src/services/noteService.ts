import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  onSnapshot,
  getDocs,
  Timestamp,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { Note, NoteFormData } from '../types';

function notesCollection(userId: string) {
  return collection(db, 'users', userId, 'notes');
}

function noteDoc(userId: string, noteId: string) {
  return doc(db, 'users', userId, 'notes', noteId);
}

export async function createNote(
  userId: string,
  formData: NoteFormData
): Promise<string> {
  const now = Timestamp.now();
  const noteData: Omit<Note, 'id'> = {
    title: formData.title.trim(),
    content: formData.content.trim(),
    categoryId: formData.categoryId,
    isPinned: false,
    createdAt: now,
    updatedAt: now,
    createdBy: userId,
  };

  const docRef = await addDoc(notesCollection(userId), noteData);
  return docRef.id;
}

export async function updateNote(
  userId: string,
  noteId: string,
  updates: Partial<NoteFormData>
): Promise<void> {
  const updateData: Record<string, any> = {
    updatedAt: Timestamp.now(),
  };

  if (updates.title !== undefined) updateData.title = updates.title.trim();
  if (updates.content !== undefined) updateData.content = updates.content.trim();
  if (updates.categoryId !== undefined) updateData.categoryId = updates.categoryId;

  await updateDoc(noteDoc(userId, noteId), updateData);
}

export async function deleteNote(
  userId: string,
  noteId: string
): Promise<void> {
  await deleteDoc(noteDoc(userId, noteId));
}

export async function togglePin(
  userId: string,
  noteId: string,
  isPinned: boolean
): Promise<void> {
  await updateDoc(noteDoc(userId, noteId), {
    isPinned,
    updatedAt: Timestamp.now(),
  });
}

export function subscribeToNotes(
  userId: string,
  callback: (notes: Note[]) => void
): () => void {
  const q = query(
    notesCollection(userId),
    orderBy('isPinned', 'desc'),
    orderBy('updatedAt', 'desc')
  );

  return onSnapshot(q, (snapshot) => {
    const notes = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Note[];
    callback(notes);
  });
}

export async function getAllNotesForExport(
  userId: string
): Promise<Note[]> {
  const q = query(
    notesCollection(userId),
    orderBy('createdAt', 'asc')
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() })) as Note[];
}

export async function deleteAllNotes(userId: string): Promise<void> {
  const snapshot = await getDocs(notesCollection(userId));
  if (snapshot.empty) return;

  const BATCH_SIZE = 500;
  const docs = snapshot.docs;

  for (let i = 0; i < docs.length; i += BATCH_SIZE) {
    const batch = writeBatch(db);
    docs.slice(i, i + BATCH_SIZE).forEach((d) => batch.delete(d.ref));
    await batch.commit();
  }
}
