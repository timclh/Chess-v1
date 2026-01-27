import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  onAuthChange,
  loginWithEmail,
  registerWithEmail,
  loginWithGoogle,
  logout,
  getUserProfile,
  saveUserProfile,
  isFirebaseConfigured
} from './firebase';

const AuthContext = createContext();

export const useAuth = () => {
  return useContext(AuthContext);
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isConfigured, setIsConfigured] = useState(false);

  useEffect(() => {
    setIsConfigured(isFirebaseConfigured());

    const unsubscribe = onAuthChange(async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        try {
          const profile = await getUserProfile(firebaseUser.uid);
          setUserProfile(profile);
        } catch (error) {
          console.error("Error loading profile:", error);
        }
      } else {
        setUserProfile(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const login = async (email, password) => {
    const result = await loginWithEmail(email, password);
    return result;
  };

  const register = async (email, password, displayName) => {
    const result = await registerWithEmail(email, password);
    // Create user profile
    await saveUserProfile(result.user.uid, {
      displayName,
      email,
      createdAt: new Date().toISOString(),
      stats: {
        wins: 0,
        losses: 0,
        draws: 0,
        gamesPlayed: 0,
        score: 0,
        winStreak: 0,
        bestWinStreak: 0,
        difficultyWins: { 1: 0, 2: 0, 3: 0, 4: 0 }
      }
    });
    return result;
  };

  const googleLogin = async () => {
    const result = await loginWithGoogle();
    // Check if profile exists, if not create one
    const profile = await getUserProfile(result.user.uid);
    if (!profile) {
      await saveUserProfile(result.user.uid, {
        displayName: result.user.displayName || 'Player',
        email: result.user.email,
        createdAt: new Date().toISOString(),
        stats: {
          wins: 0,
          losses: 0,
          draws: 0,
          gamesPlayed: 0,
          score: 0,
          winStreak: 0,
          bestWinStreak: 0,
          difficultyWins: { 1: 0, 2: 0, 3: 0, 4: 0 }
        }
      });
    }
    return result;
  };

  const signOut = async () => {
    await logout();
    setUserProfile(null);
  };

  const value = {
    user,
    userProfile,
    isConfigured,
    loading,
    login,
    register,
    googleLogin,
    signOut,
    refreshProfile: async () => {
      if (user) {
        const profile = await getUserProfile(user.uid);
        setUserProfile(profile);
      }
    }
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
