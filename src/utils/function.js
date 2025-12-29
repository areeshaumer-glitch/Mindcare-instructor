import { api } from "../network/Environment";
import { callApi, Method } from "../network/NetworkManager";

export const getProfilePicture = (profilePicture, fallback) => {
  const PLACEHOLDER_URL =
    " `https://upload.wikimedia.org/wikipedia/commons/8/89/Portrait_Placeholder.png` ";

  const isEmulatedOrExample =
    typeof profilePicture === "string" &&
    (profilePicture.includes("example") || profilePicture.includes("emulated"));

  if (!profilePicture) return fallback;
  if (isEmulatedOrExample) return PLACEHOLDER_URL;

  return profilePicture;
};

const getUploadedKeyOrUrlFromResponse = (response) => {
  return (
    response?.url ||
    response?.fileUrl ||
    response?.location ||
    response?.publicUrl ||
    response?.key ||
    response?.data?.url ||
    response?.data?.fileUrl ||
    response?.data?.location ||
    response?.data?.publicUrl ||
    response?.data?.key ||
    response?.data?.url ||
    response?.data?.fileUrl ||
    response?.data?.location ||
    response?.data?.publicUrl ||
    response?.data?.key ||
    response?.data?.data?.url ||
    response?.data?.data?.fileUrl ||
    response?.data?.data?.location ||
    response?.data?.data?.publicUrl ||
    response?.data?.data?.key ||
    ""
  );
};

export const uploadImageOnS3 = async ({ file, onError, onSuccess }) => {
  const formData = new FormData();
  formData.append("file", file);

  await callApi({
    method: Method.POST,
    endPoint: api.s3Upload,
    bodyParams: formData,
    multipart: true,
    onSuccess: (res) => {
      const keyOrUrl = getUploadedKeyOrUrlFromResponse(res);
      onSuccess && onSuccess(keyOrUrl);
    },
    onError: (err) => {
      onError && onError(err);
    },
  });
};

export const uploadVideoOnS3 = async ({ file, onError, onSuccess }) => {
  const formData = new FormData();
  formData.append("file", file);

  await callApi({
    method: Method.POST,
    endPoint: api.s3Upload,
    bodyParams: formData,
    multipart: true,
    onSuccess: (res) => {
      const keyOrUrl = getUploadedKeyOrUrlFromResponse(res);
      onSuccess && onSuccess(keyOrUrl);
    },
    onError: (err) => {
      onError && onError(err);
    },
  });
};

const extractS3Files = (response) => {
  const candidates = [
    response,
    response?.data,
    response?.data?.data,
    response?.items,
    response?.data?.items,
    response?.files,
    response?.data?.files,
    response?.data?.data?.files,
    response?.fileList,
    response?.data?.fileList,
    response?.data?.data?.fileList,
    response?.keys,
    response?.data?.keys,
    response?.data?.data?.keys,
    response?.contents,
    response?.data?.contents,
    response?.data?.data?.contents,
    response?.Contents,
    response?.data?.Contents,
    response?.data?.data?.Contents,
    response?.data?.data?.data,
  ];

  for (const value of candidates) {
    if (Array.isArray(value)) return value;
  }

  const nestedCandidates = [
    response?.data?.result,
    response?.data?.data?.result,
    response?.result,
    response?.payload,
    response?.data?.payload,
  ];

  for (const value of nestedCandidates) {
    if (Array.isArray(value)) return value;
    if (Array.isArray(value?.items)) return value.items;
    if (Array.isArray(value?.files)) return value.files;
    if (Array.isArray(value?.data)) return value.data;
  }

  return [];
};

export const listS3Files = async ({ onError, onSuccess }) => {
  await callApi({
    method: Method.GET,
    endPoint: api.s3List,
    onSuccess: (res) => {
      onSuccess && onSuccess(extractS3Files(res));
    },
    onError: (err) => {
      onError && onError(err);
    },
  });
};
