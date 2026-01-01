
import AuthLayout from '../../layout/AuthLayout';
import PrimaryButton from '../../components/PrimaryButton';
import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Method, callApi, emitToast } from '../../network/NetworkManager';
import { api } from '../../network/Environment';



const OTPPage = () => {
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const location = useLocation();
  const email = location?.state?.email;
  const otpCooldown = location?.state?.otpCooldown;
  const flow = location?.state?.flow;
  const [seconds, setSeconds] = useState(
    typeof otpCooldown === 'number' ? otpCooldown : 60
  );
  const otpHelpText = email
    ? `Enter the 6-digit code sent to ${email}.`
    : 'Enter the 6-digit code sent to your email.';
  const [apiError, setApiError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();
  useEffect(() => {

    if (seconds > 0) {
      const timer = setTimeout(() => {
        setSeconds(seconds - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [seconds]);
  //   useFocusEffect(
  //   useCallback(() => {
  //     setOtp(""); // Clea return () => {}; // No cleanup needed
  //   setSeconds(60); 
  //   }, [])
  //);
  const formatTime = (sec) => {
    const minutes = Math.floor(sec / 60);
    const seconds = sec % 60;
    return `${minutes < 10 ? `0${minutes}` : minutes}:${seconds < 10 ? `0${seconds}` : seconds
      }`;
  };
  const handleChange = (value, index) => {
    if (!/^\d?$/.test(value)) return
    const updated = [...otp]
    updated[index] = value
    setOtp(updated)
    if (value && index < 5) {
      const nextInput = document.getElementById(`otp-${index + 1}`)
      nextInput?.focus()
    }
  }
  const handleKeyDown = (e, index) => {
    if (e.key === 'Backspace') {
      e.preventDefault()
      const updated = [...otp]
      if (updated[index]) {
        updated[index] = ''
        setOtp(updated)
        return
      }
      if (index > 0) {
        updated[index - 1] = ''
        setOtp(updated)
        const prevInput = document.getElementById(`otp-${index - 1}`)
        prevInput?.focus()
      }
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault()
      const prevInput = document.getElementById(`otp-${Math.max(index - 1, 0)}`)
      prevInput?.focus()
    } else if (e.key === 'ArrowRight') {
      e.preventDefault()
      const nextInput = document.getElementById(`otp-${Math.min(index + 1, otp.length - 1)}`)
      nextInput?.focus()
    }
  }

  const handleVerify = async () => {
    setApiError('');
    const otpValue = otp.join('');

    if (!email) {
      emitToast('Email is missing. Please restart the reset flow.', 'error');
      return;
    }

    if (otpValue.length !== 6) {
      emitToast('Please enter the 6-digit OTP.', 'error');
      return;
    }

    setIsSubmitting(true);
    await callApi({
      method: Method.POST,
      endPoint: api.verifyOtpForgotPassword,
      bodyParams: { email, otp: otpValue },
      onSuccess: () => {
        navigate('/create-password', { state: { email, flow } });
      },
      onError: () => { },
    });
    setIsSubmitting(false);
  };

  return (
    <AuthLayout
      title="Verify Code"
      leftTitle="Verify your email"
      leftDescription="Enter the code to continue and secure your account."
    >
      <p className="text-center text-gray-500 mb-6">
        {otpHelpText}
      </p>
      <div className="flex justify-center gap-2 md:gap-3 mb-3 flex-wrap max-w-[200px] md:max-w-full mx-auto md:flex-nowrap">
        {otp.map((digit, index) => (
          <input
            key={index}
            id={`otp-${index}`}
            type="text"
            maxLength={1}
            value={digit}
            onChange={(e) => handleChange(e.target.value, index)}
            onKeyDown={(e) => handleKeyDown(e, index)}
            className="mb-2 w-10 h-10 text-center text-xl font-medium border border-[#A1B0CC] rounded-[12px] focus:outline-none focus:ring-2 focus:ring-blue-500 md:w-14 md:h-14 md:text-2xl md:rounded-[15px]"
          />
        ))}
      </div>

      <div className=" mb-6 mt-6">
        <p className="text-center text-lg text-teal-700 mb-2 mt=12">
          {formatTime(seconds)}
        </p>
        <button
          onClick={() => setSeconds(60)}
          disabled={seconds > 0}
          className={`
     w-full flex justify-center mb-6
    ${seconds > 0 ? 'text-gray-400 font-normal cursor-not-allowed' : 'text-black font-semibold'}
  `}
        >
          <p className="text-center text-sm ">
            Send Again
          </p>
        </button>
      </div>
      <PrimaryButton onClick={handleVerify} className={isSubmitting ? 'opacity-70 pointer-events-none' : ''}>
        VERIFY
      </PrimaryButton>

    </AuthLayout>
  );
};

export default OTPPage;
















