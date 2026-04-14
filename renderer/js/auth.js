// ✅ Lucide Icons
lucide.createIcons();

// 🔥 Firebase CDN Imports (IMPORTANT FIX)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// 🔐 Firebase Config
const firebaseConfig = {
  apiKey: "AIzaSyCZLj3lS7TfXOHyO0U3tf3VxpLDQk2MtsQ",
  authDomain: "systemanalyzerauth.firebaseapp.com",
  projectId: "systemanalyzerauth",
  storageBucket: "systemanalyzerauth.firebasestorage.app",
  messagingSenderId: "877676581955",
  appId: "1:877676581955:web:95e05ed26fbd8b97e870f6",
};

// 🚀 Initialize
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// ===============================
// 🔑 AUTH FUNCTIONS
// ===============================

// ✅ SIGN UP
export async function signup(email, password) {
  return await createUserWithEmailAndPassword(auth, email, password);
}

// ✅ LOGIN
export async function login(email, password) {
  return await signInWithEmailAndPassword(auth, email, password);
}

// ✅ LOGOUT
export async function logout() {
  return await signOut(auth);
}

// ✅ AUTO AUTH CHECK
export function observeAuth(callback) {
  return onAuthStateChanged(auth, callback);
}
