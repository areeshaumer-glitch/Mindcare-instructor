import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import AuthLayout from '../../layout/AuthLayout';
import PrimaryButton from '../../components/PrimaryButton';
import images from '../../assets/Images';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const ProfileCreationSchema = Yup.object().shape({
  name: Yup.string().required('Name is required'),
});

const ProfileCreation = () => {
  const [image, setImage] = useState(null);
  const navigate = useNavigate();

  const handleImageChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      const imageUrl = URL.createObjectURL(file);
      setImage(imageUrl);
    }
  };

  useEffect(() => {
    return () => {
      if (image) URL.revokeObjectURL(image);
    };
  }, [image]);

  return (
    <AuthLayout
      title="Complete Your Profile"
      leftTitle="Set up your instructor profile"
      leftDescription="Add a profile photo and name to continue."
    >
      <p className="text-center text-gray-500 mb-6">
        Add your profile photo and full name so trainees can recognize you.
      </p>
      <Formik
        initialValues={{ name: '' }}
        validationSchema={ProfileCreationSchema}
        onSubmit={() => {
          navigate('/home/dashboard');
        }}
      >
        {() => (
          <Form className="space-y-4">
            <div className="flex justify-center items-center mb-6">
              <label htmlFor="imageUpload" className="cursor-pointer">
                <img
                  src={image || images.defaultAvatar}
                  alt="Upload"
                  className={`w-[120px] h-[120px] rounded-full ${
                    image ? 'border-2 border-teal-700 object-fill' : 'object-contain'
                  }`}
                />
                <input
                  type="file"
                  id="imageUpload"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                />
              </label>
            </div>

            <div>
              <Field
                name="name"
                type="text"
                placeholder="Full name"
                className="w-full px-4 py-3 border border-[#A1B0CC] rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
              <ErrorMessage name="name" component="div" className="text-red-500 text-sm mt-1" />
            </div>

            <div className="flex justify-end items-center mt-12">
              <PrimaryButton type="submit">CONTINUE</PrimaryButton>
            </div>
          </Form>
        )}
      </Formik>
    </AuthLayout>
  );
};

export default ProfileCreation;
