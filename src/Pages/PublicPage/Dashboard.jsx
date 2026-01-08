import React, { useCallback, useEffect, useMemo, useState } from 'react';
import images from '../../assets/Images';
import { Method, callApi } from '../../network/NetworkManager';
import { api } from '../../network/Environment';

const Dashboard = () => {
  const [workouts, setWorkouts] = useState([]);
  const [videos, setVideos] = useState([]);
  const [activeVideoIndex, setActiveVideoIndex] = useState(null);
  const [isLoadingWorkouts, setIsLoadingWorkouts] = useState(false);
  const [isLoadingVideos, setIsLoadingVideos] = useState(false);
  const [apiError, setApiError] = useState('');

  const cleanUrl = useCallback((value) => {
    if (typeof value !== 'string') return '';
    return value.replace(/`/g, '').trim();
  }, []);

  const extractArray = useCallback((response) => {
    if (Array.isArray(response)) return response;
    if (Array.isArray(response?.data)) return response.data;
    if (Array.isArray(response?.data?.data)) return response.data.data;
    if (Array.isArray(response?.data?.data?.items)) return response.data.data.items;
    if (Array.isArray(response?.data?.data?.data)) return response.data.data.data;
    if (Array.isArray(response?.items)) return response.items;
    if (Array.isArray(response?.data?.items)) return response.data.items;
    if (Array.isArray(response?.result)) return response.result;
    if (Array.isArray(response?.data?.result)) return response.data.result;
    if (Array.isArray(response?.payload)) return response.payload;
    if (Array.isArray(response?.data?.payload)) return response.data.payload;
    return [];
  }, []);

  const normalizeWorkoutPlan = useCallback(
    (plan) => {
      const selectedDays = Array.isArray(plan?.days)
        ? plan.days.map((d) => d?.day).filter((d) => typeof d === 'number')
        : Array.isArray(plan?.selectedDays)
          ? plan.selectedDays
          : [];

      return {
        ...plan,
        id: plan?._id || plan?.id || `${Date.now()}`,
        selectedDays,
        coverImageUrl: cleanUrl(plan?.coverImageUrl),
      };
    },
    [cleanUrl],
  );

  const loadWorkouts = useCallback(async () => {
    setIsLoadingWorkouts(true);
    setApiError('');

    await callApi({
      method: Method.GET,
      endPoint: api.workouts,
      onSuccess: (res) => {
        const list = extractArray(res).map(normalizeWorkoutPlan);
        setWorkouts(list);
      },
      onError: (err) => {
        setWorkouts([]);
        setApiError(err?.message || 'Failed to load workouts. Please try again.');
      },
    });

    setIsLoadingWorkouts(false);
  }, [extractArray, normalizeWorkoutPlan]);

  const isVideoFileName = useCallback((value) => {
    if (typeof value !== 'string') return false;
    const name = value.toLowerCase();
    return (
      name.endsWith('.mp4') ||
      name.endsWith('.mov') ||
      name.endsWith('.m4v') ||
      name.endsWith('.webm') ||
      name.endsWith('.ogg') ||
      name.endsWith('.avi') ||
      name.endsWith('.mkv')
    );
  }, []);

  const getNameFromKeyOrUrl = useCallback(
    (value) => {
      if (typeof value !== 'string') return '';
      const cleaned = cleanUrl(value);
      const withoutQuery = cleaned.split('?')[0];
      const parts = withoutQuery.split('/').filter(Boolean);
      return parts[parts.length - 1] || '';
    },
    [cleanUrl],
  );

  const extractMindfulnessVideos = useCallback((response) => {
    const candidates = [
      response?.data?.data,
      response?.data,
      response?.data?.items,
      response?.items,
      response?.data?.result,
      response?.result,
      response?.payload,
      response?.data?.payload,
    ];

    for (const value of candidates) {
      if (Array.isArray(value)) return value;
      if (Array.isArray(value?.items)) return value.items;
      if (Array.isArray(value?.data)) return value.data;
    }

    return [];
  }, []);

  const mapMindfulnessItemToVideo = useCallback(
    (item, index) => {
      const rawUrl =
        item?.videoUrl ||
        item?.url ||
        item?.fileUrl ||
        item?.fileURL ||
        item?.publicUrl ||
        item?.signedUrl ||
        item?.location ||
        '';

      const cleanedUrl = cleanUrl(rawUrl);
      const isHttpUrl = /^https?:\/\//i.test(cleanedUrl);

      const rawKey = item?.videoKey || item?.s3Key || item?.key || item?.Key || '';
      const cleanedKey = cleanUrl(rawKey);

      const fileName = getNameFromKeyOrUrl(cleanedUrl || cleanedKey) || `video-${index + 1}`;

      return {
        id: item?._id || item?.id || item?.videoId || cleanedKey || `${index}`,
        title: String(item?.title || item?.name || fileName).trim(),
        fileName,
        s3Key: isHttpUrl ? cleanedKey : (cleanedKey || cleanedUrl),
        fileUrl: isHttpUrl ? cleanedUrl : '',
        videoUrl: isHttpUrl ? cleanedUrl : '',
        thumbnailUrl: cleanUrl(item?.thumbnailUrl || item?.thumbUrl || item?.thumbnail || ''),
        durationSeconds: item?.durationSeconds,
      };
    },
    [cleanUrl, getNameFromKeyOrUrl],
  );

  const loadVideos = useCallback(async () => {
    setIsLoadingVideos(true);
    setApiError('');

    const res = await new Promise((resolve) => {
      const params = new URLSearchParams();
      params.set('page', '1');
      params.set('limit', '1000');
      const endPoint = `${api.mindfulnessVideos}?${params.toString()}`;

      callApi({
        method: Method.GET,
        endPoint,
        onSuccess: (data) => resolve({ ok: true, data }),
        onError: (err) => resolve({ ok: false, err }),
      });
    });

    if (res?.ok) {
      const items = extractMindfulnessVideos(res?.data);
      const list = items
        .map(mapMindfulnessItemToVideo)
        .filter((v) => {
          const candidate = v?.fileName || v?.title || v?.fileUrl || v?.s3Key || '';
          return isVideoFileName(candidate);
        });
      setVideos(list);
      setIsLoadingVideos(false);
      return;
    }

    setVideos([]);
    setApiError(res?.err?.message || 'Failed to load videos. Please try again.');
    setIsLoadingVideos(false);
  }, [extractMindfulnessVideos, isVideoFileName, mapMindfulnessItemToVideo]);

  useEffect(() => {
    void loadWorkouts();
    void loadVideos();
  }, [loadVideos, loadWorkouts]);

  const workoutCards = useMemo(() => {
    return workouts.map((plan) => {
      const dayCount =
        Number.isFinite(Number(plan?.duration)) && Number(plan.duration) > 0
          ? Number(plan.duration)
          : Array.isArray(plan?.selectedDays) && plan.selectedDays.length > 0
            ? plan.selectedDays.length
            : Array.isArray(plan?.days)
              ? plan.days.length
              : 0;

      const durationLabel =
        typeof plan?.duration === 'string' && plan.duration.trim()
          ? plan.duration
          : dayCount > 0
            ? `${dayCount} Day`
            : '';

      const cover = cleanUrl(plan?.coverImageUrl) || images.chest;
      return {
        id: plan?.id || plan?._id,
        title: String(plan?.name || 'Workout Plan').trim(),
        duration: durationLabel,
        thumbnail: cover,
      };
    });
  }, [cleanUrl, workouts]);
  const videoCards = useMemo(() => {
    return videos.map((v) => {
      const thumb = v.thumbnailUrl || '';
      return {
        ...v,
        thumbnail: thumb,
      };
    });
  }, [videos]);
  return (
    <div className="w-full">
      <h2 className="text-xl font-semibold mb-4">Dashboard</h2>



      {isLoadingWorkouts ? (
        <div className="p-6 text-center text-gray-600">Loading workouts...</div>
      ) : workoutCards.length === 0 ? (
        <div className="p-6 text-center text-gray-600">No workouts found.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {workoutCards.map((item) => (
            <div key={item.id} className="rounded-xl overflow-hidden shadow-md relative bg-black/60 h-[181px]">
              <img src={item.thumbnail} alt="Thumbnail" className="w-full h-full object-cover opacity-100" />
              <div className="absolute bottom-2 left-2 text-white text-sm">{item.title.length > 7 ? item.title.substring(0, 8) + '...' : item.title}</div>
              <div className="absolute bottom-2 right-2 text-white text-xs">{item.duration}</div>
            </div>
          ))}
        </div>
      )}

      <h2 className="text-xl font-semibold mb-4 mt-6">Video Library</h2>
      {isLoadingVideos ? (
        <div className="p-6 text-center text-gray-600">Loading videos...</div>
      ) : videoCards.length === 0 ? (
        <div className="p-6 text-center text-gray-600">No videos found.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {videoCards.map((item, index) => (
            <div
              key={item.id || index}
              className="rounded-xl overflow-hidden shadow-md relative bg-black/60"
              onClick={() => setActiveVideoIndex((prev) => (prev === index ? null : index))}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') setActiveVideoIndex((prev) => (prev === index ? null : index));
              }}
            >
              {activeVideoIndex === index && item.videoUrl ? (
                <video src={item.videoUrl} autoPlay controls className="w-full h-40 object-cover" />
              ) : (
                <>
                  {item.thumbnail ? (
                    <img src={item.thumbnail} alt="Thumbnail" className="w-full h-40 object-cover opacity-100" />
                  ) : item.videoUrl ? (
                    <video
                      src={item.videoUrl}
                      muted
                      playsInline
                      preload="metadata"
                      className="w-full h-40 object-cover"
                    />
                  ) : (
                    <div className="w-full h-40 bg-black/50" />
                  )}
                  {item.videoUrl ? (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <img src={images.start} alt="Play" className="w-8 h-8" />
                    </div>
                  ) : null}
                </>
              )}

              <div className="absolute bottom-2 left-2 text-white text-sm">{item.title}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Dashboard;
