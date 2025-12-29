import React, { useState } from 'react';
import { ChevronRight } from 'lucide-react';
import EditProfile from '../../components/EditProfile';
import ChangePassword from '../../components/ChangePassword';
import TermsConditions from '../../components/TermCondition';
import PrivacyPolicy from '../../components/PrivacyPolicy';

const MyProfile = () => {
  const [selectedSection, setSelectedSection] = useState('editProfile');

  const renderContent = () => {
    switch (selectedSection) {
      case 'editProfile':
        return <EditProfile />;
      case 'changePassword':
        return <ChangePassword />;
      case 'terms':
        return <TermsConditions />;
      case 'privacy':
        return <PrivacyPolicy />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen  flex flex-col md:flex-row  gap-4">
      <div className="w-full md:w-1/3 lg:w-1/4 space-y-4">
        <MenuItem label="Edit Profile" active={selectedSection === 'editProfile'} onClick={() => setSelectedSection('editProfile')} />
        <MenuItem label="Change Password" active={selectedSection === 'changePassword'} onClick={() => setSelectedSection('changePassword')} />
        <ToggleItem label="App Notifications" />
        <MenuItem label="Terms & Condition" active={selectedSection === 'terms'} onClick={() => setSelectedSection('terms')} />
        <MenuItem label="Privacy Policy" active={selectedSection === 'privacy'} onClick={() => setSelectedSection('privacy')} />
      </div>
      <div className="w-full md:flex-1  bg-white rounded-xl shadow-md p-4 self-start">
        {renderContent()}
      </div>
    </div>
  );
};

const MenuItem = ({ label, onClick, active }) => (
  <div
    onClick={onClick}
    className={`cursor-pointer p-4 rounded-xl shadow-sm border flex justify-between items-center ${active ? 'border-teal-700' : 'border-white'} bg-white hover:bg-gray-100 transition`}
  >
    <div>
      <div className="font-semibold text-black">{label}</div>
      <div className="text-sm text-gray-500">Details about {label.toLowerCase()}</div>
    </div>
    <ChevronRight className="w-4 h-4 text-gray-500" />
  </div>
);

const ToggleItem = ({ label }) => {
  const [enabled, setEnabled] = useState(true);
  return (
    <div className="flex items-center justify-between p-4 rounded-xl shadow-sm border border-white bg-white">
      <div>
        <div className="font-semibold text-black">{label}</div>
      </div>
      <button
        onClick={() => setEnabled(!enabled)}
        className={`w-12 h-6 rounded-full p-1 transition ${enabled ? 'bg-teal-600' : 'bg-gray-300'}`}
      >
        <div className={`w-4 h-4 rounded-full bg-white transition transform ${enabled ? 'translate-x-6' : ''}`}></div>
      </button>
    </div>
  );
};
export default MyProfile;
