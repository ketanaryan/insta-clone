import React, { createContext, useState, useEffect } from 'react';
import { auth, db } from '../firebase';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  onAuthStateChanged,
  signOut
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import api from '../services/api';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [timeSpentToday, setTimeSpentToday] = useState(0); 
  const [sessionStartTime, setSessionStartTime] = useState(Date.now());

  // Load accumulated time from localStorage on mount
  useEffect(() => {
    const savedTime = localStorage.getItem('instavibe_time_spent_today');
    if (savedTime) setTimeSpentToday(parseInt(savedTime));
  }, []);

  // Sync state to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('instavibe_time_spent_today', timeSpentToday.toString());
  }, [timeSpentToday]);

  // Interval to update time spent every minute
  useEffect(() => {
    if (!currentUser) return;
    
    const interval = setInterval(() => {
      setTimeSpentToday(prev => prev + 1);
    }, 60000); // every 1 minute

    return () => clearInterval(interval);
  }, [currentUser]);

  useEffect(() => {
    // Listen for Firebase Auth state changes
    const unsubscribe = onAuthStateChanged(auth, async (userAuth) => {
      if (userAuth) {
        try {
          // Fetch additional user metadata from Firestore
          const userDocRef = doc(db, 'users', userAuth.uid);
          const userDocSnap = await getDoc(userDocRef);
          
          if (userDocSnap.exists()) {
             // For profile pic sync across app, we often use the DB data
             // We can also fetch the "live" profile from our MongoDB backend
             const mongoRes = await api.get(`/profile/${userDocSnap.data().username}`);
             const tempUserObj = {
               uid: userAuth.uid,
               email: userAuth.email,
               ...userDocSnap.data(),
               ...mongoRes.data // This contains pfp_url, bio, etc from MongoDB
             };
             setCurrentUser(tempUserObj);
             localStorage.setItem('instavibe_user_cache', JSON.stringify(tempUserObj));
          } else {
            setCurrentUser({ uid: userAuth.uid, email: userAuth.email });
          }
        } catch (error) {
          console.error("Error fetching Firestore user context:", error);
          setCurrentUser({ uid: userAuth.uid, email: userAuth.email });
        }
      } else {
        setCurrentUser(null);
        localStorage.removeItem('instavibe_user_cache');
        localStorage.removeItem('instavibe_time_spent_today');
        setTimeSpentToday(0);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const refreshCurrentUser = async () => {
    if (!currentUser?.username) return;
    try {
      const res = await api.get(`/profile/${currentUser.username}`);
      const updated = { ...currentUser, ...res.data, pfp_url: `${res.data.pfp_url}?t=${Date.now()}` };
      setCurrentUser(updated);
      localStorage.setItem('instavibe_user_cache', JSON.stringify(updated));
    } catch (err) {
      console.error("Error refreshing user context:", err);
    }
  };

  const startSession = async (username) => {
    try {
      const res = await api.post('/session/start', { username });
      if (res.data.sessionId) {
        localStorage.setItem('instavibe_session_id', res.data.sessionId);
      }
    } catch (err) {
      console.error("Session start error:", err);
    }
  };

  const endSession = async () => {
    const sessionId = localStorage.getItem('instavibe_session_id');
    if (!sessionId) return;
    try {
      await api.post('/session/end', { sessionId });
      localStorage.removeItem('instavibe_session_id');
    } catch (err) {
      console.error("Session end error:", err);
    }
  };

  useEffect(() => {
    const handleUnload = () => endSession();
    window.addEventListener('beforeunload', handleUnload);
    return () => window.removeEventListener('beforeunload', handleUnload);
  }, []);

  const signup = async (username, email, password) => {
    try {
      // 1. Create User in Firebase
      const { user } = await createUserWithEmailAndPassword(auth, email, password);
      
      const firestorePayload = {
        username: username,
        email: email,
        bio: "Hello! Welcome to my profile. 🌟 Capturing moments.",
        createdAt: new Date().toISOString(),
        isPrivate: false
      };

      // 2. Write metadata beautifully to Firestore `users`
      await setDoc(doc(db, "users", user.uid), firestorePayload);
      
      // 3. Start session
      await startSession(username);

      // 4. Immediately inject complete profile to state perfectly syncing the DB
      setCurrentUser({
        uid: user.uid,
        ...firestorePayload
      });
      
      return { success: true };
    } catch (error) {
      let message = error.message;
      if (error.code === 'auth/email-already-in-use') message = 'Email is already registered.';
      if (error.code === 'auth/weak-password') message = 'Password should be at least 6 characters.';
      return { success: false, message: message.replace('Firebase:', '').trim() };
    }
  };

  const login = async (email, password) => {
    try {
      const { user } = await signInWithEmailAndPassword(auth, email, password);
      
      // Fetch username to start session
      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (userDoc.exists()) {
        await startSession(userDoc.data().username);
      }

      return { success: true };
    } catch (error) {
      let message = 'Invalid email or password.';
      if (error.code === 'auth/user-not-found') message = 'No account found with this email.';
      if (error.code === 'auth/wrong-password') message = 'Incorrect password.';
      return { success: false, message: message };
    }
  };

  const logout = async () => {
    try {
      await endSession();
      await signOut(auth);
      localStorage.removeItem('instavibe_time_spent_today');
      setTimeSpentToday(0);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <AuthContext.Provider value={{ currentUser, login, signup, logout, loading, timeSpentToday, refreshCurrentUser }}>
        {!loading && children}
    </AuthContext.Provider>
  );
};
