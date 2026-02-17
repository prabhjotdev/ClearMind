import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  onSnapshot,
  Timestamp,
  getDocs,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { Category, DEFAULT_CATEGORIES } from '../types';

function categoriesCollection(userId: string) {
  return collection(db, 'users', userId, 'categories');
}

export async function createDefaultCategories(userId: string): Promise<void> {
  const existing = await getDocs(categoriesCollection(userId));
  if (!existing.empty) return; // Already initialized

  for (const cat of DEFAULT_CATEGORIES) {
    await addDoc(categoriesCollection(userId), {
      ...cat,
      createdAt: Timestamp.now(),
    });
  }
}

export async function createCategory(
  userId: string,
  data: { name: string; color: string; icon: string }
): Promise<string> {
  const existing = await getDocs(categoriesCollection(userId));
  const order = existing.size;

  const docRef = await addDoc(categoriesCollection(userId), {
    name: data.name.trim(),
    color: data.color,
    icon: data.icon,
    order,
    isDefault: false,
    createdAt: Timestamp.now(),
  });

  return docRef.id;
}

export async function updateCategory(
  userId: string,
  categoryId: string,
  updates: Partial<{ name: string; color: string; icon: string; order: number }>
): Promise<void> {
  const catDoc = doc(db, 'users', userId, 'categories', categoryId);
  await updateDoc(catDoc, updates);
}

export async function deleteCategory(
  userId: string,
  categoryId: string
): Promise<void> {
  const catDoc = doc(db, 'users', userId, 'categories', categoryId);
  await deleteDoc(catDoc);
}

export function subscribeToCategories(
  userId: string,
  callback: (categories: Category[]) => void
): () => void {
  const q = query(categoriesCollection(userId), orderBy('order', 'asc'));

  return onSnapshot(q, (snapshot) => {
    const categories = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Category[];
    callback(categories);
  });
}
