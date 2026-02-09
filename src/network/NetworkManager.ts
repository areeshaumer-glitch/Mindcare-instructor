import axios, { AxiosError, AxiosResponse } from "axios";
import { api, BASE_URL } from "./Environment";
import { useAuthStore } from "../store/authSlice";

export const Method = {
  GET: "GET",
  POST: "POST",
  PUT: "PUT",
  DELETE: "DELETE",
  PATCH: "PATCH",
} as const;

export const Status = {
  SUCCESS: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  INTERNAL_SERVER_ERROR: 500,
} as const;

type HttpMethod = keyof typeof Method;

export type ApiResponse<T = any> = {
  status: number;
  message?: string;
  data?: T;
  errorType?: string;
};

interface ApiCallParams {
  method: HttpMethod;
  endPoint: string;
  bodyParams?: any;
  onSuccess?: (response: any) => void;
  onError?: (error: any) => void;
  count?: number;
  multipart?: boolean;
  headers?: Record<string, string>;
  responseType?: any;
  showToast?: boolean;
  timeout?: number;
}

// Configure axios defaults
const axiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 120000,
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
  },
});

axiosInstance.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token && config.url !== api.refreshToken) {
    config.headers = config.headers || {};
    config.headers['authorization'] = `Bearer ${token}`;
  }

  return config;
});

const refreshAccessToken = async (
  refreshToken: string
): Promise<string | null> => {
  try {
    const response = await axiosInstance.post(api.refreshToken, {
      refreshToken,
    });

    if (response.data?.accessToken) {
      return response.data.accessToken;
    }

    throw new Error("Failed to refresh token");
  } catch (error) {
    console.log("Error refreshing token:", error);
    return null;
  }
};

const handleAuthenticationError = (logout: () => void, message: string) => {
  console.warn("Auth Error:", message);
  logout();
};

let lastToast = { message: "", time: 0 };

export const emitToast = (message: string, type: "error" | "success" = "error") => {
  const now = Date.now();
  if (lastToast.message === message && now - lastToast.time < 1000) {
    return;
  }
  lastToast = { message, time: now };

  try {
    window.dispatchEvent(
      new CustomEvent("app:toast", { detail: { type, message } })
    );
  } catch { }
};

