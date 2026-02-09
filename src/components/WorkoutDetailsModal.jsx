import { useState } from "react";

export function WorkoutDetailsModal({ showModal, setShowModal, workoutData, onComplete }) {
  const [selectedDays, setSelectedDays] = useState([]);
  const [exercises, setExercises] = useState([
    {
      id: 1,
      name: 'Exercise 1',
      image: '🏋️',
      gymExercise: 'Chest Press Machine',
      homeExercise: 'Push Ups',
      sets: [
        { id: 1, reps: '' }
      ]
    }
  ]);
  const [errors, setErrors] = useState({});

  const days = ['Day 1', 'Day 2', 'Day 3', 'Day 4', 'Day 5', 'Day 6', 'Day 7'];

  const toggleDay = (day) => {
    setSelectedDays(prev => 
      prev.includes(day) 
        ? prev.filter(d => d !== day)
        : [...prev, day]
    );
  };

  const addSet = (exerciseId) => {
    setExercises(prev => prev.map(exercise => 
      exercise.id === exerciseId && exercise.sets.length < 3
        ? {
            ...exercise,
            sets: [...exercise.sets, { id: exercise.sets.length + 1, reps: '' }]
          }
        : exercise
    ));
  };

  const removeSet = (exerciseId) => {
    setExercises(prev => prev.map(exercise => 
      exercise.id === exerciseId && exercise.sets.length > 1
        ? {
            ...exercise,
            sets: exercise.sets.slice(0, -1)
          }
        : exercise
    ));
  };

  const updateSetReps = (exerciseId, setId, value) => {
    setExercises(prev => prev.map(exercise => 
      exercise.id === exerciseId 
        ? {
            ...exercise,
            sets: exercise.sets.map(set => 
              set.id === setId ? { ...set, reps: value } : set
            )
          }
        : exercise
    ));
  };

  const validate = () => {
    const newErrors = {};
    if (selectedDays.length === 0) {
      newErrors.days = 'Please select at least one day';
    }
    
    const hasEmptySets = exercises.some(exercise => 
      exercise.sets.some(set => !set.reps.trim())
    );
    if (hasEmptySets) {
      newErrors.sets = 'Please fill all rep fields';
    }
    
    return newErrors;
  };

  const handleComplete = () => {
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    
    alert('Workout plan created successfully!');
    onComplete();
    // Reset form
    setSelectedDays([]);
    setExercises([{
      id: 1,
      name: 'Exercise 1',
      image: '🏋️',
      gymExercise: 'Chest Press Machine',
      homeExercise: 'Push Ups',
      sets: [
        { id: 1, reps: '' }
      ]
    }]);
    setErrors({});
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedDays([]);
    setExercises([{
      id: 1,
      name: 'Exercise 1',
      image: '🏋️',
      gymExercise: 'Chest Press Machine',
      homeExercise: 'Push Ups',
      sets: [
        { id: 1, reps: '' }
      ]
    }]);
    setErrors({});
  };

  if (!showModal) return null;

  return (
    <div className="fixed inset-0 backdrop-blur-sm bg-black/50 flex justify-center items-center z-[60]">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl p-6 relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={closeModal}
          className="absolute right-4 top-4 text-gray-500 text-xl hover:text-gray-700"
        >
          &times;
        </button>

        <h2 className="text-2xl font-semibold mb-6">Exercises</h2>

        {/* Day Selection Sidebar */}
        <div className="flex gap-6">
          <div className="w-32 flex-shrink-0">
            <div className="space-y-3">
              {days.map((day) => (
                <div key={day} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id={day}
                    checked={selectedDays.includes(day)}
                    onChange={() => toggleDay(day)}
                    className={`w-4 h-4 rounded border-2 ${
                      selectedDays.includes(day)
                        ? 'bg-teal-600 border-teal-600'
                        : errors.days
                        ? 'border-red-500'
                        : 'border-gray-300'
                    }`}
                  />
                  <label 
                    htmlFor={day} 
                    className={`text-sm ${
                      errors.days && !selectedDays.includes(day) ? 'text-red-500' : 'text-gray-700'
                    }`}
                  >
                    {day}
                  </label>
                </div>
              ))}
            </div>
            {errors.days && <p className="text-red-500 text-xs mt-2">{errors.days}</p>}
          </div>

          {/* Exercise Content - Only show when days are selected */}
          <div className="flex-1">
            {selectedDays.length > 0 ? (
              exercises.map((exercise) => (
                <div key={exercise.id} className="mb-8">
                  <h3 className="text-lg font-medium mb-4">{exercise.name}</h3>
                  
                  {/* Exercise Images */}
                  <div className="flex gap-2 mb-4">
                    <div className="w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center text-2xl">
                      {exercise.image}
                    </div>
                    <div className="w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center text-2xl">
                      {exercise.image}
                    </div>
                    <div className="w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center text-2xl">
                      {exercise.image}
                    </div>
                  </div>

                  {/* Gym Exercise */}
                  <div className="mb-1
                  ">
                    <div className="flex items-center gap-4 mb-2">
                      <span className="text-teal-600 font-medium text-sm">At Gym</span>
                      <span className="text-gray-700">{exercise.gymExercise}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      {exercise.sets.map((set) => (
                        <div key={set.id} className="flex items-center gap-2">
                          <span className="text-sm text-gray-600">Set {set.id}</span>
                          <input
                            type="text"
                            placeholder="Rep here"
                            value={set.reps}
                            onChange={(e) => updateSetReps(exercise.id, set.id, e.target.value)}
                            className={`w-20 px-2 py-1 border rounded text-sm focus:outline-none focus:border-teal-600 ${
                              errors.sets && !set.reps.trim() ? 'border-red-500' : 'border-gray-300'
                            }`}
                          />
                        </div>
                      ))}
                      {/* Plus icon after the last set */}
                      {exercise.sets.length < 3 && (
                        <button
                          onClick={() => addSet(exercise.id)}
                          className="w-6 h-6 rounded-full bg-teal-100 text-teal-700 hover:bg-teal-200 flex items-center justify-center text-sm font-bold"
                        >
                          +
                        </button>
                      )}
                      {/* Minus icon (only show if more than 1 set) */}
                      {exercise.sets.length > 1 && (
                        <button
                          onClick={() => removeSet(exercise.id)}
                          className="w-6 h-6 rounded-full bg-red-100 text-red-600 hover:bg-red-200 flex items-center justify-center text-sm font-bold"
                        >
                          −
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Home Exercise */}
                  <div className="mb-1">
                    <div className="flex items-center gap-4 mb-2">
                      <span className="text-teal-600 font-medium text-sm">At Home</span>
                      <span className="text-gray-700">{exercise.homeExercise}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      {exercise.sets.map((set) => (
                        <div key={set.id} className="flex items-center gap-2">
                          <span className="text-sm text-gray-600">Set {set.id}</span>
                          <input
                            type="text"
                            placeholder="Rep here"
                            value={set.reps}
                            onChange={(e) => updateSetReps(exercise.id, set.id, e.target.value)}
                            className={`w-20 px-2 py-1 border rounded text-sm focus:outline-none focus:border-teal-600 ${
                              errors.sets && !set.reps.trim() ? 'border-red-500' : 'border-gray-300'
                            }`}
                          />
                        </div>
                      ))}
                      {/* Plus icon after the last set */}
                      {exercise.sets.length < 3 && (
                        <button
                          onClick={() => addSet(exercise.id)}
                          className="w-6 h-6 rounded-full bg-teal-100 text-teal-700 hover:bg-teal-200 flex items-center justify-center text-sm font-bold"
                        >
                          +
                        </button>
                      )}
                      {/* Minus icon (only show if more than 1 set) */}
                      {exercise.sets.length > 1 && (
                        <button
                          onClick={() => removeSet(exercise.id)}
                          className="w-6 h-6 rounded-full bg-red-100 text-red-600 hover:bg-red-200 flex items-center justify-center text-sm font-bold"
                        >
                          −
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex items-center justify-center h-64 text-gray-500">
                <p>Please select at least one day to view exercises</p>
              </div>
            )}

            {errors.sets && <p className="text-red-500 text-sm mb-4">{errors.sets}</p>}

            {/* Buttons */}
            <div className="flex justify-center gap-3 pt-0">
              <button
                onClick={closeModal}
                className="px-8 py-3 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 min-w-[120px]"
              >
                Cancel
              </button>
              <button
                onClick={handleComplete}
                className="px-8 py-3 rounded-lg bg-teal-600 text-white hover:bg-teal-700 min-w-[120px]"
              >
                Complete
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
