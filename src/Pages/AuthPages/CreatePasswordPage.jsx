import { useState } from 'react';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';

import { Eye, EyeOff } from 'lucide-react'; 
import AuthLayout from '../../layout/AuthLayout';
import PrimaryButton from '../../components/PrimaryButton';
import { useLocation, useNavigate } from 'react-router-dom';
import { Method, callApi } from '../../network/NetworkManager';
import { api } from '../../network/Environment';

const CreatePasswordSchema = Yup.object().shape({
  password: Yup.string()
    .required('Password is required')
    .min(8, 'Min 8 chars with upper, lower, number & symbol')
    .matches(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#\$%\^&\*]).{8,}$/,
      'Min 8 chars with upper, lower, number & symbol'
    ),
  confirmPassword: Yup.string()
    .oneOf([Yup.ref('password')], 'Passwords must match')
    .required('Confirm your password'),
});


const CreatePasswordPage = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [apiError, setApiError] = useState('');
  const navigate = useNavigate();
  const location = useLocation();
  const email = location?.state?.email;
  return (
    <AuthLayout
      title="Create Password"
      leftTitle="Create a new password"
      leftDescription="Choose a strong password to keep your account secure."
    >
      <p className="text-center text-gray-500 mb-6">
        Your new password must be at least 8 characters and include a number and symbol.
      </p>
      <Formik
        initialValues={{ password: '', confirmPassword: '' }}
        validationSchema={CreatePasswordSchema}
        onSubmit={async (values, { setSubmitting }) => {
          setApiError('');

          if (!email) {
            setApiError('Email is missing. Please restart the reset flow.');
            setSubmitting(false);
            return;
          }

          await callApi({
            method: Method.POST,
            endPoint: api.resetPassword,
            bodyParams: {
              email,
              newPassword: values.password,
            },
            onSuccess: () => {
              navigate('/');
            },
            onError: () => {},
          });

          setSubmitting(false);
        }}
      >
        {({ isSubmitting }) => (
          <Form className="space-y-4">
            {/* Password Field */}
            <div>
            <div className="relative">
              <Field
                name="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="New password"
                className="w-full px-4 py-3 border border-[#A1B0CC] rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 pr-10"
              />
              <div
                className="absolute inset-y-0 right-3 flex items-center cursor-pointer  text-[#8E8E93]"
                onClick={() => setShowPassword(!showPassword)}
              >
                {!showPassword ? <Eye size={18} /> : <EyeOff size={18} />}
              </div>
              </div>
              <ErrorMessage name="password" component="div" className="text-red-500 text-sm mt-1" />
            </div>

            {/* Confirm Password Field */}
            <div>

            <div className="relative">
              <Field
                name="confirmPassword"
                type={showConfirm ? 'text' : 'password'}
                placeholder="Confirm new password"
                               className="w-full px-4 py-3 border border-[#A1B0CC] rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 pr-10"

              />
              <div
                  className="absolute inset-y-0 right-3 flex items-center cursor-pointer text-[#8E8E93]"
                onClick={() => setShowConfirm(!showConfirm)}
              >
                {!showConfirm ? <Eye size={18} /> : <EyeOff size={18} />}
              </div>
              </div>
              <ErrorMessage name="confirmPassword" component="div" className="text-red-500 text-sm mt-1" />
            </div>

            {apiError ? (
              <div className="text-red-500 text-sm">{apiError}</div>
            ) : null}
            <PrimaryButton type="submit" className={isSubmitting ? 'opacity-70 pointer-events-none' : ''}>
              RESET PASSWORD
            </PrimaryButton>
          </Form>
        )}
      </Formik>
    </AuthLayout>
  );
};

export default CreatePasswordPage;
