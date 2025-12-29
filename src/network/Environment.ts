export const BASE_URL = 'https://mindcare.txdynamics.io/api/v1/';
export const SOCKETS_URL = BASE_URL.replace('https://', 'wss://').replace('/api/v1/', '');
export const api = {
  signIn: 'auth/signin',
  refreshToken: 'auth/refresh-token',
  logout: 'auth/logout',
  instructorProfileMe: 'instructor/profile/me',
  instructorProfile: 'instructor/profile',
  instructorChangePassword: 'instructor/change-password',
  instructorExpertiseOptions: 'instructor/expertise/options',
  termsAndConditions: 'terms-and-conditions',
  privacyPolicy: 'privacy-policy',
  forgotPassword: 'auth/forgot-password',
  verifyOtpForgotPassword: 'auth/verify-otp-forgot-password',
  resetPassword: 'auth/reset-password',
  workouts: 'workouts',
  s3Upload: 's3/upload',
  s3List: 's3/list',
  attendanceSummary: 'attendance/summary',
  attendanceMeHistory: 'attendance/me/history',
  mindfulnessVideos: 'mindfulness-videos',
  feedback: 'feedback',
};
