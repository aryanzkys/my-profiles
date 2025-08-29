"use client";
import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { initializeApp, getApps } from 'firebase/app';
import { getAnalytics, isSupported as analyticsSupported } from 'firebase/analytics';
import {
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  reload,
} from 'firebase/auth';

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [themeDark, setThemeDark] = useState(true);
  const [initError, setInitError] = useState(null);
  const recaptchaSiteKeyV3 = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY_V3 || '';
  const recaptchaVerifiedRef = useRef(false);

  // Firebase init
  useEffect(() => {
    const cfg = {
      apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
      authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    };
    try {
      // Validate minimal config to prevent client-side crash
      if (!cfg.apiKey || !cfg.authDomain || !cfg.projectId || !cfg.appId) {
        throw new Error('Firebase config missing. Set NEXT_PUBLIC_FIREBASE_API_KEY, AUTH_DOMAIN, PROJECT_ID, and APP_ID.');
      }
      if (!getApps().length) {
        const app = initializeApp(cfg);
        // Optional analytics in browser only
        if (typeof window !== 'undefined') {
          analyticsSupported().then((ok) => { if (ok && process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID) getAnalytics(app); }).catch(() => {});
        }
      }
      const auth = getAuth();
      const unsub = onAuthStateChanged(auth, (u) => {
        setUser(u);
        setLoading(false);
      });
      return () => unsub();
    } catch (e) {
      console.error('Auth init failed:', e);
      setInitError(e?.message || 'Auth init failed');
      setLoading(false);
      return () => {};
    }
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
          window.grecaptcha.execute(recaptchaSiteKeyV3, { action }).then(async (token) => {
            try {
              const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
              const candidates = Array.from(new Set([
                '/.netlify/functions/verify-recaptcha',
                `${basePath}/.netlify/functions/verify-recaptcha`,
              ]));
              let verified = false;
              for (const url of candidates) {
                try {
                  const res = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ token, action }) });
                  if (res.ok) {
                    const j = await res.json();
                    if (j && j.ok) { verified = true; break; }
                  }
                } catch {}
              }
              recaptchaVerifiedRef.current = verified;
              resolve(verified);
            } catch {
              resolve(false);
            }
          }).catch(() => resolve(false));
        });
      };
      attempt();
    });
  };

  const signInWithGoogle = async () => {
  if (initError) throw new Error(initError);
    const ok = await runRecaptcha('google_login');
    if (!ok) throw new Error('reCAPTCHA failed');
    const auth = getAuth();
    const provider = new GoogleAuthProvider();
    return signInWithPopup(auth, provider);
  };

  const emailLogin = async (email, password) => {
  if (initError) throw new Error(initError);
    const ok = await runRecaptcha('email_login');
    if (!ok) throw new Error('reCAPTCHA failed');
    const auth = getAuth();
    return signInWithEmailAndPassword(auth, email, password);
  };

  const emailSignup = async (email, password) => {
  if (initError) throw new Error(initError);
    const ok = await runRecaptcha('email_signup');
    if (!ok) throw new Error('reCAPTCHA failed');
    const auth = getAuth();
    return createUserWithEmailAndPassword(auth, email, password);
  };

  const logout = () => signOut(getAuth());

  // Force-refresh the current user and update context (use after updateProfile, etc.)
  const refreshUser = async () => {
    try {
      const auth = getAuth();
      if (auth.currentUser) {
        await reload(auth.currentUser);
        // Clone to ensure React detects a state change even if Firebase mutates the same object
        setUser({ ...auth.currentUser });
        return auth.currentUser;
      }
    } catch (e) {
      console.warn('refreshUser failed:', e?.message || e);
    }
    return null;
  };

  const value = useMemo(() => ({ user, loading, initError, themeDark, setThemeDark, signInWithGoogle, emailLogin, emailSignup, logout, refreshUser }), [user, loading, initError, themeDark]);
  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export function useAuth() { return useContext(AuthCtx) || {}; }
