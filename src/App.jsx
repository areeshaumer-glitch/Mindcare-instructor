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

export default function App() {
  return (
    <BrowserRouter>
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
