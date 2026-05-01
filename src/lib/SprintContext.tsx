"use client"
import React, { createContext, useContext, useState, useEffect, useRef, useMemo } from 'react';
import { useAuthState } from "react-firebase-hooks/auth";
import { auth, db } from "@/lib/firebase";
import { collection, addDoc, Timestamp } from "firebase/firestore";


const SprintContext = createContext<any>(null);

export function SprintProvider({ children }: { readonly children: React.ReactNode }) {
  const [user, loading] = useAuthState(auth);
  
  // CONTEXT: this is the lock that prevents the accidental deletions on refresh
  const [isInitialized, setIsInitialized] = useState(false); 
  // CONTEXT: For Session Config
  const [mins, setMins] = useState<number | string>(25);
  const [secs, setSecs] = useState<number | string>("00");
  const [isCreated, setIsCreated] = useState(false);
  const [showWarning, setShowWarning] = useState(false);
  // CONTEXT: For Active Timer State
  const [sessionDuration, setSessionDuration] = useState(25);
  const [timeLeft, setTimeLeft] = useState(25);
  const [isActive, setIsActive] = useState(false);
  const [endTime, setEndTime] = useState<number | null>(null);
  // CONTREXT: For Aborting State
  const [holdProgress, setHoldProgress] = useState(0);
  const [showAbortPrompt, setShowAbortPrompt] = useState(false);
  const holdTimerRef = useRef<NodeJS.Timeout | null>(null);
  const holdIntervalRef = useRef<NodeJS.Timeout | null>(null);
  // CONTEXT: Visual Animations
  const [visualProgress, setVisualProgress] = useState(1);

  useEffect(() => {
    const saved_stated = localStorage.getItem('sprint_state');
    if (saved_stated) {
      try {
        const parsed = JSON.parse(saved_stated);
        if (parsed.isCreated) {
          setSessionDuration(parsed.sessionDuration);
          setIsCreated(true);
          // CONTEXT: Calculate the bar position instantly, preventing glitch on new pages
          setVisualProgress(parsed.timeLeft / parsed.sessionDuration); 
          if (parsed.isActive) {
            setTimeLeft(parsed.timeLeft);
            setEndTime(Date.now() + (parsed.timeLeft * 1000)); // ms to s conversion
            setIsActive(true);
          } else {
            setTimeLeft(parsed.timeLeft);
            setIsActive(false);
            setEndTime(null);
          }
        }
      } catch (e) {
        console.error("Sprint State Parse Error: " + e);
      }
    }
    // CONTEXT: Show State of Timer
    setIsInitialized(true); 
  }, []);

  useEffect(() => {
    // CONTEXT: Only kill the timer if ongoing, Firebase is DONE loading, and NO user
    if (isInitialized && !loading && !user) {
      setIsCreated(false);
      setIsActive(false);
      setEndTime(null);
      localStorage.removeItem('sprint_state');
    }
  }, [user, loading, isInitialized]);

  useEffect(() => {
    if (!isInitialized) return;

    const handlePlatformVisibilityOnChanged = () => {
      // CONTEXT: document.hidden is loaded when  
      // - Switching Tabs/App
      // - Minimizing the Window
      // - Locking your device
      // - Opening a new window, blocking COMPLETELY
      // - Swipe to Home-screen
      if (document.hidden) {
        if (isActive) {
          const exact = endTime ? (endTime - Date.now()) / 1000 : timeLeft;
          setTimeLeft(exact);
          setEndTime(null);
          // CONTEXT: As users look away, we FREEZE exact time and SAVE the sprint state
          localStorage.setItem('sprint_state', JSON.stringify({ 
            sessionDuration, isActive, isCreated, endTime: null, timeLeft: exact 
          }));
        }
      } 
      else if (isActive && isCreated) {
        setEndTime(Date.now() + (timeLeft * 1000));
      }
    };

    const handlePlatformBeforeUnload = () => {
      if (isCreated) {
        // CONTEXT: If the browser tab is closed entirely, we FREEZE exact time and SAVE it
        const exact = (isActive && endTime) ? (endTime - Date.now()) / 1000 : timeLeft;
        localStorage.setItem('sprint_state', JSON.stringify({ 
          sessionDuration, isActive, isCreated, endTime: null, timeLeft: exact 
        }));
      }
    };

    document.addEventListener("visibilitychange", handlePlatformVisibilityOnChanged);
    window.addEventListener("beforeunload", handlePlatformBeforeUnload);

    return () => {
      document.removeEventListener("visibilitychange", handlePlatformVisibilityOnChanged);
      window.removeEventListener("beforeunload", handlePlatformBeforeUnload);
    };
  }, [isActive, endTime, timeLeft, isCreated, sessionDuration, isInitialized]);

  // CONTEXT: AUTOSAVE: Only run after initialization
  useEffect(() => {
    if (!isInitialized) return; // CONTEXT: Prevent saving before loading, deleting the saved progress.

    if (isCreated && !document.hidden) {
      localStorage.setItem('sprint_state', JSON.stringify({ 
        sessionDuration, isActive, isCreated, endTime, timeLeft 
      }));
    } else if (!isCreated) {
      localStorage.removeItem('sprint_state');
    }
  }, [isActive, endTime, isCreated, sessionDuration, timeLeft, isInitialized]);

  // CONTEXT: TIMER (LOGIC)
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isActive && endTime && !document.hidden) {
      interval = setInterval(() => {
        const now = Date.now();
        const remaining = (endTime - now) / 1000;
        
        if (remaining <= 0) { // CONTEXT: TIMER IS UP
          setTimeLeft(0);
          completeSession(sessionDuration);
          clearInterval(interval);
        } else {
          setTimeLeft(remaining);
        }
      }, 200);
    }
    return () => clearInterval(interval);
  }, [isActive, endTime, sessionDuration]);

  // --- CONTEXT: ANIMATED TIMER (VISUAL)
  useEffect(() => {
    let frameId: number;
    const updateVisuals = () => {
      if (isActive && endTime) {
        const now = Date.now();
        const remainingMs = Math.max(0, endTime - now);
        const progress = remainingMs / (sessionDuration * 1000);
        setVisualProgress(Math.max(0, Math.min(1, progress)));
        frameId = requestAnimationFrame(updateVisuals);
      }
    };
    if (isActive) frameId = requestAnimationFrame(updateVisuals);
    return () => cancelAnimationFrame(frameId);
  }, [isActive, endTime, sessionDuration]);

  
  // CONTEXT: USER ACTIONS BELOWS

  const startHoldAbort = () => {
    if (!isCreated) return;
    clearHold();
    let ms = 0;
    holdIntervalRef.current = setInterval(() => {
      ms += 50;
      const progress = Math.min(100, (ms / 3000) * 100);
      setHoldProgress(progress);
      if (progress >= 100) {
        clearHold();
        setIsActive(false);
        setEndTime(null);
        setShowAbortPrompt(true);
      }
    }, 50);
  };

  const clearHold = () => {
    if (holdIntervalRef.current) clearInterval(holdIntervalRef.current);
    if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
    setHoldProgress(0);
  };

  const handleAbortLog = async (reason: string) => {
    setShowAbortPrompt(false);
    setIsCreated(false);
    setEndTime(null);
    setTimeLeft(sessionDuration);
    setVisualProgress(1);
    if (user) {
      await addDoc(collection(db, "sessions"), {
        uid: user.uid, duration: sessionDuration - Math.ceil(timeLeft), 
        intendedDuration: sessionDuration, status: 'failed',
        reason: reason, createdAt: Timestamp.now()
      });
    }
  };

  const handleCreateRequest = () => {
    const m = typeof mins === 'string' ? Number.parseInt(mins) || 0 : mins;
    const s = typeof secs === 'string' ? Number.parseInt(secs) || 0 : secs;
    const total = (m * 60) + s;
    if (total < 10) return; 
    setSessionDuration(total);
    setTimeLeft(total);
    setVisualProgress(1); // CONTEXT: Set to 100% when Starting Session
    setShowWarning(true);
  };

  const confirmCreation = () => {
    setIsCreated(true);
    setShowWarning(false);
    setIsActive(true);
    setEndTime(Date.now() + (sessionDuration * 1000));
  };

  const togglePause = () => {
    if (isActive) {
      setIsActive(false);
      const exactTimeLeft = endTime ? (endTime - Date.now()) / 1000 : timeLeft;
      setEndTime(null);
      setTimeLeft(exactTimeLeft);
    } else {
      setIsActive(true);
      setEndTime(Date.now() + (timeLeft * 1000));
    }
  };

  const completeSession = async (durationToSave: number) => {
    setIsActive(false);
    setIsCreated(false);
    setEndTime(null);
    setVisualProgress(0);
    if (user) { 
      await addDoc(collection(db, "sessions"), {
        uid: user.uid, duration: durationToSave,
        status: 'completed', createdAt: Timestamp.now()
      });
    }
  };

  const canLeave = useMemo(() => {
    if (!isCreated) return true;
    const elapsed = sessionDuration - timeLeft;
    return elapsed >= (sessionDuration * 0.7) || timeLeft <= 600;
  }, [timeLeft, sessionDuration, isCreated]);


  const formatTime = (seconds: number) => {
    const totalSeconds = Math.ceil(seconds); 
    const m = Math.floor(totalSeconds / 60);
    const rS = totalSeconds % 60; 
    return `${m.toString().padStart(2, '0')}:${rS.toString().padStart(2, '0')}`;
  };

  const value = useMemo(() => ({
  mins, setMins, secs, setSecs, isCreated, showWarning, setShowWarning,
  sessionDuration, timeLeft, isActive, visualProgress, holdProgress,
  showAbortPrompt, handleAbortLog, startHoldAbort, clearHold,
  handleCreateRequest, confirmCreation, togglePause, formatTime, canLeave
}), [
  mins, secs, isCreated, showWarning, sessionDuration, timeLeft, 
  isActive, visualProgress, holdProgress, showAbortPrompt, canLeave
  // CONTEXT: Getters are only added. Setters are not added to array because React knows it will never change.
]);

  return <SprintContext.Provider value={value}>{children}</SprintContext.Provider>;
}

export const useSprint = () => useContext(SprintContext);