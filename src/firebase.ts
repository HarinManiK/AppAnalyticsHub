import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyCiOsIhTy42A15FA7P6jw352bQLgf9bAf8",
  authDomain: "taskmanager-3a2b8.firebaseapp.com",
  projectId: "taskmanager-3a2b8",
  storageBucket: "taskmanager-3a2b8.firebasestorage.app",
  messagingSenderId: "409285347899",
  appId: "1:409285347899:web:placeholder" // If this fails, the user will need to add a web app in Firebase
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const storage = getStorage(app);
