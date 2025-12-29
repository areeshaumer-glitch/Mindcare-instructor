import React from "react";

const SidebarItem = ({ icon, label, active, onClick, isLast = false }) => (
  <div className={isLast ? "mt-auto flex justify-center items-center" : ""}
>
    <button
      onClick={onClick}
      className={`flex items-center gap-3 px-4 py-3 w-fit sm:w-full text-left text-sm font-medium rounded-lg transition ${
        active ? "bg-teal-700 text-white" : "text-gray-700"
      }`}
    >
      <img
        src={icon}
        alt={label}
       className={`${isLast ? "w-12 h-10 lg:w-8 lg:h-6" : "w-5 h-5"} ${active ? "filter brightness-0 invert" : ""}`}

      />
      <span className="hidden sm:inline">{label}</span>
    </button>
  </div>
);

export default SidebarItem;
