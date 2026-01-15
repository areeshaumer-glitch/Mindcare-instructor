import React, { useCallback, useEffect, useState, useRef } from "react";
import { Upload, Play, Trash2, X, ArrowLeft, Loader2 } from "lucide-react";
import { useLocation } from "react-router-dom";
import { listS3Files, uploadVideoOnS3 } from "../../utils/function";
import { Method, callApi } from "../../network/NetworkManager";
import { api } from "../../network/Environment";
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';
const VideoLibrary = () => {
  const MAX_VIDEO_BYTES = 5 * 1024 * 1024;
  const location = useLocation();
  const [navOpenedKey, setNavOpenedKey] = useState("");
  const [videos, setVideos] = useState([]);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [showVideoDetail, setShowVideoDetail] = useState(false);
  const [isInlineEditing, setIsInlineEditing] = useState(false);
  const [isUploadAttempted, setIsUploadAttempted] = useState(false);
  const [apiError, setApiError] = useState("");
  const [isLoadingVideos, setIsLoadingVideos] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isEditUploading, setIsEditUploading] = useState(false);
  const [playbackError, setPlaybackError] = useState("");
  const [isResolvingPlayback, setIsResolvingPlayback] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);
  const [compressionProgress, setCompressionProgress] = useState(0);
  const ffmpegRef = useRef(new FFmpeg());
  const [ffmpegLoaded, setFfmpegLoaded] = useState(false);

  useEffect(() => {
    if (showUploadModal) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev || "";
      };
    } else {
      document.body.style.overflow = "";
    }
  }, [showUploadModal]);

  const [uploadForm, setUploadForm] = useState({
    title: "",
    description: "",
    file: null,
    fileName: ""
  });
  const [editForm, setEditForm] = useState({
    title: "",
    description: "",
    file: null,
    fileName: ""
  });
  const [uploadErrors, setUploadErrors] = useState({
    title: false,
    description: false,
    file: false,
  });

  const loadFFmpeg = useCallback(async () => {
    if (ffmpegLoaded) return true;
    const ffmpeg = ffmpegRef.current;
    ffmpeg.on('log', ({ message }) => {
      console.log('FFmpeg:', message);
    });
    ffmpeg.on('progress', ({ progress }) => {
        setCompressionProgress(Math.round(progress * 100));
    });
    
    try {
        const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.10/dist/umd';
        await ffmpeg.load({
            coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
            wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
        });
        setFfmpegLoaded(true);
        return true;
    } catch (error) {
        console.error('Failed to load FFmpeg:', error);
        setApiError("Failed to load video compression component. Please reload the page.");
        return false;
    }
  }, [ffmpegLoaded]);

  const compressVideo = useCallback(async (file) => {
    if (!file) return null;
    const loaded = await loadFFmpeg();
    if (!loaded) return null;

    setIsCompressing(true);
    setCompressionProgress(0);
    const ffmpeg = ffmpegRef.current;

    try {
        const { name } = file;
        await ffmpeg.writeFile(name, await fetchFile(file));
        
        // Compression command: scale to 720p, crf 28 (lower quality/size), fast preset
        await ffmpeg.exec([
            '-i', name,
            '-vf', "scale='min(1280,iw)':-2",
            '-c:v', 'libx264',
            '-crf', '28',
            '-preset', 'faster',
            '-c:a', 'aac',
            '-b:a', '128k',
            'output.mp4'
        ]);

        const data = await ffmpeg.readFile('output.mp4');
        const compressedBlob = new Blob([data.buffer], { type: 'video/mp4' });
        const compressedFile = new File([compressedBlob], name, { type: 'video/mp4' });
        
        // Cleanup
        try {
          await ffmpeg.deleteFile(name);
          await ffmpeg.deleteFile('output.mp4');
        } catch (e) {
          void e;
        }
        
        setIsCompressing(false);
        return compressedFile;
    } catch (error) {
        console.error('Compression failed:', error);
        setApiError("Video compression failed.");
        setIsCompressing(false);
        return null;
    }
  }, [loadFFmpeg]);

  const uploadVideoToS3 = useCallback(async (file) => {
    return await new Promise((resolve, reject) => {
      uploadVideoOnS3({
        file,
        onSuccess: (keyOrUrl) => resolve(keyOrUrl),
        onError: (error) =>
          reject(new Error(error?.message || "Failed to upload video. Please try again.")),
      });
    });
  }, []);

  const normalizeVideoUrlForApi = useCallback((value) => {
    if (typeof value !== "string") return "";
    const cleaned = value.replace(/`/g, "").trim();
    if (!cleaned) return "";
    if (/^https?:\/\//i.test(cleaned)) return cleaned;
    return cleaned;
  }, []);

  const getVideoDurationSecondsFromFile = useCallback(async (file) => {
    if (!file) return 0;
    return await new Promise((resolve) => {
      let objectUrl = "";
      try {
        objectUrl = URL.createObjectURL(file);
        const video = document.createElement("video");
        video.preload = "metadata";
        video.muted = true;
        video.playsInline = true;
        video.onloadedmetadata = () => {
          try {
            if (objectUrl) URL.revokeObjectURL(objectUrl);
          } catch (e) {
            void e;
          }
          const duration = Number(video.duration);
          resolve(Number.isFinite(duration) ? Math.max(0, Math.round(duration)) : 0);
        };
        video.onerror = () => {
          try {
            if (objectUrl) URL.revokeObjectURL(objectUrl);
          } catch (e) {
            void e;
          }
          resolve(0);
        };
        video.src = objectUrl;
      } catch (e) {
        void e;
        try {
          if (objectUrl) URL.revokeObjectURL(objectUrl);
        } catch (err) {
          void err;
        }
        resolve(0);
      }
    });
  }, []);

  const getNameFromKeyOrUrl = useCallback((value) => {
    if (typeof value !== "string") return "";
    const cleaned = value.replace(/`/g, "").trim();
    const withoutQuery = cleaned.split("?")[0];
    const parts = withoutQuery.split("/");
    return parts[parts.length - 1] || "";
  }, []);

  const isVideoFileName = useCallback((value) => {
    if (typeof value !== "string") return false;
    const name = value.toLowerCase();
    return (
      name.endsWith(".mp4") ||
      name.endsWith(".mov") ||
      name.endsWith(".m4v") ||
      name.endsWith(".webm") ||
      name.endsWith(".ogg") ||
      name.endsWith(".avi") ||
      name.endsWith(".mkv")
    );
  }, []);

  const getUrlFromS3Item = useCallback((item) => {
    if (typeof item === "string") return item;
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
      ""
    );
  }, []);

  const extractUrlFromAnyResponse = useCallback((response) => {
    const value =
      response?.url ||
      response?.fileUrl ||
      response?.location ||
      response?.publicUrl ||
      response?.signedUrl ||
      response?.data?.url ||
      response?.data?.fileUrl ||
      response?.data?.location ||
      response?.data?.publicUrl ||
      response?.data?.signedUrl ||
      response?.data?.data?.url ||
      response?.data?.data?.fileUrl ||
      response?.data?.data?.location ||
      response?.data?.data?.publicUrl ||
      response?.data?.data?.signedUrl ||
      "";

    if (typeof value !== "string") return "";
    const cleaned = value.replace(/`/g, "").trim();
    return cleaned;
  }, []);

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
        "";

      const cleanedUrl = typeof rawUrl === "string" ? rawUrl.replace(/`/g, "").trim() : "";
      const isHttpUrl = /^https?:\/\//i.test(cleanedUrl);

      const rawKey = item?.videoKey || item?.s3Key || item?.key || item?.Key || "";
      const cleanedKey = typeof rawKey === "string" ? rawKey.replace(/`/g, "").trim() : "";

      const fileName =
        item?.fileName ||
        item?.name ||
        getNameFromKeyOrUrl(cleanedUrl || cleanedKey) ||
        `video-${index + 1}`;

      return {
        id: item?._id || item?.id || cleanedUrl || cleanedKey || `${Date.now()}-${index}`,
        title: item?.title || item?.name || fileName,
        description: item?.description || "",
        fileName,
        fileUrl: isHttpUrl ? cleanedUrl : "",
        s3Key: isHttpUrl ? cleanedKey : cleanedKey || cleanedUrl,
        durationSeconds: Number.isFinite(Number(item?.durationSeconds)) ? Number(item.durationSeconds) : 0,
        tags: Array.isArray(item?.tags) ? item.tags : [],
        isActive: typeof item?.isActive === "boolean" ? item.isActive : true,
        thumbnailUrl:
          item?.thumbnailUrl ||
          item?.thumbUrl ||
          item?.thumbnail ||
          "",
      };
    },
    [getNameFromKeyOrUrl],
  );

  const resolveVideoPlaybackUrl = useCallback(
    async (key) => {
      if (typeof key !== "string" || key.trim().length === 0) return "";
      const encodedKey = encodeURIComponent(key.trim());

      const urlCandidates = [
        `s3/url?key=${encodedKey}`,
        `s3/presign?key=${encodedKey}`,
        `s3/get-url?key=${encodedKey}`,
        `s3/signed-url?key=${encodedKey}`,
      ];

      for (const endPoint of urlCandidates) {
        const url = await new Promise((resolve) => {
          callApi({
            method: Method.GET,
            endPoint,
            onSuccess: (res) => resolve(extractUrlFromAnyResponse(res)),
            onError: () => resolve(""),
          });
        });
        if (typeof url === "string" && /^https?:\/\//i.test(url)) return url;
      }

      const streamCandidates = [
        `s3/get?key=${encodedKey}`,
        `s3/download?key=${encodedKey}`,
        `s3/view?key=${encodedKey}`,
        `s3/file?key=${encodedKey}`,
        `s3/${encodedKey}`,
        `s3/file/${encodedKey}`,
        `s3/download/${encodedKey}`,
        `s3/view/${encodedKey}`,
        `s3/get/${encodedKey}`,
      ];

      for (const endPoint of streamCandidates) {
        const blob = await new Promise((resolve) => {
          callApi({
            method: Method.GET,
            endPoint,
            responseType: "blob",
            onSuccess: (res) => resolve(res),
            onError: () => resolve(null),
          });
        });

        if (blob) {
          try {
            return URL.createObjectURL(blob);
          } catch {
            return "";
          }
        }
      }

      return "";
    },
    [extractUrlFromAnyResponse],
  );

  const resolveS3HttpUrl = useCallback(
    async (key) => {
      if (typeof key !== "string" || key.trim().length === 0) return "";
      const encodedKey = encodeURIComponent(key.trim());

      const urlCandidates = [
        `s3/url?key=${encodedKey}`,
        `s3/presign?key=${encodedKey}`,
        `s3/get-url?key=${encodedKey}`,
        `s3/signed-url?key=${encodedKey}`,
      ];

      for (const endPoint of urlCandidates) {
        const url = await new Promise((resolve) => {
          callApi({
            method: Method.GET,
            endPoint,
            onSuccess: (res) => resolve(extractUrlFromAnyResponse(res)),
            onError: () => resolve(""),
          });
        });
        if (typeof url === "string" && /^https?:\/\//i.test(url)) return url;
      }

      return "";
    },
    [extractUrlFromAnyResponse],
  );

  const loadVideos = useCallback(async () => {
    setApiError("");
    setIsLoadingVideos(true);

    const mindfulnessResponse = await new Promise((resolve) => {
      const params = new URLSearchParams();
      params.set("page", "1");
      params.set("limit", "1000");
      const endPoint = `${api.mindfulnessVideos}?${params.toString()}`;

      callApi({
        method: Method.GET,
        endPoint,
        onSuccess: (res) => resolve({ ok: true, res }),
        onError: (err) => resolve({ ok: false, err }),
      });
    });

    const mindfulnessOk = mindfulnessResponse?.ok === true;
    const mindfulnessItems = mindfulnessOk ? extractMindfulnessVideos(mindfulnessResponse?.res) : [];
    const mindfulnessVideos = mindfulnessItems.map(mapMindfulnessItemToVideo).filter((v) => {
      const candidate = v?.fileName || v?.title || v?.fileUrl || v?.s3Key || "";
      return isVideoFileName(candidate);
    });

    if (mindfulnessOk) {
      setVideos(mindfulnessVideos);
      setIsLoadingVideos(false);
      return;
    }

    const s3Response = await new Promise((resolve) => {
      listS3Files({
        onSuccess: (items) => resolve({ ok: true, items }),
        onError: (err) => resolve({ ok: false, err }),
      });
    });

    const s3Ok = s3Response?.ok === true;
    const s3Items = s3Ok && Array.isArray(s3Response?.items) ? s3Response.items : [];
    const s3Videos = s3Items
      .map((item, index) => {
        const urlOrKey = getUrlFromS3Item(item);
        const normalized = typeof urlOrKey === "string" ? urlOrKey.replace(/`/g, "").trim() : "";
        const isHttpUrl = /^https?:\/\//i.test(normalized);
        const keyFromItem =
          typeof item === "string"
            ? ""
            : typeof item?.key === "string"
              ? item.key
              : typeof item?.Key === "string"
                ? item.Key
                : "";
        const s3Key = isHttpUrl ? keyFromItem : (keyFromItem || normalized);
        const fileUrl = isHttpUrl ? normalized : "";
        const key =
          typeof item === "string"
            ? ""
            : typeof item?.key === "string"
              ? item.key
              : typeof item?.Key === "string"
                ? item.Key
                : "";
        const fileName =
          (typeof item === "string" ? "" : item?.fileName) ||
          (typeof item === "string" ? "" : item?.name) ||
          getNameFromKeyOrUrl(fileUrl || s3Key || key || normalized) ||
          `video-${index + 1}`;
        return {
          id:
            (typeof item === "string" ? "" : item?._id) ||
            (typeof item === "string" ? "" : item?.id) ||
            fileUrl ||
            s3Key ||
            key ||
            `${Date.now()}-${index}`,
          title: fileName,
          description: "",
          fileName,
          fileUrl,
          s3Key,
        };
      })
      .filter((v) => {
        const candidate = v?.fileName || v?.title || v?.fileUrl || v?.s3Key || "";
        return isVideoFileName(candidate);
      });

    if (s3Ok) {
      setVideos(s3Videos);
      setApiError(
        mindfulnessResponse?.err?.message ||
        "Mindfulness videos are unavailable. Showing raw S3 videos instead.",
      );
    } else {
      setVideos([]);
      setApiError(mindfulnessResponse?.err?.message || s3Response?.err?.message || "Failed to load videos. Please try again.");
    }

    setIsLoadingVideos(false);
  }, [extractMindfulnessVideos, getNameFromKeyOrUrl, getUrlFromS3Item, isVideoFileName, mapMindfulnessItemToVideo]);

  useEffect(() => {
    void loadVideos();
  }, [loadVideos]);

  useEffect(() => {
    if (!selectedVideo) return;
    if (selectedVideo?.fileUrl) return;
    if (!selectedVideo?.s3Key) return;

    let blobUrlToRevoke = "";
    let cancelled = false;

    const run = async () => {
      setPlaybackError("");
      setIsResolvingPlayback(true);

      const resolved = await resolveVideoPlaybackUrl(selectedVideo.s3Key);
      if (cancelled) return;

      setIsResolvingPlayback(false);

      if (!resolved) {
        setPlaybackError("Video URL not available for preview");
        return;
      }

      if (resolved.startsWith("blob:")) blobUrlToRevoke = resolved;

      setSelectedVideo((prev) => {
        if (!prev || prev.id !== selectedVideo.id) return prev;
        return { ...prev, fileUrl: resolved };
      });
      setVideos((prev) =>
        prev.map((v) => (v.id === selectedVideo.id ? { ...v, fileUrl: resolved } : v)),
      );
    };

    void run();

    return () => {
      cancelled = true;
      if (blobUrlToRevoke) URL.revokeObjectURL(blobUrlToRevoke);
    };
  }, [resolveVideoPlaybackUrl, selectedVideo]);

  const closeUploadModal = () => {
    setShowUploadModal(false);
    setApiError("");
    setUploadForm({ title: "", description: "", file: null, fileName: "" });
    setUploadErrors({ title: false, description: false, file: false });
    setIsUploadAttempted(false);
  };

  const closeEditModal = () => {
    setShowEditModal(false);
    setApiError("");
    setIsInlineEditing(false);
  };

  // Handle upload form
  const handleUploadChange = (field, value) => {
    setUploadForm(prev => ({ ...prev, [field]: value }));
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith('video/')) {
      if (file.size > MAX_VIDEO_BYTES) {
        setApiError(`File is large (${(file.size / 1024 / 1024).toFixed(1)}MB). Compressing...`);
        const compressed = await compressVideo(file);

        if (compressed) {
          if (compressed.size > MAX_VIDEO_BYTES) {
            setApiError("File is still too large after compression. Please choose a smaller video.");
            setUploadForm((prev) => ({
              ...prev,
              file: null,
              fileName: "",
            }));
          } else {
            setApiError("");
            setUploadForm((prev) => ({
              ...prev,
              file: compressed,
              fileName: compressed.name,
            }));
          }
        } else {
            setUploadForm((prev) => ({
              ...prev,
              file: null,
              fileName: "",
            }));
        }
        return;
      }
      setUploadForm(prev => ({
        ...prev,
        file: file,
        fileName: file.name
      }));
    } else {
      setApiError("Please select a video file");
      setUploadForm((prev) => ({
        ...prev,
        file: null,
        fileName: "",
      }));
    }
  };

  const handleUploadSubmit = async () => {
    setIsUploadAttempted(true);
    setApiError("");

    const errors = {
      title: !uploadForm.title.trim(),
      description: !uploadForm.description.trim(),
      file: !uploadForm.file,
    };

    setUploadErrors(errors);

    const hasErrors = Object.values(errors).some(Boolean);
    if (hasErrors) return;

    setIsUploading(true);
    try {
      const durationSeconds = await getVideoDurationSecondsFromFile(uploadForm.file);

      const serverUrl = await uploadVideoToS3(uploadForm.file);
      const normalized = normalizeVideoUrlForApi(serverUrl);

      if (!normalized) {
        throw new Error("Video upload did not return a valid URL");
      }
      const resolvedHttpUrl = /^https?:\/\//i.test(normalized) ? normalized : await resolveS3HttpUrl(normalized);
      const videoUrlToSend = resolvedHttpUrl || normalized;

      const bodyParams = {
        title: String(uploadForm.title || "").trim(),
        description: String(uploadForm.description || "").trim(),
        videoUrl: videoUrlToSend,
        thumbnailUrl: "",
        durationSeconds,
        tags: [],
        isActive: true,
      };

      console.log('Upload BodyParams:', bodyParams);

      await new Promise((resolve, reject) => {
        callApi({
          method: Method.POST,
          endPoint: api.mindfulnessVideos,
          bodyParams,
          onSuccess: (res) => resolve(res),
          onError: (err) =>
            reject(new Error(err?.message || "Failed to save video. Please try again.")),
        });
      });

      setUploadForm({ title: "", description: "", file: null, fileName: "" });
      setUploadErrors({ title: false, description: false, file: false });
      setIsUploadAttempted(false);
      closeUploadModal();
      void loadVideos();
    } catch (e) {
      setApiError(e?.message || "Failed to upload video. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };



  // Handle video click to show detail
  const handleVideoClick = (video) => {
    setSelectedVideo(video);
    setPlaybackError("");
    setShowVideoDetail(true);
    setIsInlineEditing(false);
  };

  // Handle back to library
  const handleBackToLibrary = () => {
    setShowVideoDetail(false);
    setSelectedVideo(null);
    setIsInlineEditing(false);
  };

  // Handle edit
  const handleEdit = useCallback((video) => {
    setSelectedVideo(video);
    setShowVideoDetail(true);
    setEditForm({
      title: video.title,
      description: video.description,
      file: null,
      fileName: video.fileName || ""
    });
    setApiError("");
    setShowEditModal(false);
    setIsInlineEditing(true);
  }, []);

  useEffect(() => {
    const editVideoId = location?.state?.editVideoId;
    if (!editVideoId) return;
    if (String(navOpenedKey) === String(location?.key || "")) return;

    const match = videos.find((v) => String(v?.id) === String(editVideoId));
    if (!match) return;

    handleEdit(match);
    setNavOpenedKey(String(location?.key || ""));
  }, [handleEdit, location?.key, location?.state?.editVideoId, navOpenedKey, videos]);

  const handleEditFileUpload = async (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith('video/')) {
      if (file.size > MAX_VIDEO_BYTES) {
        setApiError(`File is large (${(file.size / 1024 / 1024).toFixed(1)}MB). Compressing...`);
        const compressed = await compressVideo(file);

        if (compressed) {
          if (compressed.size > MAX_VIDEO_BYTES) {
            setApiError("File is still too large after compression. Please choose a smaller video.");
            setEditForm((prev) => ({
              ...prev,
              file: null,
              fileName: prev.fileName || "",
            }));
          } else {
            setApiError("");
            setEditForm((prev) => ({
              ...prev,
              file: compressed,
              fileName: compressed.name,
            }));
          }
        } else {
             setEditForm((prev) => ({
              ...prev,
              file: null,
              fileName: prev.fileName || "",
            }));
        }
        return;
      }
      setEditForm(prev => ({
        ...prev,
        file: file,
        fileName: file.name
      }));
    } else {
      setApiError("Please select a video file");
      setEditForm((prev) => ({
        ...prev,
        file: null,
        fileName: prev.fileName || "",
      }));
    }
  };

  const handleEditSubmit = async () => {
    setApiError("");
    if (!selectedVideo?.id) {
      setApiError("Unable to update video. Missing video id.");
      return;
    }

    const nextTitle = String(editForm.title || "").trim();
    const nextDescription = String(editForm.description || "").trim();

    if (!nextTitle) {
      setApiError("Title is required.");
      return;
    }

    setIsEditUploading(true);
    try {
      const currentVideoUrl = String(selectedVideo?.fileUrl || selectedVideo?.s3Key || "").trim();
      let nextVideoUrl = currentVideoUrl;
      let nextDurationSeconds = Number.isFinite(Number(selectedVideo?.durationSeconds))
        ? Number(selectedVideo.durationSeconds)
        : 0;

      if (editForm.file) {
        const durationSeconds = await getVideoDurationSecondsFromFile(editForm.file);
        const serverUrl = await uploadVideoToS3(editForm.file);
        const normalized = normalizeVideoUrlForApi(serverUrl);
        if (!normalized) throw new Error("Video upload did not return a valid URL");
        const resolvedHttpUrl = /^https?:\/\//i.test(normalized) ? normalized : await resolveS3HttpUrl(normalized);
        nextVideoUrl = resolvedHttpUrl || normalized;
        nextDurationSeconds = durationSeconds;
      }

      if (!nextVideoUrl) {
        throw new Error("videoUrl is required.");
      }

      const bodyParams = {
        title: nextTitle,
        description: nextDescription,
        videoUrl: nextVideoUrl,
        thumbnailUrl: String(selectedVideo?.thumbnailUrl || ""),
        durationSeconds: nextDurationSeconds,
        tags: Array.isArray(selectedVideo?.tags) ? selectedVideo.tags : [],
        isActive: typeof selectedVideo?.isActive === "boolean" ? selectedVideo.isActive : true,
      };

      console.log('Update BodyParams:', bodyParams);

      await new Promise((resolve, reject) => {
        callApi({
          method: Method.PATCH,
          endPoint: `${api.mindfulnessVideos}/${encodeURIComponent(String(selectedVideo.id))}`,
          bodyParams,
          onSuccess: (res) => resolve(res),
          onError: (err) => reject(new Error(err?.message || "Failed to update video. Please try again.")),
        });
      });

      closeEditModal();
      setShowVideoDetail(false);
      setSelectedVideo(null);
      void loadVideos();
    } catch (e) {
      setApiError(e?.message || "Failed to update video. Please try again.");
    } finally {
      setIsEditUploading(false);
    }
  };

  // Handle delete
  const handleDelete = (video) => {
    setSelectedVideo(video);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    setApiError("");
    if (!selectedVideo?.id) {
      setApiError("Unable to delete video. Missing video id.");
      return;
    }

    try {
      await new Promise((resolve, reject) => {
        callApi({
          method: Method.DELETE,
          endPoint: `${api.mindfulnessVideos}/${encodeURIComponent(String(selectedVideo.id))}`,
          onSuccess: (res) => resolve(res),
          onError: (err) => reject(new Error(err?.message || "Failed to delete video. Please try again.")),
        });
      });

      setShowDeleteModal(false);
      setSelectedVideo(null);
      setShowVideoDetail(false);
      void loadVideos();
    } catch (e) {
      setApiError(e?.message || "Failed to delete video. Please try again.");
    }
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-4">
          {/* {showVideoDetail && (
            <button
              onClick={handleBackToLibrary}
              className="text-gray-600 hover:text-gray-800 transition"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )} */}
          <h2 className="text-xl font-semibold text-gray-800">Video Library</h2>
        </div>
        {!showVideoDetail && (
          <button
            onClick={() => {
              setUploadForm({ title: "", description: "", file: null, fileName: "" });
              setUploadErrors({ title: false, description: false, file: false });
              setIsUploadAttempted(false);
              setApiError("");
              setShowUploadModal(true);
            }}
            className="bg-teal-600 text-white px-6 py-2 rounded-lg hover:bg-teal-700 transition flex items-center gap-2"
          >
            Upload Video
          </button>
        )}
      </div>

      {/* Content */}
      {showVideoDetail && selectedVideo ? (
        // Video Detail View
        <div>
          <div
            className="relative mb-6"
          >
            {selectedVideo.fileUrl ? (
              <video
                src={selectedVideo.fileUrl}
                controls
                playsInline
                preload="metadata"
                onError={() => setPlaybackError("Video failed to load. Please check the URL or permissions.")}
                className="w-full h-60 object-contain rounded-lg shadow-lg bg-black"
              />
            ) : (
              <div className="w-full h-60 rounded-lg shadow-lg bg-gray-100 flex items-center justify-center px-4 text-center text-sm text-gray-600">
                Video URL not available for preview
              </div>
            )}
          </div>
          {isResolvingPlayback ? (
            <div className="text-gray-600 text-sm mb-4">Loading video...</div>
          ) : playbackError ? (
            <div className="text-red-500 text-sm mb-4">{playbackError}</div>
          ) : null}

          {isInlineEditing ? (
            <>
              <div className="space-y-4">
                <div>
                  <label className="block text-[16px] font-semibold font-['Nunito'] leading-[20px] text-gray-700 mb-2">Title</label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Add Title"
                      value={editForm.title}
                      maxLength={60}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, title: e.target.value }))}
                      className="w-full px-3 py-2 border-0 rounded-lg focus:outline-none focus:ring-0 text-[16px] font-normal font-['Nunito'] leading-[20px] text-[#999CA0]"
                    />
                    <div className="text-right text-xs text-gray-400 mt-1">
                      {editForm.title.length}/60
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-[16px] font-semibold font-['Nunito'] leading-[20px] text-gray-700 mb-2">Description</label>
                  <div className="relative">
                    <textarea
                      placeholder="Add Description"
                      rows={4}
                      value={editForm.description}
                      maxLength={150}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, description: e.target.value }))}
                      className="w-full px-3 py-2 border-0 rounded-lg focus:outline-none focus:ring-0 resize-none text-[14px] font-normal font-['Nunito'] leading-[20px] text-[#999CA0]"
                    />
                    <div className="text-right text-xs text-gray-400 mt-1">
                      {editForm.description.length}/150
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:justify-end gap-4 mt-8">
                <button
                  onClick={() => handleDelete(selectedVideo)}
                  style={{ width: '312px', height: '50px', borderRadius: '12px', transform: 'rotate(0deg)', opacity: 1 }}
                  className="border border-teal-600 text-teal-600 hover:bg-teal-50 transition flex items-center justify-center font-['Nunito'] text-[16px] font-semibold"
                  type="button"
                >
                  Delete
                </button>
                <button
                  onClick={handleEditSubmit}
                  style={{ width: '312px', height: '50px', borderRadius: '12px', transform: 'rotate(0deg)', opacity: 1 }}
                  className={`bg-teal-600 text-white hover:bg-teal-700 transition flex items-center justify-center font-['Nunito'] text-[16px] font-semibold ${isEditUploading ? "opacity-70 pointer-events-none" : ""}`}
                  type="button"
                >
                  {isEditUploading ? "Uploading..." : "Save"}
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-gray-800 mb-1">Title</h3>
                <p className="text-gray-600 whitespace-pre-wrap break-all max-w-full">{selectedVideo.title}</p>
              </div>

              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-800 mb-1">Description</h3>
                <p className="text-gray-600 leading-relaxed whitespace-pre-wrap break-all max-w-full">{selectedVideo.description}</p>
              </div>

              <div className="flex flex-col sm:flex-row sm:justify-end gap-4 mt-8">
                <button
                  onClick={() => handleDelete(selectedVideo)}
                  style={{ width: '312px', height: '50px', borderRadius: '12px', transform: 'rotate(0deg)', opacity: 1 }}
                  className="border border-teal-600 text-teal-600 hover:bg-teal-50 transition flex items-center justify-center font-['Nunito'] text-[16px] font-semibold"
                  type="button"
                >
                  Delete
                </button>
                <button
                  onClick={() => handleEdit(selectedVideo)}
                  style={{ width: '312px', height: '50px', borderRadius: '12px', transform: 'rotate(0deg)', opacity: 1 }}
                  className="bg-teal-600 text-white hover:bg-teal-700 transition flex items-center justify-center font-['Nunito'] text-[16px] font-semibold"
                  type="button"
                >
                  Edit
                </button>
              </div>
            </>
          )}
        </div>
      ) : isLoadingVideos ? (
        <div className="flex flex-col items-center justify-center mt-20">
          <p className="text-gray-600 text-center text-sm font-medium">Loading videos...</p>
        </div>
      ) : videos.length === 0 ? (
        <div className="flex flex-col items-center justify-center mt-20">
          <p className="text-gray-600 text-center text-sm font-medium">
            There is no data here
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {videos.map((item) => (
            <button
              key={item.id}
              onClick={() => handleVideoClick(item)}
              className="group relative w-full overflow-hidden rounded-2xl bg-white shadow-md hover:shadow-lg transition-shadow text-left"
              type="button"
            >
              <div className="relative w-full h-44 bg-gray-100">
                {item.thumbnailUrl ? (
                  <img
                    src={item.thumbnailUrl}
                    alt={item.title || 'Video'}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                ) : item.fileUrl ? (
                  <video
                    src={item.fileUrl}
                    muted
                    playsInline
                    preload="metadata"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gray-200" />
                )}

                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-12 h-12 rounded-full bg-black/40 flex items-center justify-center">
                    <Play className="w-6 h-6 text-white" />
                  </div>
                </div>

                <div className="absolute inset-x-0 bottom-0">
                  <div className="h-16 bg-gradient-to-t from-black/70 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-3">
                    <div className="text-white text-sm font-medium truncate">
                      {item.title ? (item.title.length > 8 ? item.title.substring(0, 8) + '...' : item.title) : 'Title Here'}
                    </div>
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 backdrop-blur-sm bg-black/10 flex items-center justify-center p-4 z-50"
          onClick={closeUploadModal}>
          <div className="bg-white rounded-lg p-6 w-full max-w-md"
            onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Upload Video</h3>
              <button
                onClick={closeUploadModal}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-5 h-5" />

              </button>
            </div>

            <div className="space-y-4">
              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Add Title"
                    value={uploadForm.title}
                    maxLength={60}
                    onChange={(e) => handleUploadChange('title', e.target.value)}
                    className={`w-full px-3 py-2 border ${isUploadAttempted && uploadErrors.title ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500`}
                  />
                  <div className="text-right text-xs text-gray-400 mt-1">
                    {uploadForm.title.length}/60
                  </div>
                </div>
                {isUploadAttempted && uploadErrors.title && (
                  <p className="text-red-500 text-sm mt-1">Please enter a title</p>
                )}
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <div className="relative">
                  <textarea
                    placeholder="Add Description"
                    rows={4}
                    value={uploadForm.description}
                    maxLength={150}
                    onChange={(e) => handleUploadChange('description', e.target.value)}
                    className={`w-full px-3 py-2 border ${isUploadAttempted && uploadErrors.description ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none`}
                  />
                  <div className="text-right text-xs text-gray-400 mt-1">
                    {uploadForm.description.length}/150
                  </div>
                </div>
                {isUploadAttempted && uploadErrors.description && (
                  <p className="text-red-500 text-sm">Please enter a description</p>
                )}
              </div>

              {/* File Upload */}
              <div>
                <input
                  type="file"
                  accept="video/*"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="video-upload"
                  disabled={isCompressing}
                />
                <label
                  htmlFor="video-upload"
                  className={`w-full border-2 ${isUploadAttempted && !uploadForm.fileName && uploadErrors.file ? 'border-red-500' : 'border-dashed border-teal-300'} text-teal-600 px-4 py-3 rounded-lg hover:bg-teal-50 transition cursor-pointer flex items-center justify-center gap-2 ${isCompressing ? 'opacity-50 cursor-wait' : ''}`}
                >
                  {isCompressing ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Compressing... {compressionProgress}%
                    </>
                  ) : (
                    <>
                      <Upload className="w-5 h-5" />
                      {uploadForm.fileName || "Upload File"}
                    </>
                  )}
                </label>
                {isUploadAttempted && !uploadForm.fileName && uploadErrors.file && (
                  <p className="text-red-500 text-sm mt-1">Please upload a video file</p>
                )}
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={closeUploadModal}
                className="flex-1 border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleUploadSubmit}
                className={`flex-1 bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700 transition ${isUploading ? "opacity-70 pointer-events-none" : ""}`}
              >
                {isUploading ? "Uploading..." : "Upload Video"}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && (
        <div className="fixed inset-0 backdrop-blur-sm bg-black/10 flex items-center justify-center p-4 z-50"
          onClick={closeEditModal}>
          <div className="bg-white rounded-lg p-6 w-full max-w-md"
            onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              {/* <h3 className="text-[16px] font-semibold font-['Nunito'] leading-[20px]">Edit Video</h3> */}
              {/* <button
                onClick={closeEditModal}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button> */}
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-[16px] font-semibold font-['Nunito'] leading-[20px] text-gray-700 mb-2">Title</label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Add Title"
                    value={editForm.title}
                    maxLength={60}
                    onChange={(e) => setEditForm(prev => ({ ...prev, title: e.target.value }))}
                    className="w-full px-3 py-2 border-0 rounded-lg focus:outline-none focus:ring-0 text-[14px] font-normal font-['Nunito'] leading-[20px] text-[#999CA0]"
                  />
                  <div className="text-right text-xs text-gray-400 mt-1">
                    {editForm.title.length}/60
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[16px] font-semibold font-['Nunito'] leading-[20px] text-gray-700 mb-2">Description</label>
                <div className="relative">
                  <textarea
                    placeholder="Add Description"
                    rows={4}
                    value={editForm.description}
                    maxLength={150}
                    onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full px-3 py-2 border-0 rounded-lg focus:outline-none focus:ring-0 resize-none text-[14px] font-normal font-['Nunito'] leading-[20px] text-[#999CA0]"
                  />
                  <div className="text-right text-xs text-gray-400 mt-1">
                    {editForm.description.length}/150
                  </div>
                </div>
              </div>

              <div>
                {/* <label className="block text-[16px] font-semibold font-['Nunito'] leading-[20px] text-gray-700 mb-2">Change Video </label>
                <input
                  type="file"
                  accept="video/*"
                  onChange={handleEditFileUpload}
                  className="hidden"
                  id="edit-video-upload"
                /> */}
                {/* <label
                  htmlFor="edit-video-upload"
                  className="w-full border-2 border-dashed border-teal-300 text-teal-600 px-4 py-3 rounded-lg hover:bg-teal-50 transition cursor-pointer flex items-center justify-center gap-2 text-[14px] font-normal font-['Nunito']"
                >
                  <Upload className="w-5 h-5" />
                  {editForm.file ? editForm.fileName : (editForm.fileName ? editForm.fileName : "Upload New Video")}
                </label> */}
                {/* {editForm.fileName && !editForm.file && (
                  <p className="text-[14px] font-normal font-['Nunito'] leading-[20px] text-[#999CA0] mt-1">Current: {editForm.fileName}</p>
                )} */}
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={closeEditModal}
                className="flex-1 border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleEditSubmit}
                className={`flex-1 bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700 transition ${isEditUploading ? "opacity-70 pointer-events-none" : ""}`}
              >
                {isEditUploading ? "Uploading..." : "Save"}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Delete Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 backdrop-blur-sm bg-black/10 flex items-center justify-center p-4 z-50"
          onClick={() => setShowDeleteModal(false)}>
          <div className="bg-white rounded-lg p-6 w-full max-w-sm text-center"
            onClick={(e) => e.stopPropagation()}>
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-8 h-8 text-gray-600" />
            </div>

            <h3 className="text-lg font-semibold text-gray-800 mb-2">
              Are You Sure You Want To Delete This
            </h3>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 border border-teal-600 text-teal-600 px-4 py-2 rounded-lg hover:bg-teal-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700 transition"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoLibrary;
