import React, { useState } from 'react';
import { FaRedo, FaPlus } from 'react-icons/fa';

const WorkoutDetailForm = () => {
  const initialReps = ['', '', ''];
  const initialExercises = [
    {
      gym: {
        type: 'Chest Press Machine',
        reps: [...initialReps],
      },
      home: {
        type: 'Push Ups',
        reps: [...initialReps],
      },
    },
  ];

  const [selectedDays, setSelectedDays] = useState([]);
  const [exercisesByDay, setExercisesByDay] = useState({});
  const [errors, setErrors] = useState({});

  const days = ['Day 1', 'Day 2', 'Day 3', 'Day 4', 'Day 5', 'Day 6', 'Day 7'];

  const toggleDay = (day) => {
    const isSelected = selectedDays.includes(day);
    const updatedDays = isSelected
      ? selectedDays.filter((d) => d !== day)
      : [...selectedDays, day];

    setSelectedDays(updatedDays);
    if (!isSelected && !exercisesByDay[day]) {
      setExercisesByDay((prev) => ({ ...prev, [day]: [...initialExercises] }));
    }
  };

  const handleRepChange = (day, exerciseIndex, setIndex, location, value) => {
    const updated = { ...exercisesByDay };
    updated[day][exerciseIndex][location].reps[setIndex] = value;
    setExercisesByDay(updated);
  };

  const regenerate = (day, index) => {
    const updated = { ...exercisesByDay };
    updated[day][index].gym.reps = [...initialReps];
    updated[day][index].home.reps = [...initialReps];
    setExercisesByDay(updated);
  };

  const addExercise = (day) => {
    setExercisesByDay((prev) => ({
      ...prev,
      [day]: [...prev[day], {
        gym: { type: 'Chest Press Machine', reps: [...initialReps] },
        home: { type: 'Push Ups', reps: [...initialReps] },
      }],
    }));
  };

  const validateForm = () => {
    const newErrors = {};
    if (selectedDays.length === 0) {
      newErrors.days = 'Please select at least one day.';
    }

    selectedDays.forEach((day) => {
      exercisesByDay[day].forEach((ex, index) => {
        ['gym', 'home'].forEach((loc) => {
          ex[loc].reps.forEach((rep, idx) => {
            if (!rep.trim()) {
              newErrors[`${day}-${index}-${loc}-rep${idx}`] = true;
            }
          });
        });
      });
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleComplete = () => {
    if (validateForm()) {
      alert('Workout Plan Submitted Successfully!');
    }
  };

  return (
    <div className="flex flex-col sm:flex-row gap-6 p-6">
      {/* Left: Days Selection */}
      <div className="flex flex-col gap-3">
        {days.map((day, index) => (
          <label key={index} className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={selectedDays.includes(day)}
              onChange={() => toggleDay(day)}
              className="w-4 h-4 text-teal-600"
            />
            <span
              className={`text-sm ${
                errors.days && selectedDays.length === 0 ? 'text-red-600 font-semibold' : 'text-gray-800'
              }`}
            >
              {day}
            </span>
          </label>
        ))}
      </div>

      {/* Right: Exercise Entries */}
      <div className="flex-1">
        {selectedDays.map((day, i) => (
          <div key={i} className="mb-8">
            <h3 className="text-lg font-medium mb-4">{day}</h3>
            {exercisesByDay[day]?.map((exercise, idx) => (
              <div key={idx} className="mb-6">
                <h4 className="font-semibold mb-2">Exercise {idx + 1}</h4>
                <div className="flex gap-4 mb-2">
                  {[1, 2, 3].map((img) => (
                    <div
                      key={img}
                      className="w-16 h-16 bg-gray-300 rounded-md"
                    ></div>
                  ))}

                  <button
                    className="text-teal-600 text-sm flex items-center gap-1"
                    onClick={() => regenerate(day, idx)}
                  >
                    <FaRedo /> Regenerate
                  </button>
                </div>

                {['gym', 'home'].map((loc) => (
                  <div key={loc} className="mb-3 flex flex-row">
                    <div className="flex items-center gap-2 text-sm mb-1">
                      <span className="text-teal-600 font-medium">
                        {loc === 'gym' ? 'At Gym' : 'At Home'}
                      </span>
                      <span className="text-gray-700">{exercise[loc].type}</span>
                    </div>
                    <div className="flex gap-4">
                      {exercise[loc].reps.map((rep, setIdx) => (
                        <input
                          key={setIdx}
                          placeholder="Rep here"
                          value={rep}
                          onChange={(e) =>
                            handleRepChange(day, idx, setIdx, loc, e.target.value)
                          }
                          className={`border p-2 rounded-md w-28 text-sm focus:outline-none focus:border-teal-600 ${
                            errors[`${day}-${idx}-${loc}-rep${setIdx}`]
                              ? 'border-red-500'
                              : 'border-gray-300'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                ))}

                <button
                  onClick={() => addExercise(day)}
                  className="mt-2 flex items-center text-sm text-teal-600 gap-1"
                >
                  <FaPlus /> Add Exercise
                </button>
              </div>
            ))}
          </div>
        ))}

        {selectedDays.length > 0 && (
          <div className="flex justify-end mt-10">
            <button
              onClick={handleComplete}
              className="bg-teal-700 hover:bg-teal-800 text-white px-6 py-2 rounded-lg text-sm"
            >
              COMPLETE
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default WorkoutDetailForm;
