// Firebase Configuration
// To enable cloud saves and authentication:
// 1. Go to https://console.firebase.google.com/
// 2. Create a new project (or use existing)
// 3. Add a web app to get your config
// 4. Enable Authentication (Email/Password and/or Google)
// 5. Enable Firestore Database
// 6. Replace the config below with your values

import { initializeApp } from 'firebase/app';
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  collection,
  query,
  orderBy,
  limit,
  getDocs,
  addDoc,
  updateDoc,
  serverTimestamp
} from 'firebase/firestore';

// Firebase configuration - Your Chess Arena project
const firebaseConfig = {
  apiKey: "AIzaSyB2HHuBhGc41Z7TDdDBWwvmZdTjJVA9XuA",
  authDomain: "chessv1-97369.firebaseapp.com",
  projectId: "chessv1-97369",
  storageBucket: "chessv1-97369.firebasestorage.app",
  messagingSenderId: "694658964329",
  appId: "1:694658964329:web:f7fb4d459e6f61e7933bf8",
  measurementId: "G-LNESLRPKK8"
};

// Check if Firebase is configured
const isFirebaseConfigured = () => {
  return firebaseConfig.apiKey &&
         firebaseConfig.apiKey !== "YOUR_API_KEY" &&
         !firebaseConfig.apiKey.includes("YOUR_");
};

// Initialize Firebase only if configured
let app = null;
let auth = null;
let db = null;
let googleProvider = null;

if (isFirebaseConfigured()) {
  try {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    googleProvider = new GoogleAuthProvider();
  } catch (error) {
    console.error("Firebase initialization error:", error);
  }
}

// Auth functions
export const loginWithEmail = async (email, password) => {
  if (!auth) throw new Error("Firebase not configured");
  return signInWithEmailAndPassword(auth, email, password);
};

export const registerWithEmail = async (email, password) => {
  if (!auth) throw new Error("Firebase not configured");
  return createUserWithEmailAndPassword(auth, email, password);
};

export const loginWithGoogle = async () => {
  if (!auth || !googleProvider) throw new Error("Firebase not configured");
  return signInWithPopup(auth, googleProvider);
};

export const logout = async () => {
  if (!auth) throw new Error("Firebase not configured");
  return signOut(auth);
};

export const onAuthChange = (callback) => {
  if (!auth) {
    callback(null);
    return () => {};
  }
  return onAuthStateChanged(auth, callback);
};

// Firestore functions for game data
export const saveUserProfile = async (userId, profileData) => {
  if (!db) throw new Error("Firebase not configured");
  const userRef = doc(db, 'users', userId);
  await setDoc(userRef, {
    ...profileData,
    updatedAt: serverTimestamp()
  }, { merge: true });
};

export const getUserProfile = async (userId) => {
  if (!db) return null;
  const userRef = doc(db, 'users', userId);
  const userSnap = await getDoc(userRef);
  return userSnap.exists() ? userSnap.data() : null;
};

export const saveGameToCloud = async (userId, gameData) => {
  if (!db) throw new Error("Firebase not configured");
  const gamesRef = collection(db, 'users', userId, 'games');
  return addDoc(gamesRef, {
    ...gameData,
    createdAt: serverTimestamp()
  });
};

export const getUserGames = async (userId, limitCount = 20) => {
  if (!db) return [];
  const gamesRef = collection(db, 'users', userId, 'games');
  const q = query(gamesRef, orderBy('createdAt', 'desc'), limit(limitCount));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const updateUserStats = async (userId, stats) => {
  if (!db) throw new Error("Firebase not configured");
  const userRef = doc(db, 'users', userId);
  await updateDoc(userRef, {
    stats,
    updatedAt: serverTimestamp()
  });
};

export const getLeaderboardFromCloud = async (limitCount = 50) => {
  if (!db) return [];
  const usersRef = collection(db, 'users');
  const q = query(usersRef, orderBy('stats.score', 'desc'), limit(limitCount));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export { auth, db, isFirebaseConfigured };
