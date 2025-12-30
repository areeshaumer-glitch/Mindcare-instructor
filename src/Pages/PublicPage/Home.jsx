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

const getSelectedFromPath = (pathname) => {
  const path = String(pathname || "");
  if (path.endsWith("/dashboard") || path === "/home") return "Dashboard";
  if (path.endsWith("/create-workout")) return "Create Workout";
  if (path.endsWith("/video-library")) return "Video Library";
  if (path.endsWith("/track-attendance") || path.endsWith("/attendance-history")) return "Track Attendance";
  if (path.endsWith("/my-profile")) return "My Profile";
  return "Dashboard";
};

const Home = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [selected, setSelected] = useState(() => getSelectedFromPath(location.pathname));
  const [isCollapsed, setIsCollapsed] = useState(window.innerWidth < 650);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
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
    setIsMobileMenuOpen(false);
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
    setSelected(getSelectedFromPath(location.pathname));
  }, [location.pathname]);

  useEffect(() => {
    const handleResize = () => {
      const nowCollapsed = window.innerWidth < 650;
      setIsCollapsed(nowCollapsed);
      if (!nowCollapsed) setIsMobileMenuOpen(false);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <div className="flex min-h-screen">
      {isCollapsed ? null : (
        <aside
          className="w-56 bg-white shadow-lg pt-6 px-2 fixed inset-y-0 left-0 flex flex-col transition-all duration-300"
        >
          <h1 className="text-xl font-bold text-teal-700 mb-6 text-center">MindCare</h1>

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
      )}

      {isCollapsed && isMobileMenuOpen ? (
        <div className="fixed inset-0 z-50" onClick={() => setIsMobileMenuOpen(false)}>
          <div className="absolute inset-0 bg-black/20" />
          <div
            className="absolute left-0 top-0 h-full w-72 bg-white shadow-xl p-4 flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="text-lg font-bold text-teal-700">MindCare</div>
              <button
                type="button"
                className="text-gray-500 text-2xl leading-none"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                &times;
              </button>
            </div>
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
          </div>
        </div>
      ) : null}

      {/* Main Content */}
      <main
        className={`flex-1 bg-slate-100 min-h-screen transition-all duration-300 ${
          isCollapsed ? "ml-0" : "ml-56"
        } p-6`}
      >
        <TopBar
          onMenuClick={isCollapsed ? () => setIsMobileMenuOpen((v) => !v) : undefined}
          onClick={() => {
            setSelected("My Profile");
            setIsMobileMenuOpen(false);
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
