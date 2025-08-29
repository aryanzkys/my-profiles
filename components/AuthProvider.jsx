"use client";
import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { initializeApp, getApps } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
} from 'firebase/auth';

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [themeDark, setThemeDark] = useState(true);
  const recaptchaSiteKeyV3 = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY_V3 || '';
  const recaptchaVerifiedRef = useRef(false);

  // Firebase init
  useEffect(() => {
    const cfg = {
      apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
      authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    };
    if (!getApps().length) initializeApp(cfg);
    const auth = getAuth();
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // reCAPTCHA v3 loader (optional but recommended)
  useEffect(() => {
    if (!recaptchaSiteKeyV3) return;
    if (document.getElementById('recaptcha-v3')) return;
    const s = document.createElement('script');
    s.id = 'recaptcha-v3';
    s.src = `https://www.google.com/recaptcha/api.js?render=${recaptchaSiteKeyV3}`;
    s.async = true;
    document.head.appendChild(s);
  }, [recaptchaSiteKeyV3]);

  const runRecaptcha = async (action = 'login') => {
    if (!recaptchaSiteKeyV3) return true; // skip if not configured
    return new Promise((resolve) => {
      const attempt = () => {
        if (!window.grecaptcha || !window.grecaptcha.execute) {
          setTimeout(attempt, 200);
          return;
        }
        window.grecaptcha.ready(() => {
          window.grecaptcha.execute(recaptchaSiteKeyV3, { action }).then((token) => {
            // In a full implementation, send token to server for verification.
            recaptchaVerifiedRef.current = !!token;
            resolve(true);
          }).catch(() => resolve(false));
        });
      };
      attempt();
    });
  };

  const signInWithGoogle = async () => {
    const ok = await runRecaptcha('google_login');
    if (!ok) throw new Error('reCAPTCHA failed');
    const auth = getAuth();
    const provider = new GoogleAuthProvider();
    return signInWithPopup(auth, provider);
  };

  const emailLogin = async (email, password) => {
    const ok = await runRecaptcha('email_login');
    if (!ok) throw new Error('reCAPTCHA failed');
    const auth = getAuth();
    return signInWithEmailAndPassword(auth, email, password);
  };

  const emailSignup = async (email, password) => {
    const ok = await runRecaptcha('email_signup');
    if (!ok) throw new Error('reCAPTCHA failed');
    const auth = getAuth();
    return createUserWithEmailAndPassword(auth, email, password);
  };

  const logout = () => signOut(getAuth());

  const value = useMemo(() => ({ user, loading, themeDark, setThemeDark, signInWithGoogle, emailLogin, emailSignup, logout }), [user, loading, themeDark]);
  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export function useAuth() { return useContext(AuthCtx) || {}; }
