import React from "react";

const SidebarItem = ({ icon, label, active, onClick, isLast = false }) => (
  <div className={isLast ? "mt-auto flex justify-center items-center" : ""}
  >
    <button
      onClick={onClick}
      className={`flex items-center gap-3 px-4 py-3 w-full text-left text-sm font-medium rounded-lg transition ${active ? "bg-[#008080] text-white" : "text-gray-700"
        }`}
    >
      <img
        src={icon}
        alt={label}
        className={`w-[16px] h-[22px] opacity-100 rotate-0 ${active ? "filter brightness-0 invert" : ""}`}
      />
      <span className="inline">{label}</span>
    </button>
  </div>
);

export default SidebarItem;
