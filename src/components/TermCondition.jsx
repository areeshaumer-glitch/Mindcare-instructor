import { useEffect, useMemo, useState } from "react";
import { Method, callApi } from "../network/NetworkManager";
import { api } from "../network/Environment";

const extractText = (value, preferredLanguage) => {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) {
    const parts = value
      .map((item) => extractText(item, preferredLanguage))
      .map((v) => String(v || "").trim())
      .filter(Boolean);
    return parts.join("\n\n");
  }
  if (!value || typeof value !== "object") return "";

  const language = String(preferredLanguage || "en").trim() || "en";
  const languageValue = extractText(value?.[language], preferredLanguage);
  if (languageValue) return languageValue;
  const enValue = extractText(value?.en, preferredLanguage);
  if (enValue) return enValue;

  const preferredKeys = [
    "content",
    "termsAndConditions",
    "terms",
    "text",
    "html",
    "description",
    "body",
    "value",
    "data",
    "result",
    "payload",
  ];

  for (const key of preferredKeys) {
    if (Object.prototype.hasOwnProperty.call(value, key)) {
      const extracted = extractText(value[key], preferredLanguage);
      if (extracted) return extracted;
    }
  }

  for (const nestedValue of Object.values(value)) {
    const extracted = extractText(nestedValue, preferredLanguage);
    if (extracted) return extracted;
  }

  return "";
};

const TermCondition = () => {
  const [terms, setTerms] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const acceptLanguage = useMemo(() => {
    const raw = typeof navigator !== "undefined" ? navigator.language : "en";
    const normalized = String(raw || "en").split("-")[0];
    return normalized || "en";
  }, []);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    setErrorMessage("");

    void callApi({
      method: Method.GET,
      endPoint: api.termsAndConditions,
      headers: {
        "Accept-Language": acceptLanguage,
      },
      onSuccess: (res) => {
        if (!isMounted) return;
        const payload = res?.data?.data ?? res?.data ?? res ?? null;
        const normalized = String(extractText(payload, acceptLanguage) || "").trim();
        setTerms(normalized ? [normalized] : []);
        setIsLoading(false);
      },
      onError: (err) => {
        if (!isMounted) return;
        const message =
          err?.message ||
          err?.data?.message ||
          err?.response?.data?.message ||
          "Failed to load terms and conditions";
        setTerms([]);
        setErrorMessage(message);
        setIsLoading(false);
      },
    });

    return () => {
      isMounted = false;
    };
  }, [acceptLanguage]);

  return (
    <div className="prose max-w-none text-sm text-gray-700 px-4 py-6">
      <h2 className="text-center text-lg font-semibold mb-4">Term & Condition</h2>
      {isLoading && <p className="text-[#92979D]">Loading...</p>}
      {!isLoading && !!errorMessage && <p className="text-red-600">{errorMessage}</p>}
      {!isLoading && !errorMessage && terms.length === 0 && (
        <p className="text-[#92979D]">No terms found.</p>
      )}
      {terms.map((term, idx) => (
        <p className="text-[#92979D] whitespace-pre-line" key={idx}>
          {term}
        </p>
      ))}
    </div>
  );
};

export default TermCondition;
