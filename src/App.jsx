import React, { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import {
  SignIn,
  ForgotPasswordPage,
  CreatePasswordPage,
  OTPPage,
  ProfileCreation,
  Dashboard,
  CreateWorkout,
  VideoLibrary,
  TrackAttendence,
  AttendenceHistory,
  Home,
  MyProfile
} from "./Pages/PagesList";

import { MdError } from "react-icons/md";
import { IoMdClose } from "react-icons/io";

function ToastHost() {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    const handler = (e) => {
      const detail = e?.detail || {};
      const message = String(detail?.message || "").trim();
      const type = detail?.type === "success" ? "success" : "error";
      if (!message) return;
      const id = Date.now() + Math.random();
      setToasts((prev) => [...prev, { id, type, message }]);
      const timeout = setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 4000);
      return () => clearTimeout(timeout);
    };
    window.addEventListener("app:toast", handler);
    return () => {
      window.removeEventListener("app:toast", handler);
    };
  }, []);

  return (
    <div className="fixed top-4 right-4 z-[1000] flex flex-col gap-2 pointer-events-none">
        <style>{`
          @keyframes shrink {
            from { width: 100%; }
            to { width: 0%; }
          }
        `}</style>
      {toasts.map((t) => (
        <div
          key={t.id}
          className="pointer-events-auto relative w-[300px] bg-white rounded-lg shadow-lg overflow-hidden border border-gray-100 flex flex-col"
        >
          <div className="flex items-center p-4 gap-3">
            {/* Icon */}
            <div className="text-red-500 text-2xl shrink-0">
               {/* Currently only handling error style as per request image, but keeping type check if needed later or generic */}
               {t.type === 'success' ? <div className="w-6 h-6 rounded-full bg-green-500" /> : <MdError />}
            </div>
            
            {/* Message */}
            <div className="text-gray-600 font-medium text-sm flex-1 leading-tight">
              {t.message}
            </div>

            {/* Close Button */}
            <button
              onClick={() => setToasts((prev) => prev.filter((toast) => toast.id !== t.id))}
              className="text-gray-400 hover:text-gray-600 transition-colors shrink-0"
            >
              <IoMdClose size={20} />
            </button>
          </div>

          {/* Progress Bar */}
          <div className="h-1.5 w-full bg-red-100">
             <div
                className="h-full bg-red-400 origin-left"
                style={{
                  animation: 'shrink 4000ms linear forwards'
                }}
             />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ToastHost />
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<SignIn />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/OTPPage" element={<OTPPage />} />
        <Route path="/create-password" element={<CreatePasswordPage />} />
        <Route path="/create-profile" element={<ProfileCreation />} />

        {/* Protected Home Layout with nested routes */}
        <Route path="home" element={<Home />} >
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
             <Route path="my-profile" element={<MyProfile />} />
          <Route path="create-workout" element={<CreateWorkout />} />
          <Route path="video-library" element={<VideoLibrary />} />
          <Route path="track-attendance" element={<TrackAttendence />} />
          <Route path="attendance-history" element={<AttendenceHistory />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
