import { useEffect, useState } from "react";
import {
  collection, doc, onSnapshot, setDoc,
  addDoc, updateDoc, deleteDoc, serverTimestamp, query, where
} from "firebase/firestore";
import { db } from "./firebase";

// ── บันทึก user profile ลง Firestore ──
export async function saveUserProfile(user) {
  await setDoc(doc(db, "users", user.uid), {
    uid: user.uid,
    name: user.displayName,
    email: user.email,
    avatar: user.photoURL,
    createdAt: serverTimestamp(),
  }, { merge: true });
}

// ── ดึง lists ของ user ──
export function useLists(uid) {
  const [lists, setLists] = useState([]);
  useEffect(() => {
    if (!uid) return;
    const q = query(collection(db, "lists"), where("memberIds", "array-contains", uid));
    const unsub = onSnapshot(q, (snap) => {
      setLists(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, [uid]);
  return lists;
}

// ── สร้าง list ใหม่ ──
export async function createListInDB(data) {
  const ref = await addDoc(collection(db, "lists"), data);
  return ref.id;
}

// ── อัพเดท list ──
export async function updateListInDB(listId, data) {
  await updateDoc(doc(db, "lists", listId), data);
}

// ── ลบ list ──
export async function deleteListInDB(listId) {
  await deleteDoc(doc(db, "lists", listId));
}

// ── ค้นหา user ด้วยชื่อ ──
export async function searchUsersByName(name) {
  const { getDocs } = await import("firebase/firestore");
  const snap = await getDocs(collection(db, "users"));
  const lower = name.toLowerCase();
  return snap.docs
    .map(d => d.data())
    .filter(u => u.name?.toLowerCase().includes(lower));
}