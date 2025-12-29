import { useState } from 'react';
import { WorkoutDetailsModal } from './WorkoutDetailsModal';

// First Modal Component (Your existing modal with modifications)
export function WorkoutPlanModal({ showModal: externalShowModal, setShowModal: externalSetShowModal, onCreateSuccess }) {
  const isControlled = typeof externalShowModal === 'boolean' && typeof externalSetShowModal === 'function';
  const [internalShowModal, setInternalShowModal] = useState(false);
  const showModal = isControlled ? externalShowModal : internalShowModal;
  const setShowModal = isControlled ? externalSetShowModal : setInternalShowModal;

  const [form, setForm] = useState({
    name: '',
    targetArea: '',
    duration: '',
    goalType: '',
    prompt: '',
  });
  const [errors, setErrors] = useState({});
  const [showSecondModal, setShowSecondModal] = useState(false);

  const validate = () => {
    const newErrors = {};
    if (!form.name.trim()) newErrors.name = 'Plan name is required';
    if (form.targetArea.length < 3) newErrors.targetArea = 'please select Target areas';
    if (!form.duration.trim()) newErrors.duration = 'Duration is required';
    if (!form.goalType.trim()) newErrors.goalType = 'Goal type is required';
    if (!form.prompt.trim()) newErrors.prompt = 'Prompt is required';
    return newErrors;
  };

  const handleSubmit = () => {
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    // Open second modal instead of alert
    setShowModal(false);
    setShowSecondModal(true);
  };

  const resetForm = () => {
    setForm({ name: '', targetArea: '', duration: '', goalType: '', prompt: '' });
    setErrors({});
  };

  const closeModal = () => {
    setShowModal(false);
    resetForm();
  };

  return (
    <>
      <div className="p-6">
        {!isControlled && (
          <button
            className="bg-teal-700 text-white px-6 py-2 rounded-md"
            onClick={() => setShowModal(true)}
          >
            Create Workout Plan
          </button>
        )}

        {showModal && (
          <div className="fixed inset-0 backdrop-blur-sm bg-black/10 flex justify-center items-center z-50">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 relative">
              <button
                onClick={closeModal}
                className="absolute right-4 top-4 text-gray-500 text-xl hover:text-gray-700"
              >
                &times;
              </button>

              <h2 className="text-xl font-semibold mb-4">Create Workout Plan</h2>

              {/* Plan Name */}
              <label className={`block mt-2 mb-1 text-sm ${errors.name ? 'text-red-500' : ''}`}>Plan Name</label>
              <input
                type="text"
                placeholder="Name Here"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className={`w-full border rounded-md p-2 mb-1 focus:outline-none focus:border-teal-700 ${
                  errors.name ? 'border-red-500' : 'border-gray-300'
                }`}
              />

              {/* Target Area */}
              <label className={`block mt-2 mb-1 text-sm ${errors.targetArea ? 'text-red-500' : 'text-black-500'}`}>Target Area</label>
              <select
                value={form.targetArea}
                onChange={(e) => setForm({ ...form, targetArea: e.target.value })}
                className={`w-full border rounded-md p-2 mb-1 focus:outline-none focus:border-teal-700 ${
                  errors.targetArea ? 'border-red-500' : 'border-gray-300'
                }`}
              >
                <option value="">Select</option>
                <option value="Chest">Chest</option>
                <option value="Body">Body</option>
                <option value="Cardio">Cardio</option>
              </select>

              {/* Duration */}
              <label className={`block mt-2 mb-1 text-sm ${errors.duration ? 'text-red-500' : 'text-black-500'}`}>Duration</label>
              <input
                type="text"
                placeholder="20 min"
                value={form.duration}
                onChange={(e) => setForm({ ...form, duration: e.target.value })}
                className={`w-full border rounded-md p-2 mb-1 focus:outline-none focus:border-teal-700 ${
                  errors.duration ? 'border-red-500' : 'border-gray-300'
                }`}
              />

              {/* Goal Type */}
              <label className={`block mt-2 mb-1 text-sm ${errors.goalType ? 'text-red-500' : 'text-black-500'}`}>Goal Type</label>
              <select
                value={form.goalType}
                onChange={(e) => setForm({ ...form, goalType: e.target.value })}
                className={`w-full border rounded-md p-2 mb-1 focus:outline-none focus:border-teal-700 ${
                  errors.goalType ? 'border-red-500' : 'border-gray-300'
                }`}
              >
                <option value="">Select</option>
                <option value="Weight Loss">Weight Loss</option>
                <option value="Muscle Gain">Muscle Gain</option>
                <option value="Endurance">Endurance</option>
              </select>

              {/* Prompt */}
              <label className={`block mt-2 mb-1 text-sm ${errors.prompt ? 'text-red-500' : ''}`}>Add Prompt</label>
              <textarea
                placeholder="Prompt"
                value={form.prompt}
                onChange={(e) => setForm({ ...form, prompt: e.target.value })}
                className={`w-full border rounded-md p-2 h-24 mb-4 focus:outline-none focus:border-teal-700 ${
                  errors.prompt ? 'border-red-500' : 'border-gray-300'
                }`}
              />

              {/* Buttons */}
              <div className="flex justify-between">
                <button
                  onClick={closeModal}
                  className="px-4 py-2 rounded-md border border-gray-300 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  className="bg-teal-700 text-white px-6 py-2 rounded-md hover:bg-teal-800"
                >
                  Create Plan With AI
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Second Modal */}
      <WorkoutDetailsModal 
        showModal={showSecondModal} 
        setShowModal={setShowSecondModal}
        workoutData={form}
        onComplete={() => {
          setShowSecondModal(false);
          closeModal();
          onCreateSuccess?.();
        }}
      />
    </>
  );
}

// Second Modal Component

