import { useState } from 'react';
import { Formik, Form } from 'formik';
import * as Yup from 'yup';

import AuthLayout from '../../layout/AuthLayout';
import PrimaryButton from '../../components/PrimaryButton';
import CustomInput from '../../components/CustomInput';
import { useLocation, useNavigate } from 'react-router-dom';
import { Method, callApi, emitToast } from '../../network/NetworkManager';
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
  const [apiError, setApiError] = useState('');
  const navigate = useNavigate();
  const location = useLocation();
  const email = location?.state?.email;
  return (
    <AuthLayout
      title="Update Password"
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
            emitToast('Email is missing. Please restart the reset flow.', 'error');
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
            onError: () => { },
          });

          setSubmitting(false);
        }}
      >
        {({ isSubmitting }) => (
          <Form className="space-y-3">
            <CustomInput name="password" type="password" placeholder="New password" withToggle />
            <CustomInput name="confirmPassword" type="password" placeholder="Confirm new password" withToggle />


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
