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
    <div className="fixed top-4 right-4 z-[1000] space-y-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`px-4 py-3 rounded-lg  text-sm ${
            t.type === "error" ? " border border-[2px] border-red-500 bg-white text-red-500" : "bg-teal-600 text-white"
          }`}
        >
          {t.message}
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
