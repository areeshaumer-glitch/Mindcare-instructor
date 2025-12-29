import { useNavigate } from "react-router-dom";

const Modal = ({ isOpen, onClose }) => {
  const navigate = useNavigate();

  if (!isOpen) return null;

  const handleVolunteer = () => {
    navigate("/yellow-ribbon");
    onClose();
  };

  const handleWorkForUs = () => {
    navigate("/work-for-us");
    onClose();
  };

  return (
    <div className="fixed inset-0 backdrop-blur-sm bg-black/10 flex items-center justify-center z-50">
      <div className="bg-white p-8 rounded-lg shadow-xl w-96">
        <h2 className="text-2xl font-semibold text-center mb-4">
          Join Organization
        </h2>
        <p className="text-gray-700 mb-6 text-center">
          Would you like to join us as a volunteer or work for us?
        </p>
        <div className="flex justify-around">
          <button
            onClick={handleVolunteer}
            className="bg-secondary text-white py-2 px-4 rounded-lg"
          >
            Volunteer
          </button>
          <button
            onClick={handleWorkForUs}
            className="bg-info text-white py-2 px-4 rounded-lg"
          >
            Work For Us
          </button>
        </div>
        <div className="mt-4 text-center">
          <button onClick={onClose} className="text-gray-500 underline">
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default Modal;
