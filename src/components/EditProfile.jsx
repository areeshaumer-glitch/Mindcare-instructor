import React, { useEffect, useMemo, useState, useRef } from 'react';
import images from '../assets/Images';
import { Method, callApi } from '../network/NetworkManager';
import { api } from '../network/Environment';
import { listS3Files, uploadImageOnS3 } from '../utils/function';
import { useAuthStore } from '../store/authSlice';

const EditProfile = () => {
  const token = useAuthStore((s) => s.token);
  const userData = useAuthStore((s) => s.userData);
  const updateUserData = useAuthStore((s) => s.updateUserData);
  const profileVersion = useAuthStore((s) => s.profileVersion);
  const bumpProfileVersion = useAuthStore((s) => s.bumpProfileVersion);

  const [profile, setProfile] = useState(null);
  const [fullName, setFullName] = useState('');

  const [selectedFile, setSelectedFile] = useState(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState(null);

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const fileInputRef = useRef(null);

  useEffect(() => {
    return () => {
      if (typeof imagePreviewUrl === 'string' && imagePreviewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(imagePreviewUrl);
      }
    };
  }, [imagePreviewUrl]);

  useEffect(() => {
    if (!token) return;
    let isMounted = true;
    setIsLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    void callApi({
      method: Method.GET,
      endPoint: api.instructorProfileMe,
      onSuccess: (res) => {
        if (!isMounted) return;
        const candidate = res?.data?.data || res?.data || null;
        setProfile(candidate);
        const nameCandidate =
          candidate?.name ||
          candidate?.user?.name ||
          userData?.profile?.fullName ||
          '';
        setFullName(nameCandidate);
        setImagePreviewUrl(candidate?.profileImage || null);
        setSelectedFile(null);
        setIsLoading(false);
      },
      onError: () => {
        if (!isMounted) return;
        setProfile(null);
        setFullName(userData?.profile?.fullName || '');
        setImagePreviewUrl(null);
        setSelectedFile(null);
        setIsLoading(false);
      },
    });

    return () => {
      isMounted = false;
    };
  }, [token, userData?.profile?.fullName]);

  const normalizeUploadedValue = (value) => {
    if (typeof value !== 'string') return '';
    return value.replace(/`/g, '').trim();
  };

  const getUrlFromS3Item = (item) => {
    if (typeof item === 'string') return item;
    return (
      item?.url ||
      item?.publicUrl ||
      item?.fileUrl ||
      item?.fileURL ||
      item?.location ||
      item?.Location ||
      item?.signedUrl ||
      item?.signedURL ||
      item?.key ||
      item?.Key ||
      ''
    );
  };

  const getFileNameFromKeyOrUrl = (value) => {
    if (typeof value !== 'string') return '';
    const cleaned = normalizeUploadedValue(value);
    const withoutQuery = cleaned.split('?')[0];
    const parts = withoutQuery.split('/').filter(Boolean);
    return parts[parts.length - 1] || '';
  };

  const resolveS3HttpUrl = async (keyOrUrl) => {
    const cleaned = normalizeUploadedValue(keyOrUrl);
    if (!cleaned) return '';
    if (/^https?:\/\//i.test(cleaned)) return cleaned;

    const targetName = getFileNameFromKeyOrUrl(cleaned);

    const files = await new Promise((resolve) => {
      listS3Files({
        onSuccess: (items) => resolve(items),
        onError: () => resolve([]),
      });
    });

    const list = Array.isArray(files) ? files : [];
    for (const item of list) {
      const candidate = normalizeUploadedValue(getUrlFromS3Item(item));
      if (!candidate) continue;

      const candidateName = getFileNameFromKeyOrUrl(candidate);
      const matches =
        candidate === cleaned ||
        candidate.includes(cleaned) ||
        (targetName && (candidate.endsWith(`/${targetName}`) || candidateName === targetName));

      if (matches && /^https?:\/\//i.test(candidate)) return candidate;
    }

    for (const item of list) {
      const candidate = normalizeUploadedValue(getUrlFromS3Item(item));
      if (!candidate) continue;
      const candidateName = getFileNameFromKeyOrUrl(candidate);
      if (targetName && candidateName === targetName && /^https?:\/\//i.test(candidate)) return candidate;
    }

    return '';
  };

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0] || null;
    if (!file) return;

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/jpg'];
    if (!validTypes.includes(file.type)) {
      setErrorMessage('Only JPG and PNG images are allowed.');
      return;
    }

    setErrorMessage('');
    setSuccessMessage('');
    setSelectedFile(file);
    setImagePreviewUrl(URL.createObjectURL(file));
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  const uploadSelectedImage = (file) => {
    return new Promise((resolve, reject) => {
      void uploadImageOnS3({
        file,
        onSuccess: (keyOrUrl) => resolve(keyOrUrl),
        onError: (err) => reject(err),
      });
    });
  };

  const withCacheBuster = (rawUrl) => {
    if (!rawUrl || typeof rawUrl !== 'string') return rawUrl;
    if (rawUrl.startsWith('blob:') || rawUrl.startsWith('data:')) return rawUrl;
    try {
      const url = new URL(rawUrl, window.location.origin);
      url.searchParams.set('v', String(profileVersion || 0));
      return url.toString();
    } catch {
      const sep = rawUrl.includes('?') ? '&' : '?';
      return `${rawUrl}${sep}v=${profileVersion || 0}`;
    }
  };

  const displayName = useMemo(() => {
    const candidate =
      fullName?.trim() ||
      profile?.name ||
      profile?.user?.name ||
      userData?.profile?.fullName ||
      userData?.phone ||
      '';
    return candidate || 'Name Here';
  }, [fullName, profile?.name, profile?.user?.name, userData?.phone, userData?.profile?.fullName]);

  const displayFileName = useMemo(() => {
    if (selectedFile?.name) return selectedFile.name;
    if (typeof imagePreviewUrl === 'string' && imagePreviewUrl.trim()) {
      const cleaned = imagePreviewUrl.split('?')[0];
      const last = cleaned.split('/').filter(Boolean).pop();
      return last || 'Profile.JPG';
    }
    return 'Profile.JPG';
  }, [imagePreviewUrl, selectedFile?.name]);



  const handleSaveChanges = async () => {
    setErrorMessage('');
    setSuccessMessage('');

    const trimmedName = String(fullName || '').trim();
    if (!trimmedName) {
      setErrorMessage('Full name is required');
      return;
    }

    setIsSaving(true);

    try {
      let profileImage = profile?.profileImage || '';
      if (selectedFile) {
        const uploaded = await uploadSelectedImage(selectedFile);
        const normalized = normalizeUploadedValue(String(uploaded || ''));
        const resolvedHttpUrl = normalized ? await resolveS3HttpUrl(normalized) : '';
        profileImage = resolvedHttpUrl || normalized;
      }

      const bodyParams = {
        name: trimmedName,
        ...(profileImage ? { profileImage } : {}),
      };

      await callApi({
        method: Method.PUT,
        endPoint: api.instructorProfile,
        bodyParams,
        onSuccess: (res) => {
          const updated = res?.data?.data || res?.data || null;
          if (updated) {
            setProfile(updated);
            if (updated?.name) setFullName(updated.name);
            if (updated?.profileImage) setImagePreviewUrl(updated.profileImage);
          } else {
            setProfile((prev) => ({
              ...(prev || {}),
              ...bodyParams,
            }));
            if (bodyParams?.profileImage) setImagePreviewUrl(bodyParams.profileImage);
          }

          const currentProfile = userData?.profile || {};
          updateUserData({
            profile: {
              ...currentProfile,
              fullName: trimmedName,
            },
          });

          setSelectedFile(null);
          setSuccessMessage(res?.message || 'Profile updated');
          bumpProfileVersion();
        },
        onError: (err) => {
          const message =
            err?.message ||
            err?.data?.message ||
            err?.response?.data?.message ||
            'Failed to update profile';
          setErrorMessage(message);
        },
      });
    } catch (err) {
      const message =
        err?.message ||
        err?.data?.message ||
        err?.response?.data?.message ||
        'Failed to update profile';
      setErrorMessage(message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="w-full p-8">
      <div className="space-y-6 w-full max-w-2xl">

        {/* Hidden file input */}
        <input
          type="file"
          accept="image/png, image/jpeg, image/jpg"
          onChange={handleImageUpload}
          className="hidden"
          ref={fileInputRef}
        />

        {/* Profile header row */}
        <div className="flex items-center justify-between w-full max-w-[600px]">
          <div className="flex items-center gap-5">
            <button onClick={handleButtonClick} className="hover:opacity-80 transition-opacity">
              {imagePreviewUrl ? (
                <img
                  src={withCacheBuster(imagePreviewUrl)}
                  alt="Profile"
                  className="w-24 h-24 rounded-full object-cover border-2"
                  style={{ borderColor: "#008080" }}
                />
              ) : (
                <div
                  className="w-24 h-24 rounded-full flex items-center justify-center bg-purple-100 overflow-hidden"
                >
                  <img
                    src={images.camera}
                    alt="Profile"
                    className="w-12 h-12 object-contain opacity-50"
                  />
                </div>
              )}
            </button>
            <div className="flex flex-col">
              <h3 className="font-semibold text-2xl text-gray-800">{displayName}</h3>

            </div>
          </div>

          <button
            onClick={handleButtonClick}
            className="px-6 py-2 rounded-xl font-medium transition-all hover:bg-gray-50 bg-white"
            style={{ border: "1px solid #0E4E95", color: "#333" }}
            disabled={isLoading || isSaving}
          >
            Update Photo
          </button>
        </div>

        {/* Full Name Input */}
        <div className="space-y-2">
          <label className="block text-lg font-semibold text-gray-800">Fullname *</label>
          <div style={{ width: '390px', height: '40px' }}>
            <input
              type="text"
              placeholder="Enter full name"
              className="w-full h-full border border-gray-300 rounded-xl px-4 focus:outline-none transition-all"
              value={fullName}
              onChange={(e) => {
                setSuccessMessage('');
                setErrorMessage('');
                setFullName(e.target.value);
              }}
              onFocus={(e) => e.target.style.borderColor = "#008080"}
              onBlur={(e) => e.target.style.borderColor = "#D1D5DB"}
              disabled={isLoading || isSaving}
            />
          </div>
        </div>



        {/* Save Changes button at the right end */}
        <div className="flex justify-end pt-0">
          <button
            className="text-white font-semibold transition-all hover:opacity-90 disabled:opacity-50 shadow-md"
            style={{
              backgroundColor: "#008080",
              width: "332px",
              height: "50px",
              borderRadius: "12px"
            }}
            onClick={handleSaveChanges}
            disabled={isLoading || isSaving}
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>

      </div>
    </div>
  );
};

export default EditProfile;
