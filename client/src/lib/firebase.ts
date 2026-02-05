import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Firebase configuration for Synerxus
const firebaseConfig = {
  apiKey: "AIzaSyAXgxscrI7ymmfUuFJvZ3CeAIz_a_wzT7w",
  authDomain: "synerxus-1302e.firebaseapp.com",
  databaseURL: "https://synerxus-1302e-default-rtdb.firebaseio.com",
  projectId: "synerxus-1302e",
  storageBucket: "synerxus-1302e.firebasestorage.app",
  messagingSenderId: "629501536901",
  appId: "1:629501536901:web:cda40c4aff2711d9fd97ec",
  measurementId: "G-R6LRMPYRGY"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const firestore = getFirestore(app);
export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();

export default app;
