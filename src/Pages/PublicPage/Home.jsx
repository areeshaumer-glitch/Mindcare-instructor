import React, { useEffect, useState } from "react";
import { useNavigate, Outlet, useLocation } from "react-router-dom";
import SidebarItem from "../../components/SideBarItem";
import images from "../../assets/Images";
import TopBar from "../../components/TopBar";
import { Method, callApi } from "../../network/NetworkManager";
import { api } from "../../network/Environment";
import { useAuthStore } from "../../store/authSlice";

const sidebarItems = [
  { label: "Dashboard", icon: images.dash },
  { label: "Create Workout", icon: images.workout },
  { label: "Video Library", icon: images.play },
  { label: "Track Attendance", icon: images.track },
  { label: "Sign Out", icon: images.Signout, isLast: true },
];

const Home = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [selected, setSelected] = useState("Dashboard");
  const [isCollapsed, setIsCollapsed] = useState(window.innerWidth < 650);
  const refreshToken = useAuthStore((s) => s.refreshToken);
  const logout = useAuthStore((s) => s.logout);

  const handleLogout = async () => {
    try {
      if (refreshToken) {
        await callApi({
          method: Method.POST,
          endPoint: api.logout,
          bodyParams: { refreshToken },
        });
      }
    } finally {
      logout();
      navigate("/");
    }
  };

  const handleClick = (label) => {
    setSelected(label);
    switch (label) {
      case "Dashboard":
        navigate("/home/dashboard");
        break;
      case "Create Workout":
        navigate("/home/create-workout");
        break;
      case "Video Library":
        navigate("/home/video-library");
        break;
      case "Track Attendance":
        navigate("/home/track-attendance");
        break;
      case "My Profile":
        navigate("/home/my-profile");
        break;
      case "Sign Out":
        void handleLogout();
        break;
      default:
        break;
    }
  };

  useEffect(() => {
    const path = location.pathname;
    if (path.endsWith("/dashboard") || path === "/home") {
      setSelected("Dashboard");
      return;
    }
    if (path.endsWith("/create-workout")) {
      setSelected("Create Workout");
      return;
    }
    if (path.endsWith("/video-library")) {
      setSelected("Video Library");
      return;
    }
    if (path.endsWith("/track-attendance")) {
      setSelected("Track Attendance");
      return;
    }
    if (path.endsWith("/my-profile")) {
      setSelected("My Profile");
    }
  }, [location.pathname]);

  useEffect(() => {
    const handleResize = () => setIsCollapsed(window.innerWidth < 650);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside
        className={`${
          isCollapsed ? "w-16" : "w-56"
        } bg-white shadow-lg pt-6 px-2 fixed inset-y-0 left-0 flex flex-col transition-all duration-300`}
      >
        <h1
          className={`text-xl font-bold text-teal-700 mb-6 text-center ${
            isCollapsed ? "text-sm" : ""
          }`}
        >
          {isCollapsed ? "MC" : "MindCare"}
        </h1>

        <div className="flex-1 flex flex-col space-y-3">
          {sidebarItems.map((item) => (
            <SidebarItem
              key={item.label}
              icon={item.icon}
              label={item.label}
              active={selected === item.label}
              onClick={() => handleClick(item.label)}
              isLast={item.isLast}
            />
          ))}
        </div>
      </aside>

      {/* Main Content */}
      <main
        className={`flex-1 bg-slate-100 min-h-screen transition-all duration-300 ${
          isCollapsed ? "ml-16" : "ml-56"
        } p-6`}
      >
        <TopBar
          onClick={() => {
            setSelected("My Profile");
            navigate("/home/my-profile");
          }}
        />

        <div className="mt-6">
          <Outlet /> {/* Child route content */}
        </div>
      </main>
    </div>
  );
};

export default Home;
