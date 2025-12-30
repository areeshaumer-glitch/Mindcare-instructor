import React from "react";
import images from "../assets/Images";

const AuthLayout = ({
  title = "Welcome",
  leftTitle = "MindCare Instructor",
  leftDescription = "Sign in to manage workout plans, videos, and attendance.",
  children,
}) => {
  return (
   <div className="flex flex-col md:flex-row min-h-screen w-full overflow-hidden">
  {/* Left Section (Image) */}
  <div className="relative w-full md:w-1/2 h-[48vh] md:h-auto overflow-hidden">
    <div
      className="absolute inset-0 bg-cover bg-center"
      style={{ backgroundImage: `url(${images.therapyImage})` }}
    ></div>
    <div className="absolute inset-0 bg-black/30"></div>
    <div className="relative z-10 flex flex-col justify-between h-full md:h-full text-white p-6 md:p-10 font-nunito">
      <h1 className="text-2xl md:text-5xl font-bold font-nunito">MindCare</h1>
      <div className="space-y-4">
        <h2 className="text-2xl md:text-4xl font-nunitoBold leading-tight">
          {leftTitle}
        </h2>
        <p className="text-sm md:text-base font-nunitoReguler text-gray-200">
          {leftDescription}
        </p>
      </div>
    </div>
  </div>

  {/* Right Section (Auth Form) */}
  <div className="w-full md:w-1/2 flex flex-col justify-center items-center bg-white px-6 md:px-8 py-8 md:py-10">
    <div className="w-full max-w-md">
      <h2 className="text-3xl md:text-4xl font-bold text-gray-800 mb-6 text-center">
        {title}
      </h2>
      {children}
    </div>
  </div>
</div>

  );
};

export default AuthLayout;
