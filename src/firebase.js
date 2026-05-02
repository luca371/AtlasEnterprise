// src/firebase.js
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyA2kKK0FhHW6zYHsw8CsAvBurfdzRiqwfs",
  authDomain: "atlasenterprise-a29ee.firebaseapp.com",
  projectId: "atlasenterprise-a29ee",
  storageBucket: "atlasenterprise-a29ee.firebasestorage.app",
  messagingSenderId: "282436835801",
  appId: "1:282436835801:web:ca8e25f42d2c4bf8c2a1c8",
  measurementId: "G-8V5J6BJKMB"
};

const app = initializeApp(firebaseConfig);
export const analytics = getAnalytics(app);
export const auth = getAuth(app);
export const db = getFirestore(app);

export default app;