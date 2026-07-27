import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCSvM_A0DdJ8TRfwFWQys9eIkLoTGquO7w",
  authDomain: "todolistpkbell.firebaseapp.com",
  projectId: "todolistpkbell",
  messagingSenderId: "958370549212",
  appId: "1:958370549212:web:fd3e6836084049b8d15319"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const provider = new GoogleAuthProvider();
export const db = getFirestore(app);