export const callApi = async ({
  method,
  endPoint,
  bodyParams,
  onSuccess,
  onError,
  count = 0,
  multipart = false,
  headers = {},
  responseType,
  showToast = true,
  timeout,
}: ApiCallParams): Promise<void> => {
  try {
    const token = useAuthStore.getState().token;

    let response: AxiosResponse<any>;

    const requestConfig: any = { headers };

    if (timeout) {
      requestConfig.timeout = timeout;
    }

    if (token) {
      requestConfig.headers = {
        ...requestConfig.headers,
        authorization: `Bearer ${token}`,
      };
    }
    if (responseType) {
      requestConfig.responseType = responseType;
    }
    if (multipart) {
      requestConfig.headers = {
        ...requestConfig.headers,
        "Content-Type": "multipart/form-data",
      };
    } else {
      requestConfig.headers = {
        ...requestConfig.headers,
        "Content-Type": "application/json",
      };
    }

    switch (method) {
      case "GET":
        response = await axiosInstance.get(endPoint, requestConfig);
        break;
      case "POST":
        response = await axiosInstance.post(endPoint, bodyParams, requestConfig);
        break;
      case "PUT":
        response = await axiosInstance.put(endPoint, bodyParams, requestConfig);
        break;
      case "PATCH":
        response = await axiosInstance.patch(endPoint, bodyParams, requestConfig);
        break;
      case "DELETE":
        response = await axiosInstance.delete(endPoint, requestConfig);
        break;
      default:
        throw new Error(`Unsupported method: ${method}`);
    }

    const responseData: any = response.data;

    if (responseType && responseType !== "json") {
      if (response.status >= 200 && response.status < 300) {
        onSuccess && onSuccess(responseData);
      } else {
        onError && onError(responseData);
      }
      return;
    }

    if (
      responseData?.message ===
      "User recently changed password please login again!"
    ) {
      handleAuthenticationError(useAuthStore.getState().logout, responseData.message);
      return;
    }

    if (response.status >= 200 && response.status < 300) {
      onSuccess && onSuccess(responseData);

      if (responseData?.errorType) {
        console.warn("API Warning:", responseData.errorType);
      } else if (responseData?.message) {
        console.log("API Message:", responseData.message);
        if (showToast) emitToast(responseData.message, "success");
      }
    } else {
      onError && onError(responseData);

      if (responseData?.errorType) {
        console.error("API Error Type:", responseData.errorType);
      } else if (responseData?.message) {
        console.error("API Error Message:", responseData.message);
      }
      const m =
        (responseData && (responseData.message || (responseData as any)?.data?.message)) ||
        "Request failed. Please try again.";
      if (showToast) emitToast(String(m));
    }
  } catch (error) {
    console.error("API Call Failed:", {
      endpoint: endPoint,
      method,
      bodyParams,
      error:
        error instanceof Error
          ? { message: error.message, name: error.name }
          : { message: String(error), name: "Unknown" },
    });

    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;

      if (axiosError.response?.status === 401) {
        const serverError = axiosError.response.data as ApiResponse;
        const message = serverError?.message?.toLowerCase() || "";

        // 🧩 Case 1: login error (wrong password or invalid credentials)
        if (
          endPoint.includes("auth/signin") &&
          (message.includes("password") ||
            message.includes("invalid credentials") ||
            serverError?.errorType === "INVALID_PASSWORD")
        ) {
          onError && onError({ message: "Incorrect password. Please try again." });
          if (showToast) emitToast("Incorrect password. Please try again.");
          return;
        }

        // 🧩 Case 2: token/session expired
        if (
          (message.includes("jwt expired") ||
            message.includes("token") ||
            message.includes("expired") ||
            message.includes("unauthorized")) &&
          count < 2 &&
          useAuthStore.getState().refreshToken
        ) {
          console.log("Token expired, attempting refresh...");
          const newAccessToken = await refreshAccessToken(
            useAuthStore.getState().refreshToken!
          );
          if (newAccessToken) {
            useAuthStore.getState().setToken(newAccessToken);
            return callApi({
              method,
              endPoint,
              bodyParams,
              onSuccess,
              onError,
              count: count + 1,
              multipart,
              headers,
              responseType,
            });
          }
        }

        // 🧩 Case 3: other 401 errors (like no token at all)
        handleAuthenticationError(
          useAuthStore.getState().logout,
          serverError?.message || "Authentication failed. Please login again."
        );
        if (showToast) emitToast(
          String(serverError?.message || "Authentication failed. Please login again.")
        );
        return;
      }

      if (axiosError.response?.status === 413) {
        onError &&
          onError({
            message: "File is too large. Please upload a smaller file.",
          });
        if (showToast) emitToast("File is too large. Please upload a smaller file.");
        return;
      }

      if (axiosError.response?.status === 400) {
        const serverError = axiosError.response.data as ApiResponse;
        const message = serverError?.message?.toLowerCase() || "";
        if (message.includes("no file uploaded")) {
          onError && onError({ message: "No file uploaded. Please select a file." });
          return;
        }
      }

      // ✅ Handle specific password / credentials errors
      if (axiosError.response?.data) {
        const serverError = axiosError.response.data as ApiResponse;
        const message = serverError?.message?.toLowerCase() || "";

        if (
          message.includes("instructor profile not found") ||
          serverError?.errorType === "INSTRUCTOR_PROFILE_NOT_FOUND"
        ) {
          onError && onError(serverError);
          return;
        }

        if (
          message.includes("password") ||
          message.includes("invalid credentials") ||
          serverError?.errorType === "INVALID_PASSWORD"
        ) {
          onError && onError({ message: "Incorrect password. Please try again." });
          if (showToast) emitToast("Incorrect password. Please try again.");
          return;
        }

        if (
          message.includes("phone") ||
          message.includes("user not found") ||
          serverError?.errorType === "USER_NOT_FOUND"
        ) {
          const identifier = String(
            (bodyParams && (bodyParams.identifier ?? bodyParams.email ?? bodyParams.phone)) ?? ""
          ).trim();
          const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier);
          const isPhone = /^\+?[0-9]{7,15}$/.test(identifier);
          const isSignin = endPoint.includes("auth/signin");

          if (isSignin && isEmail) {
            onError && onError({ message: "Invalid credentials" });
            if (showToast) emitToast("Invalid credentials");
            return;
          }
          if (isSignin && isPhone) {
            onError && onError({ message: "Invalid credentials" });
            if (showToast) emitToast("Invalid credentials");
            return;
          }

          onError && onError({ message: "Invalid user" });
          if (showToast) emitToast("Invalid user");
          return;
        }
      }

      if (axiosError.code === "ECONNABORTED") {
        onError &&
          onError({ message: "Request timed out. Please try again." });
        if (showToast) emitToast("Request timed out. Please try again.");
      } else if (
        axiosError.code === "NETWORK_ERROR" ||
        axiosError.message.includes("Network Error")
      ) {
        const isUpload = multipart || endPoint.includes("upload") || endPoint.includes("s3");
        const msg = isUpload
          ? "Upload failed. The file may be too large or your connection was interrupted."
          : "Network connection failed. Please check your internet connection.";
        
        onError && onError({ message: msg });
        if (showToast) emitToast(msg);
      } else if (axiosError.response) {
        const serverError = axiosError.response.data as ApiResponse;
        onError && onError(serverError);
        if (showToast) emitToast(String(serverError?.message || "Request failed. Please try again."));
      } else {
        onError && onError({ message: "Request failed. Please try again." });
        if (showToast) emitToast("Request failed. Please try again.");
      }
    } else {
      onError && onError({ message: "An unexpected error occurred." });
      if (showToast) emitToast("An unexpected error occurred.");
    }
  }
};

export const callApiLegacy = async (
  navigation: any,
  method: HttpMethod,
  endPoint: string,
  bodyParams?: any,
  onSuccess?: (response: ApiResponse) => void,
  onError?: (error: any) => void,
  count: number = 0,
  multipart: boolean = false
) => {
  if (!onSuccess || !onError) {
    throw new Error("onSuccess and onError callbacks are required");
  }

  return callApi({
    method,
    endPoint,
    bodyParams,
    onSuccess,
    onError,
    count,
    multipart,
  });
};
