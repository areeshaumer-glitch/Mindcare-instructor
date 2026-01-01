import React, { useCallback, useEffect, useState } from 'react'; 
import { Plus, Minus, X, Check, Trash2, Edit3, RotateCcw } from 'lucide-react';
import images from '../../assets/Images';
import { Method, callApi } from '../../network/NetworkManager';
import { api } from '../../network/Environment';
const CreateWorkout = () => {
  const WORKOUTS_STORAGE_KEY = 'mindcare-instructor.workoutPlans';
  const [currentModal, setCurrentModal] = useState(null); // null, 'create', 'exercises', 'edit'
  const [workoutPlans, setWorkoutPlans] = useState([]);
  const [editingPlan, setEditingPlan] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [apiError, setApiError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isLoadingWorkouts, setIsLoadingWorkouts] = useState(false);

  const extractWorkoutPlans = useCallback((response) => {
    if (Array.isArray(response)) return response;
    if (Array.isArray(response?.data)) return response.data;
    if (Array.isArray(response?.data?.data)) return response.data.data;
    if (Array.isArray(response?.items)) return response.items;
    if (Array.isArray(response?.data?.items)) return response.data.items;
    return [];
  }, []);

  const normalizeWorkoutPlan = useCallback((plan) => {
    const selectedDays = Array.isArray(plan?.days)
      ? plan.days.map((d) => d?.day).filter((d) => typeof d === 'number')
      : Array.isArray(plan?.selectedDays)
        ? plan.selectedDays
        : [];

    return {
      ...plan,
      id: plan?._id || plan?.id || `${Date.now()}`,
      selectedDays,
      coverImageUrl:
        typeof plan?.coverImageUrl === 'string'
          ? plan.coverImageUrl.replace(/`/g, '').trim()
          : plan?.coverImageUrl,
    };
  }, []);

  const loadWorkouts = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setIsLoadingWorkouts(true);
    setApiError('');

    await callApi({
      method: Method.GET,
      endPoint: api.workouts,
      onSuccess: (response) => {
        const list = extractWorkoutPlans(response).map(normalizeWorkoutPlan);
        setWorkoutPlans(list);
      },
      onError: (error) => {
        setApiError(error?.message || 'Failed to load workouts. Please try again.');
      },
    });

    if (!silent) setIsLoadingWorkouts(false);
  }, [extractWorkoutPlans, normalizeWorkoutPlan]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(WORKOUTS_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) setWorkoutPlans(parsed.map(normalizeWorkoutPlan));
    } catch {
      localStorage.removeItem(WORKOUTS_STORAGE_KEY);
    }
  }, [normalizeWorkoutPlan]);

  useEffect(() => {
    try {
      localStorage.setItem(WORKOUTS_STORAGE_KEY, JSON.stringify(workoutPlans));
    } catch (e) {
      void e;
    }
  }, [workoutPlans]);

  useEffect(() => {
    void loadWorkouts();
  }, [loadWorkouts]);

  useEffect(() => {
    if (currentModal !== 'exercises' && currentModal !== 'create' && !showDeleteModal) return;
    const prevBodyOverflow = document.body.style.overflow;
    const prevHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevBodyOverflow;
      document.documentElement.style.overflow = prevHtmlOverflow;
    };
  }, [currentModal, showDeleteModal]);
  
  const [createForm, setCreateForm] = useState({
    name: '',
    targetArea: '',
    duration: '',
    goalType: '',
    prompt: '',
  });
  const [createErrors, setCreateErrors] = useState({});

  const [exerciseForm, setExerciseForm] = useState({
    selectedDays: [1],
   exercises: [
    {
      id: 1,
      name: 'Exercise 1',
      image: images.excer,
      sets: [
        {
          id: 1,
          location: 'At Gym',
          exercise: 'Chest Press Machine',
          reps: ['', '', ''], // <-- multiple reps per set
        },
        {
          id: 2,
          location: 'At Home',
          exercise: 'Push Ups',
          reps: ['', '', ''],
        },
      ],
    },
    // more exercises...
  ],
  });
  const [exerciseErrors, setExerciseErrors] = useState({});

  // Create Modal Functions
  const validateCreateForm = () => {
    const newErrors = {};
    if (!createForm.name.trim()) newErrors.name = 'Plan name is required';
    if (createForm.targetArea.length < 3) newErrors.targetArea = 'Please select Target areas';
    if (!createForm.duration.trim()) newErrors.duration = 'Duration is required';
    if (!createForm.goalType.trim()) newErrors.goalType = 'Goal type is required';
    if (!createForm.prompt.trim()) newErrors.prompt = 'Prompt is required';
    return newErrors;
  };

  const handleCreateSubmit = () => {
    setApiError('');
    resetExerciseForm();
    setExerciseErrors({});
    const validationErrors = validateCreateForm();
    if (Object.keys(validationErrors).length > 0) {
      setCreateErrors(validationErrors);
      return;
    }
    setCurrentModal('exercises');
    setCreateErrors({});
  };

  const resetCreateForm = () => {
    setCreateForm({ name: '', targetArea: '', duration: '', goalType: '', prompt: '' });
    setCreateErrors({});
  };

  // Exercise Modal Functions
  const addExerciseSet = (exerciseId) => {
    setExerciseForm(prev => ({
      ...prev,
      exercises: prev.exercises.map(ex => 
        ex.id === exerciseId 
          ? { 
              ...ex, 
              sets: [...ex.sets, { 
                id: Date.now(), 
                location: 'At Gym', 
                exercise: 'New Exercise', 
                reps: '' 
              }] 
            }
          : ex
      )
    }));
  };

  const removeExerciseSet = (exerciseId, setId) => {
    setExerciseForm(prev => ({
      ...prev,
      exercises: prev.exercises.map(ex => 
        ex.id === exerciseId 
          ? { ...ex, sets: ex.sets.filter(set => set.id !== setId) }
          : ex
      )
    }));
  };

  const addExercise = () => {
    setExerciseForm((prev) => {
      const nextId = prev.exercises.length
        ? Math.max(...prev.exercises.map((e) => e.id)) + 1
        : 1;
      return {
        ...prev,
        exercises: [
          ...prev.exercises,
          {
            id: nextId,
            name: `Exercise ${nextId}`,
            image: images.excer,
            sets: [
              {
                id: Date.now(),
                location: 'At Gym',
                exercise: 'Chest Press Machine',
                reps: ['', '', ''],
              },
              {
                id: Date.now() + 1,
                location: 'At Home',
                exercise: 'Push Ups',
                reps: ['', '', ''],
              },
            ],
          },
        ],
      };
    });
  };

  const regenerateExercise = (exerciseId) => {
    setExerciseForm((prev) => ({
      ...prev,
      exercises: prev.exercises.map((exercise) =>
        exercise.id !== exerciseId
          ? exercise
          : {
              ...exercise,
              name: (() => {
                const match = String(exercise.name || "").match(/\d+/);
                const current = match ? Number(match[0]) : Number(exercise.id) || 1;
                const next = Number.isFinite(current) ? current + 1 : 2;
                return `Exercise ${next}`;
              })(),
              sets: exercise.sets.map((set) => ({
                ...set,
                reps: Array.isArray(set.reps) ? set.reps.map(() => '') : ['', '', ''],
              })),
            }
      ),
    }));
  };

  const addSetRep = (exerciseId, setId) => {
    setExerciseForm((prev) => ({
      ...prev,
      exercises: prev.exercises.map((exercise) =>
        exercise.id !== exerciseId
          ? exercise
          : {
              ...exercise,
              sets: exercise.sets.map((set) => {
                if (set.id !== setId) return set;
                const current = Array.isArray(set.reps) ? set.reps : [];
                if (current.length >= 4) return set;
                return { ...set, reps: [...current, ''] };
              }),
            }
      ),
    }));
  };

  const removeSetRep = (exerciseId, setId) => {
    setExerciseForm((prev) => ({
      ...prev,
      exercises: prev.exercises.map((exercise) =>
        exercise.id !== exerciseId
          ? exercise
          : {
              ...exercise,
              sets: exercise.sets.map((set) => {
                if (set.id !== setId) return set;
                const current = Array.isArray(set.reps) ? set.reps : [];
                if (current.length <= 3) return set;
                return { ...set, reps: current.slice(0, -1) };
              }),
            }
      ),
    }));
  };

const updateExerciseSet = (exerciseId, setId, repIndex, value) => {
  setExerciseForm((prev) => ({
    ...prev,
    exercises: prev.exercises.map((exercise) =>
      exercise.id === exerciseId
        ? {
            ...exercise,
            sets: exercise.sets.map((set) =>
              set.id === setId
                ? {
                    ...set,
                    reps: set.reps.map((rep, idx) =>
                      idx === repIndex ? value : rep
                    ),
                  }
                : set
            ),
          }
        : exercise
    ),
  }));
};

  const toggleDay = (day) => {
    setExerciseForm(prev => ({
      ...prev,
      selectedDays: prev.selectedDays.includes(day)
        ? prev.selectedDays.filter(d => d !== day)
        : [...prev.selectedDays, day]
    }));
  };

  const validateExerciseForm = () => {
    const newErrors = {};
    if (exerciseForm.selectedDays.length === 0) {
      newErrors.days = 'Please select at least one day';
    }
    
    exerciseForm.exercises.forEach(exercise => {
      exercise.sets.forEach(set => {
      if (!Array.isArray(set.reps) || set.reps.some(r => r.trim() === '')) {
  newErrors.sets = 'All rep fields must be filled';
}
      });
    });
    
    return newErrors;
  };

  const handleExerciseComplete = async () => {
    const validationErrors = validateExerciseForm();
    if (Object.keys(validationErrors).length > 0) {
      setExerciseErrors(validationErrors);
      return;
    }

    setApiError('');
    setIsSaving(true);

    const daysPayload = exerciseForm.selectedDays.map((dayNumber) => {
      const aggregatedExercises = {};

      exerciseForm.exercises.forEach((exercise) => {
        exercise.sets.forEach((set) => {
          const key = `${set.exercise}-${set.location}`;
          
          if (!aggregatedExercises[key]) {
            aggregatedExercises[key] = {
              name: set.exercise,
              targetArea: createForm.targetArea,
              location: set.location,
              imageUrls: [],
              equipmentRequirement: 'with_equipment',
              sets: [],
              notes: '',
            };
          }

          const newSets = (Array.isArray(set.reps) ? set.reps : [])
            .map((r) => Number(r))
            .filter((n) => Number.isFinite(n) && n >= 0)
            .map((reps) => ({ reps }));
            
          aggregatedExercises[key].sets.push(...newSets);
        });
      });

      return {
        day: dayNumber,
        exercises: Object.values(aggregatedExercises),
      };
    });

    const payload = {
      name: createForm.name,
      targetArea: createForm.targetArea,
      duration: createForm.duration,
      goalType: createForm.goalType,
      prompt: createForm.prompt,
      coverImageUrl: '',
      days: daysPayload,
    };

    if (editingPlan?._id) {
      payload._id = editingPlan._id;
    }

    await callApi({
      method: Method.POST,
      endPoint: api.workouts,
      bodyParams: payload,
      onSuccess: (response) => {
        void response;
        resetCreateForm();
        setExerciseForm({
          selectedDays: [1],
          exercises: [
            {
              id: 1,
              name: 'Exercise 1',
              image: images.excer,
              sets: [
                { id: 1, location: 'At Gym', exercise: 'Chest Press Machine', reps: ['', '', '']},
                { id: 2, location: 'At Home', exercise: 'Push Ups', reps: ['', '', ''] }
              ]
            },
             {
              id: 2,
              name: 'Exercise 2',
              image: images.excer,
              sets: [
                { id: 3, location: 'At Gym', exercise: 'Chest Press Machine', reps: ['', '', '']},
                { id: 4, location: 'At Home', exercise: 'Push Ups', reps: ['', '', ''] }
              ]
            }
          ]
        });
        setExerciseErrors({});
        setCurrentModal(null);
        setEditingPlan(null);
        setShowDeleteModal(false);
        void loadWorkouts({ silent: true });
      },
      onError: (error) => {
        setApiError(error?.message || 'Failed to save workout. Please try again.');
      },
    });

    setIsSaving(false);

  };

  const handleEdit = (plan) => {
    const normalized = normalizeWorkoutPlan(plan);
    setEditingPlan(normalized);
    setCreateForm({
      name: normalized?.name || '',
      targetArea: normalized?.targetArea || '',
      duration: normalized?.duration || '',
      goalType: normalized?.goalType || '',
      prompt: normalized?.prompt || '',
    });

    let derivedExercises = [];

    // Extract exercises from the first day that has them to populate the form
    // This assumes that the UI represents a uniform plan across selected days
    if (Array.isArray(normalized?.days)) {
      const dayWithExercises = normalized.days.find(d => Array.isArray(d.exercises) && d.exercises.length > 0);
      if (dayWithExercises) {
         derivedExercises = dayWithExercises.exercises.map((ex, index) => ({
            id: Date.now() + index,
            name: `Exercise ${index + 1}`,
            image: images.excer,
            sets: [{
                id: Date.now() + index + 1000,
                location: ex?.location || 'At Gym',
                exercise: ex?.name || '',
                reps: Array.isArray(ex?.sets)
                  ? ex.sets.map((s) => `${s?.reps ?? ''}`)
                  : ['', '', ''],
            }]
         }));
      }
    }

    if (Array.isArray(normalized?.exercises) && normalized.exercises.length > 0) {
      setExerciseForm({
        selectedDays: normalized.selectedDays,
        exercises: normalized.exercises,
      });
    } else {
      setExerciseForm({
        selectedDays: normalized.selectedDays.length > 0 ? normalized.selectedDays : [1],
        exercises: derivedExercises.length > 0 
          ? derivedExercises 
          : [
              {
                id: 1,
                name: 'Exercise 1',
                image: images.excer,
                sets: [
                  {
                    id: 1,
                    location: 'At Gym',
                    exercise: '',
                    reps: ['', '', ''],
                  },
                ],
              },
            ],
      });
    }

    setCurrentModal('edit');
  };

  const handleDelete = (plan) => {
    const key = plan?._id || plan?.id;
    setWorkoutPlans((prev) => prev.filter((p) => (p?._id || p?.id) !== key));
    setCurrentModal(null);
  };
const resetExerciseForm = () => {
  setExerciseForm({
    selectedDays: [1],
     exercises: [
    {
      id: 1,
      name: 'Exercise 1',
      image: images.excer,
      sets: [
        {
          id: 1,
          location: 'At Gym',
          exercise: 'Chest Press Machine',
          reps: ['', '', ''], // <-- multiple reps per set
        },
        {
          id: 2,
          location: 'At Home',
          exercise: 'Push Ups',
          reps: ['', '', ''],
        },
      ],
    },
    // more exercises...
  ], // or your default empty structure
  });
  setExerciseErrors({}); // clear errors if needed
};

  const closeModal = () => {
    setCurrentModal(null);
    setApiError('');
    resetCreateForm();
    setEditingPlan(null);
    setExerciseErrors({});
  };
  const deleteModal = async () => {
    if (!editingPlan) return;

    setApiError('');

    const closeDeleteUi = () => {
      setShowDeleteModal(false);
      setCurrentModal(null);
      resetCreateForm();
      setEditingPlan(null);
      setExerciseErrors({});
    };

    if (!editingPlan._id) {
      handleDelete(editingPlan);
      closeDeleteUi();
      return;
    }

    setIsDeleting(true);
    await callApi({
      method: Method.DELETE,
      endPoint: `${api.workouts}/${editingPlan._id}`,
      onSuccess: () => {
        handleDelete(editingPlan);
        closeDeleteUi();
        void loadWorkouts({ silent: true });
      },
      onError: (error) => {
        setApiError(error?.message || 'Failed to delete workout. Please try again.');
      },
    });
    setIsDeleting(false);
  };
  return (
    <div className="w-full">
      <div className="max-w-6xl mx-auto">

        {/* GLOBAL OVERLAY: show when any popup modal appears (create/exercises/delete) OR delete modal open during edit */}
       {((currentModal !== null && currentModal !== 'edit') || showDeleteModal) && (
  <div className="fixed inset-0 backdrop-blur-sm bg-black/10 z-40" />
)}


        {/* Header */}
        {/* render MAIN content only when not in edit full-page mode */}
        {currentModal !== 'edit' && (
        <>
        <div className="flex flex-col sm:flex-row sm:justify-between justify-center items-center sm:items-center gap-4 mb-8">
          <h2 className="text-xl font-semibold text-gray-800">Workout Plans</h2>
          <button 
            onClick={() => {setCurrentModal('create');
              setShowDeleteModal(false);
            }} 
            className="bg-teal-700 text-white px-6 py-2 rounded-lg hover:bg-teal-800 transition"
          >
            Create Workout
          </button>
        </div>

        {/* Workout Plans Grid */}
        {isLoadingWorkouts ? (
          <div className="flex flex-col items-center justify-center mt-20">
            <p className="text-gray-600 text-center text-sm font-medium">Loading workouts...</p>
          </div>
        ) : workoutPlans.length === 0 ? (
          <div className="flex flex-col items-center justify-center mt-20">
            <div className="w-32 h-32 mb-4 rounded-lg flex items-center justify-center">
                <img
           src={images.empty}
           alt="No Data"
           className="w-32 h-32 mb-4 opacity-60"
         />
            </div>
            <p className="text-gray-600 text-center text-sm font-medium">
              There is no data here
            </p>
          </div>
        ) : (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  {workoutPlans.map(plan => (
    <div 
      key={plan._id || plan.id} 
      className="bg-white rounded-lg overflow-hidden shadow-md cursor-pointer hover:shadow-lg transition"
      onClick={() => handleEdit(plan)}
    >
      {/* Image Section */}
      <div className="h-32 bg-gray-200 relative overflow-hidden">
        <img 
          src={plan.coverImageUrl || images.chest} 
          alt="Workout Plan"
          className="w-full h-full object-cover object-fill"
        />

        {/* Bottom Overlay Content */}
        <div className="absolute bottom-0 left-0 right-0 bg-trasparent bg-opacity-40 text-white px-4 py-2 flex justify-between items-center">
          <div className="text-sm font-medium">{plan.name}</div>
          <div className="text-sm">{(plan.selectedDays?.length || plan.days?.length || 0)} Days</div>
        </div>
      </div>
    </div>
  ))}
</div>

        )}
        </>
        )}

        {/* Create Workout Modal */}
        {currentModal === 'create' && (
          <div className="fixed inset-0 backdrop-blur-sm bg-black/10 flex justify-center items-center z-50">
            <div className="bg-white rounded-[32px] shadow-xl w-[450px] h-[570px] p-6 relative overflow-hidden">
              <button
                onClick={closeModal}
                className="absolute right-4 top-4 text-gray-500 text-xl hover:text-gray-700"
              >
                <X size={24} />
              </button>

              <h2 className="text-xl font-semibold mb-4">Create Workout Plan</h2>

              {/* Plan Name */}
              <label className={`block mt-2 mb-1 text-sm ${createErrors.name ? 'text-red-500' : ''}`}>
                Plan Name
              </label>
              <input
                type="text"
                placeholder="Name Here"
                value={createForm.name}
                onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                className={`w-full border rounded-md p-2 mb-1 focus:outline-none focus:border-teal-700 ${
                  createErrors.name ? 'border-red-500' : 'border-gray-300'
                }`}
              />

              {/* Target Area */}
              <label className={`block mt-2 mb-1 text-sm ${createErrors.targetArea ? 'text-red-500' : 'text-black-500'}`}>
                Target Area
              </label>
              <select
                value={createForm.targetArea}
                onChange={(e) => setCreateForm({ ...createForm, targetArea: e.target.value })}
                className={`w-full border rounded-md p-2 mb-1 focus:outline-none focus:border-teal-700 ${
                  createErrors.targetArea ? 'border-red-500' : 'border-gray-300'
                }`}
              >
                <option value="">Select</option>
                <option value="Chest">Chest</option>
                <option value="Body">Body</option>
                <option value="Cardio">Cardio</option>
              </select>

              {/* Duration */}
              <label className={`block mt-2 mb-1 text-sm ${createErrors.duration ? 'text-red-500' : 'text-black-500'}`}>
                Duration
              </label>
              <input
                type="text"
                placeholder="20 min"
                value={createForm.duration}
                onChange={(e) => setCreateForm({ ...createForm, duration: e.target.value })}
                className={`w-full border rounded-md p-2 mb-1 focus:outline-none focus:border-teal-700 ${
                  createErrors.duration ? 'border-red-500' : 'border-gray-300'
                }`}
              />

              {/* Goal Type */}
              <label className={`block mt-2 mb-1 text-sm ${createErrors.goalType ? 'text-red-500' : 'text-black-500'}`}>
                Goal Type
              </label>
              <select
                value={createForm.goalType}
                onChange={(e) => setCreateForm({ ...createForm, goalType: e.target.value })}
                className={`w-full border rounded-md p-2 mb-1 focus:outline-none focus:border-teal-700 ${
                  createErrors.goalType ? 'border-red-500' : 'border-gray-300'
                }`}
              >
                <option value="">Select</option>
                <option value="Weight Loss">Weight Loss</option>
                <option value="Muscle Gain">Muscle Gain</option>
                <option value="Endurance">Endurance</option>
              </select>

              {/* Prompt */}
              <label className={`block mt-2 mb-1 text-sm ${createErrors.prompt ? 'text-red-500' : ''}`}>
                Add Prompt
              </label>
              <textarea
                placeholder="Prompt"
                value={createForm.prompt}
                onChange={(e) => setCreateForm({ ...createForm, prompt: e.target.value })}
                className={`w-full border rounded-md p-2 h-24 mb-4 focus:outline-none focus:border-teal-700 ${
                  createErrors.prompt ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {apiError ? (
                <div className="text-red-500 text-sm mb-3">{apiError}</div>
              ) : null}

              {/* Buttons */}
              <div className="flex justify-between">
                <button
                  onClick={closeModal}
                  className="px-4 py-2 rounded-md  hover:bg-gray-50"
                >
                  
                </button>
                <button
                  onClick={handleCreateSubmit}
                  className="bg-teal-700 text-white px-8 py-2 rounded-lg hover:bg-teal-800"
                >
                  Create Plan With AI
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Exercises Modal (used for creating a new plan) */}
        {currentModal === 'exercises' && (
          <div className="fixed inset-0 backdrop-blur-sm bg-black/10 flex justify-center items-center z-50 overflow-hidden">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-6xl p-6 relative max-h-[85vh] overflow-hidden flex flex-col">
              <button
                onClick={closeModal}
                className="absolute right-4 top-4 text-gray-500 text-xl hover:text-gray-700 z-10"
              >
                <X size={24} />
              </button>

              <h2 className="text-xl font-semibold mb-6">Exercises</h2>

              <div className="flex flex-1 overflow-hidden">
                {/* Days Selection */}
                <div className="w-32 mr-6">
                  {[1, 2, 3, 4, 5, 6, 7].map(day => (
                    <div key={day} className="mb-4">
                      <label className="flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={exerciseForm.selectedDays.includes(day)}
                          onChange={() => toggleDay(day)}
                          className="sr-only"
                        />
                        <div className={`w-6 h-6 rounded border-2 flex items-center justify-center mr-3 ${
                          exerciseForm.selectedDays.includes(day)
                            ? 'bg-teal-700 border-teal-700'
                            : exerciseErrors.days ? 'border-red-500' : 'border-gray-300'
                        }`}>
                          {exerciseForm.selectedDays.includes(day) && (
                            <Check size={16} className="text-white" />
                          )}
                        </div>
                        <span className="text-sm">Day {day}</span>
                      </label>
                    </div>
                  ))}
                </div>

                {/* Exercises */}
                <div className="flex-1 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">

                  {exerciseForm.exercises.map((exercise) => (
                    <div key={exercise.id} className="mb-10">
                      <h3 className="text-sm font-semibold text-gray-800 mb-3">{exercise.name}</h3>

                      <div className="flex items-center gap-4 mb-4">
                        <div className="flex items-center gap-2">
                          {[1, 2, 3].map((i) => (
                            <img
                              key={i}
                              src={exercise.image}
                              alt=""
                              className="w-10 h-10 rounded object-cover border border-gray-200"
                            />
                          ))}
                        </div>

                        <button
                          type="button"
                          onClick={addExercise}
                          className="text-teal-700 text-sm flex items-center gap-2 hover:text-teal-800"
                        >
                          <RotateCcw size={16} />
                          Regenerate
                        </button>
                      </div>

                      {['At Gym', 'At Home'].map((location) => {
                        const set = exercise.sets.find((s) => s.location === location);
                        if (!set) return null;
                        const reps = Array.isArray(set.reps) ? set.reps : ['', '', ''];

                        return (
                          <div key={`${exercise.id}-${location}`} className="flex items-center gap-6 mb-3">
                            <div className="flex items-center gap-6 min-w-[260px]">
                              <span className="text-teal-700 font-semibold text-sm w-[64px]">
                                {location}
                              </span>
                              <span className="text-gray-800 text-sm">{set.exercise}</span>
                            </div>

                            <div className="flex items-center gap-4">
                              {reps.map((repValue, repIndex) => (
                                <div key={`${set.id}-${repIndex}`} className="flex items-center gap-2">
                                  <span className="text-sm text-gray-700">Set {repIndex + 1}</span>
                                  <input
                                    type="number"
                                    min="0"
                                    placeholder="Rep here"
                                    value={repValue}
                                    onChange={(e) =>
                                      updateExerciseSet(exercise.id, set.id, repIndex, e.target.value)
                                    }
                                    className={`border rounded-md px-3 py-1 w-24 text-sm focus:outline-none focus:border-teal-700 ${
                                      exerciseErrors.sets ? 'border-red-500' : 'border-gray-300'
                                    }`}
                                  />
                                </div>
                              ))}

                              {reps.length < 4 ? (
                                <button
                                  type="button"
                                  onClick={() => addSetRep(exercise.id, set.id)}
                                  className="w-6 h-6 rounded-full bg-teal-700 text-white hover:bg-teal-800 flex items-center justify-center"
                                  aria-label="Add set"
                                >
                                  <Plus size={14} />
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => removeSetRep(exercise.id, set.id)}
                                  className="w-6 h-6 rounded-full bg-red-600 text-white hover:bg-red-700 flex items-center justify-center"
                                  aria-label="Remove set"
                                >
                                  <Minus size={14} />
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ))}

                  {/* <button
                    type="button"
                    onClick={addExercise}
                    className="mt-4 flex items-center text-teal-700 font-semibold text-sm hover:text-teal-800"
                  >
                    <Plus size={16} className="mr-1" />
                    Add Exercise
                  </button> */}
                </div>
              </div>


              <div className="flex justify-end pt-6">
                <button
                  onClick={handleExerciseComplete}
                  className={`bg-teal-700 text-white px-10 py-3 rounded-md hover:bg-teal-800 w-80 text-sm font-semibold ${isSaving ? 'opacity-70 pointer-events-none' : ''}`}
                >
                  COMPLETE
                </button>
              </div>
              {apiError ? (
                <div className="text-red-500 text-sm mt-3">{apiError}</div>
              ) : null}
            </div>
          </div>
        )}

        {/* EDIT FULL PAGE (not modal) */}
        {currentModal === 'edit' && editingPlan && (
          <div className="w-full max-w-5xl mx-auto mt-6 bg-gray-100 p-8 rounded-2xl z-10 overflow-hidden">
            <h2 className="text-2xl font-semibold mb-6">Exercises</h2>

            <div className="flex gap-6">
              {/* Days Selection */}
              <div className="w-32">
                {[1, 2, 3, 4, 5, 6, 7].map((day) => (
                  <div key={day} className="mb-4">
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={exerciseForm.selectedDays.includes(day)}
                        onChange={() => toggleDay(day)}
                        className="sr-only"
                      />
                      <div
                        className={`w-6 h-6 rounded border-2 flex items-center justify-center mr-3 ${
                          exerciseForm.selectedDays.includes(day)
                            ? "bg-teal-700 border-teal-700"
                            : exerciseErrors.days
                            ? "border-red-500"
                            : "border-gray-300"
                        }`}
                      >
                        {exerciseForm.selectedDays.includes(day) && (
                          <Check size={16} className="text-white" />
                        )}
                      </div>
                      <span className="text-sm">Day {day}</span>
                    </label>
                  </div>
                ))}
              </div>

              {/* Exercises */}
              <div className="flex-1 bg-gray-100 p-4 rounded-lg">
                {exerciseForm.exercises.map((exercise) => (
                  <div key={exercise.id} className="mb-6">
                    <h3 className="font-semibold mb-4">{exercise.name}</h3>

                    <div className="flex items-center flex-row gap-1 mb-2">
                      <img src={exercise.image} alt={exercise.name} className="w-10 h-10 mr-3 rounded" />
                      <img src={exercise.image} alt={exercise.name} className="w-10 h-10 mr-3 rounded" />
                      <img src={exercise.image} alt={exercise.name} className="w-10 h-10 mr-3 rounded" />
                    </div>

                    {exercise.sets.map((set, index) => (
                      <div key={set.id} className="flex flex-wrap items-center mb-3 text-sm">
                        <span
                          className={`px-2 py-1 rounded text-xs mr-3 ${
                            set.location === 'At Gym' ? 'bg-teal-100 text-teal-700' : 'bg-blue-100 text-blue-700'
                          }`}
                        >
                          {set.location}
                        </span>

                        <span className="w-32 mr-2">{set.exercise}</span>
                        <span className="mr-2">Set {index + 1}</span>

                        <div className="flex flex-wrap gap-2 items-center">
                        {Array.isArray(set.reps) &&
                          set.reps.map((repValue, repIndex) => (
                            <input
                              key={repIndex}
                              type="number"
                              min="0"
                              placeholder={`Rep ${repIndex + 1}`}
                              value={repValue}
                              onChange={(e) =>
                                updateExerciseSet(exercise.id, set.id, repIndex, e.target.value)
                              }
                              className={`border rounded px-2 py-1  w-20 ${
                                exerciseErrors.sets ? 'border-red-500' : 'border-gray-300'
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>

            {/* Footer Buttons for Edit Full Page */}
            <div className="flex justify-center gap-4 mt-6">
              <button
                onClick={() => setShowDeleteModal(true)}
                className="border-2 border-teal-700 text-teal-700 px-[70px] py-2 rounded-lg hover:bg-gray-50 flex items-center gap-2"
              >
                
                Delete
              </button>
              <button
                onClick={handleExerciseComplete}
                className={`bg-teal-700 text-white px-[90px] py-2 rounded-lg hover:bg-teal-800 flex items-center gap-2 ${isSaving ? 'opacity-70 pointer-events-none' : ''}`}
              >
               Edit
              </button>
            </div>
            {apiError ? (
              <div className="text-red-500 text-sm mt-4 text-center">{apiError}</div>
            ) : null}

            {/* Delete Confirmation Modal for Edit Page (keeps modal behavior) */}
            {showDeleteModal && (
              <div className="fixed inset-0 backdrop-blur-sm bg-black/10 flex items-center justify-center p-4 z-50"
                onClick={() => setShowDeleteModal(false)}
              >
                <div className="bg-white rounded-lg p-6 w-full max-w-sm text-center shadow-lg overflow-hidden"
                  onClick={(e) => e.stopPropagation()}>
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Trash2 className="w-8 h-8 text-gray-600" />
                  </div>
                  
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">
                    Are You Sure You Want To Delete This
                  </h3>
                  
                  <div className="flex gap-3 mt-6">
                    <button
                      onClick={() => setShowDeleteModal(false)}
                      className="flex-1 border border-teal-600 text-teal-600 px-4 py-2 rounded-lg hover:bg-teal-50 transition"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={deleteModal}
                      className={`flex-1 bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700 transition ${isDeleting ? 'opacity-70 pointer-events-none' : ''}`}
                    >
                     Delete
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Fallback: if showDeleteModal triggered outside edit, show small modal */}
        {showDeleteModal && currentModal !== 'edit' && (
          <div className="fixed inset-0 flex items-center justify-center backdrop-blur-sm bg-black/10 z-50">
            <div className="bg-white p-6 rounded-2xl shadow-lg w-full max-w-sm text-center">
              <h3 className="text-lg font-semibold mb-4">Are you sure you want to delete this plan?</h3>
              <div className="flex justify-center gap-4">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="px-4 py-2 rounded-md border border-gray-300 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={deleteModal}
                  className={`bg-red-500 text-white px-4 py-2 rounded-md hover:bg-red-600 ${isDeleting ? 'opacity-70 pointer-events-none' : ''}`}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
       
      </div>
    </div>
  );
};

export default CreateWorkout;
