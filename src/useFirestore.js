import { useEffect, useState } from "react";
import {
  collection, doc, onSnapshot, setDoc,
  addDoc, updateDoc, deleteDoc, serverTimestamp, query, where, getDoc
} from "firebase/firestore";
import { db } from "./firebase";

export async function saveUserProfile(user) {
  await setDoc(doc(db, "users", user.uid), {
    uid: user.uid,
    name: user.displayName,
    email: user.email,
    avatar: user.photoURL || '',
    createdAt: serverTimestamp(),
  }, { merge: true });
}

export function useLists(uid) {
  const [lists, setLists] = useState([]);
  useEffect(() => {
    if (!uid) return;
    const q = query(collection(db, "lists"), where("memberIds", "array-contains", uid));
    const unsub = onSnapshot(q, (snap) => {
      setLists(snap.docs.map(d => ({ ...d.data(), id: d.id })));
    });
    return () => unsub();
  }, [uid]);
  return lists;
}

export async function createListInDB(data) {
  // ลบ id ออกก่อน เพราะ Firestore จะสร้าง id เองครับ
  const { id: _id, ...rest } = data;
  const ref = await addDoc(collection(db, "lists"), rest);
  return ref.id;
}

export async function updateListInDB(listId, data) {
  try {
    // ลบ id ออกก่อน เพราะไม่ต้องเก็บ id ซ้ำใน document
    const { id: _id, ...rest } = data;
    await updateDoc(doc(db, "lists", listId), rest);
  } catch (err) {
    console.error("updateList error:", err);
    throw err;
  }
}

export async function deleteListInDB(listId) {
  try {
    await deleteDoc(doc(db, "lists", listId));
  } catch (err) {
    console.error("deleteList error:", err);
    throw err;
  }
}

// ── List Invites ──────────────────────────────────────────────────────────────

export async function sendListInvite(currentUser, friendUid, listData) {
  await setDoc(doc(db, "users", friendUid, "listInvites", listData.id), {
    listId: listData.id,
    listName: listData.name,
    listColor: listData.color,
    invitedBy: currentUser.name,
    invitedByUid: currentUser.id,
    sentAt: serverTimestamp(),
  });
}

export async function acceptListInvite(uid, invite) {
  try {
    const listRef = doc(db, "lists", invite.listId);
    const listSnap = await getDoc(listRef);
    
    if (!listSnap.exists()) {
      await deleteDoc(doc(db, "users", uid, "listInvites", invite.listId));
      return;
    }

    const data = listSnap.data();
    const memberIds = [...new Set([...(data.memberIds || []), uid])];
    const members = [...new Set([...(data.members || []), uid])];

    // ใช้ setDoc แทน updateDoc ครับ
    await setDoc(listRef, { ...data, memberIds, members });
    await deleteDoc(doc(db, "users", uid, "listInvites", invite.listId));
  } catch (err) {
    console.error("acceptListInvite error:", err);
    throw err;
  }
}

export async function declineListInvite(uid, listId) {
  await deleteDoc(doc(db, "users", uid, "listInvites", listId));
}

export function useListInvites(uid) {
  const [invites, setInvites] = useState([]);
  useEffect(() => {
    if (!uid) return;
    const unsub = onSnapshot(
      collection(db, "users", uid, "listInvites"),
      snap => setInvites(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    );
    return () => unsub();
  }, [uid]);
  return invites;
}