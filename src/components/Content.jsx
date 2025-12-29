import React, { useEffect, useState } from "react";
import images from "../assets/Images";
import VideoCard from "./VideoCard";
import Workout from "./Workout";
import TrackAttendence from "./TrackAttendence";

const Content = ({ selected }) => {
  const [select, setSelect] = useState(selected);

  useEffect(() => {
    setSelect(selected);
  }, [selected]);

  return (
    <div className=" w-full">
      {/* Conditional rendering based on selected value */}
      {select === "Dashboard" && <VideoCard />}
     {select === "Video Library" && <Workout />}
    {select === "Create Workout" && <Workout />}
    {select === "Track Attendance" && <TrackAttendence />}
    </div>
  );
};

export default Content;
