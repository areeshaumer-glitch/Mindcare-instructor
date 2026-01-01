import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Calendar, ChevronDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Method, callApi } from '../../network/NetworkManager';
import { api } from '../../network/Environment';
import { useAuthStore } from '../../store/authSlice';

const TrackAttendence = () => {
  const navigate = useNavigate();
  const userData = useAuthStore((s) => s.userData);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [hasSelectedDate, setHasSelectedDate] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [rows, setRows] = useState([]);
  const [apiError, setApiError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [feedbackRow, setFeedbackRow] = useState(null);
  const [feedbackComment, setFeedbackComment] = useState('');
  const [feedbackError, setFeedbackError] = useState('');
  const [isSendingFeedback, setIsSendingFeedback] = useState(false);

  useEffect(() => {
    if (!isFeedbackOpen) return;
    const prevOverflow = document.body.style.overflow;
    const prevPaddingRight = document.body.style.paddingRight;
    const scrollBarWidth = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = 'hidden';
    if (scrollBarWidth > 0) {
      document.body.style.paddingRight = `${scrollBarWidth}px`;
    }
    return () => {
      document.body.style.overflow = prevOverflow;
      document.body.style.paddingRight = prevPaddingRight;
    };
  }, [isFeedbackOpen]);

  const instructorProfileId =
    userData?.profile?._id ||
    userData?.profileId ||
    userData?.instructorProfileId ||
    '';

  const toUtcYMD = useCallback((date) => {
    const utc = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    return utc.toISOString().slice(0, 10);
  }, []);

  const endDate = useMemo(() => toUtcYMD(selectedDate), [selectedDate, toUtcYMD]);
  const startDate = useMemo(() => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 29);
    return toUtcYMD(d);
  }, [selectedDate, toUtcYMD]);

  const buildSummaryEndpoint = useCallback(() => {
    const params = new URLSearchParams();
    if (startDate) params.set('startDate', startDate);
    if (endDate) params.set('endDate', endDate);
    const query = params.toString();
    return query ? `${api.attendanceSummary}?${query}` : api.attendanceSummary;
  }, [endDate, startDate]);

  const looksLikeId = useCallback((value) => {
    const raw = String(value || '').trim();
    if (!raw) return false;
    if (/^[a-f0-9]{24}$/i.test(raw)) return true;
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(raw))
      return true;
    return false;
  }, []);

  const findAppointmentId = useCallback(
    (value) => {
      const walk = (current, depth = 0) => {
        if (depth > 5) return '';
        if (!current) return '';
        if (typeof current === 'string' || typeof current === 'number') return '';
        if (Array.isArray(current)) {
          for (const item of current) {
            const found = walk(item, depth + 1);
            if (found) return found;
          }
          return '';
        }
        if (typeof current !== 'object') return '';

        const direct =
          current?.appointmentId ||
          current?.appointmentID ||
          current?.appointment_id ||
          current?.appointment?.id ||
          current?.appointment?._id ||
          current?.sessionId ||
          current?.sessionID ||
          current?.session_id ||
          '';
        if (direct && looksLikeId(direct)) return String(direct).trim();

        for (const [k, v] of Object.entries(current)) {
          const key = String(k || '').toLowerCase();
          if (key.includes('appointment') || key.includes('session')) {
            if ((typeof v === 'string' || typeof v === 'number') && looksLikeId(v)) return String(v).trim();
            if (v && typeof v === 'object') {
              const nestedDirect = v?.id || v?._id || v?.appointmentId || v?.sessionId || '';
              if (nestedDirect && looksLikeId(nestedDirect)) return String(nestedDirect).trim();
            }
          }
        }

        for (const nestedValue of Object.values(current)) {
          const found = walk(nestedValue, depth + 1);
          if (found) return found;
        }
        return '';
      };

      return walk(value, 0);
    },
    [looksLikeId],
  );

  const extractArrayFromApiResponse = (res) => {
    if (Array.isArray(res?.data)) return res.data;
    if (Array.isArray(res?.data?.data)) return res.data.data;
    if (Array.isArray(res?.result)) return res.result;
    if (Array.isArray(res?.payload)) return res.payload;
    return [];
  };

  const resolveAppointmentIdForUser = async (userId) => {
    const rawUserId = String(userId || '').trim();
    if (!rawUserId) return '';

    const params = new URLSearchParams();
    if (endDate) params.set('startDate', endDate);
    if (endDate) params.set('endDate', endDate);
    params.set('page', '1');
    params.set('limit', '50');
    params.set('userId', rawUserId);

    const endPoint = `${api.attendanceMeHistory}?${params.toString()}`;

    const res = await new Promise((resolve) => {
      callApi({
        method: Method.GET,
        endPoint,
        onSuccess: (data) => resolve(data),
        onError: () => resolve(null),
      });
    });

    const list = extractArrayFromApiResponse(res);
    for (const item of list) {
      const id = findAppointmentId(item);
      if (id) return id;
    }

    return findAppointmentId(res);
  };

  const loadAttendance = useCallback(async () => {
    setApiError('');
    setIsLoading(true);

    await callApi({
      method: Method.GET,
      endPoint: buildSummaryEndpoint(),
      onSuccess: (res) => {
        const list =
          (Array.isArray(res?.data) && res.data) ||
          (Array.isArray(res?.data?.data) && res.data.data) ||
          (Array.isArray(res?.result) && res.result) ||
          (Array.isArray(res?.payload) && res.payload) ||
          [];

        const mappedRows = list.map((item, index) => ({
          key: item?.userId || item?._id || item?.id || String(index),
          userId: item?.userId || item?.user?._id || item?.user?.id || item?._id || item?.id || '',
          appointmentId: findAppointmentId(item),
          name: item?.name || item?.user?.name || 'Name Here',
          avatar: item?.avatar || item?.profileImage || item?.image || '',
          absentPct: Number(item?.stats?.percentAbsent ?? 0),
          gymPct: Number(item?.stats?.percentGym ?? 0),
          homePct: Number(item?.stats?.percentHome ?? 0),
        }));

        setRows(mappedRows);
      },
      onError: (err) => {
        setRows([]);
        setApiError(err?.message || 'Failed to load attendance summary. Please try again.');
      },
    });

    setIsLoading(false);
  }, [buildSummaryEndpoint, findAppointmentId]);

  const generateCalendar = () => {
    const year = selectedDate.getFullYear();
    const month = selectedDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }

    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(day);
    }

    return days;
  };

  const handleDateSelect = (day) => {
    if (day) {
      const newDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), day);
      setSelectedDate(newDate);
      setHasSelectedDate(true);
      setShowCalendar(false);
    }
  };

  const navigateMonth = (direction) => {
    const newDate = new Date(selectedDate);
    newDate.setMonth(newDate.getMonth() + direction);
    setSelectedDate(newDate);
  };

  const openFeedback = (row) => {
    setFeedbackRow(row || null);
    setFeedbackComment('');
    setFeedbackError('');
    setIsSendingFeedback(false);
    setIsFeedbackOpen(true);
  };

  const closeFeedback = () => {
    setIsFeedbackOpen(false);
    setFeedbackRow(null);
    setFeedbackComment('');
    setFeedbackError('');
    setIsSendingFeedback(false);
  };

  const handleSendFeedback = async () => {
    setFeedbackError('');

    const comment = String(feedbackComment || '').trim();
    if (!comment) {
      setFeedbackError('Please add feedback.');
      return;
    }

    if (!String(instructorProfileId || '').trim()) {
      setFeedbackError('Unable to submit feedback. Missing instructor profile id.');
      return;
    }

    setIsSendingFeedback(true);
    try {
      const userId = String(feedbackRow?.userId || feedbackRow?.key || '').trim();
      let appointmentId = String(feedbackRow?.appointmentId || '').trim();

      if (!appointmentId && userId) {
        appointmentId = await resolveAppointmentIdForUser(userId);
      }

      const appointmentIdToSend = String(appointmentId || '').trim();
      if (!appointmentIdToSend) {
        setFeedbackError('Appointment not found.');
        return;
      }

      const bodyParams = {
        type: 'session',
        comment,
        rating: 4,
        appointmentId: appointmentIdToSend,
        instructorProfileId,
      };

      await new Promise((resolve, reject) => {
        callApi({
          method: Method.POST,
          endPoint: api.feedback,
          bodyParams,
          onSuccess: (res) => resolve(res),
          onError: (err) => reject(new Error(err?.message || 'Failed to submit feedback. Please try again.')),
        });
      });

      closeFeedback();
    } catch (e) {
      setFeedbackError(e?.message || 'Failed to submit feedback. Please try again.');
    } finally {
      setIsSendingFeedback(false);
    }
  };

  useEffect(() => {
    void loadAttendance();
  }, [loadAttendance]);

  return (
    <>
      <div className=" bg-white p-4 rounded-2xl">
        <div className="w-full mx-auto">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
            <h1 className="text-2xl md:text- font-semibold text-teal-600">Track Attendance </h1>

            {/* Date Selector */}
            <div className="relative">
              <button
                onClick={() => setShowCalendar(!showCalendar)}
                className="flex items-center justify-between gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50 transition-colors min-w-[220px]"
              >
                <span className={hasSelectedDate ? "text-gray-700 font-medium" : "text-gray-500"}>
                  {hasSelectedDate
                    ? selectedDate.toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    })
                    : 'Select Date'
                  }
                </span>
                <Calendar className="w-4 h-4 text-gray-500" />
              </button>

              {/* Calendar Dropdown */}
              {showCalendar && (
                <div className="absolute right-0 top-full mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-10 p-4 w-80">
                  {/* Calendar Header */}
                  <div className="flex items-center justify-between mb-4">
                    <button
                      onClick={() => navigateMonth(-1)}
                      className="p-1 hover:bg-gray-100 rounded"
                    >
                      <ChevronDown className="w-4 h-4 rotate-90" />
                    </button>
                    <h3 className="font-semibold">
                      {selectedDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                    </h3>
                    <button
                      onClick={() => navigateMonth(1)}
                      className="p-1 hover:bg-gray-100 rounded"
                    >
                      <ChevronDown className="w-4 h-4 -rotate-90" />
                    </button>
                  </div>

                  {/* Calendar Grid */}
                  <div className="grid grid-cols-7 gap-1 mb-2">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                      <div key={day} className="text-center text-xs font-medium text-gray-500 py-2">
                        {day}
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-7 gap-1">
                    {generateCalendar().map((day, index) => (
                      <button
                        key={index}
                        onClick={() => handleDateSelect(day)}
                        className={`h-8 text-sm rounded hover:bg-teal-100 transition-colors ${day === selectedDate.getDate() ? 'bg-teal-600 text-white hover:bg-teal-700' :
                          day ? 'text-gray-700 hover:bg-gray-100' : ''
                          }`}
                        disabled={!day}
                      >
                        {day}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Attendance Table */}
          <div className="bg-white">
            <div className="overflow-x-auto">
              <div className="min-w-[760px]">
                <div className="bg-teal-600 text-white rounded-xl">
                  <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr] gap-4 p-4 font-semibold text-lg">
                    <div className="text-left">Name</div>
                    <div className="text-center">Absent</div>
                    <div className="text-center">Attend from Gym</div>
                    <div className="text-center whitespace-nowrap">Attend from home</div>
                    <div />
                  </div>
                </div>

                <div className="divide-y divide-gray-100">
                  {isLoading ? (
                    <div className="p-6 text-center text-gray-600">Loading...</div>
                  ) : rows.length === 0 ? (
                    <div className="p-6 text-center text-gray-600">No attendance records found.</div>
                  ) : (
                    rows.map((row) => (
                      <div key={row.key} className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr] gap-4 p-6 items-center">
                        <div className="text-left">
                          <div className="flex items-center gap-3 min-w-0">
                            {row?.avatar ? (
                              <img
                                src={row.avatar}
                                alt="Avatar"
                                className="w-8 h-8 rounded-full object-cover"
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center text-white text-xs font-semibold">
                                {String(row?.name || 'N').trim().charAt(0).toUpperCase()}
                              </div>
                            )}
                            <p className="font-medium text-gray-700 text-lg truncate">{row?.name || 'Name Here'}</p>
                          </div>
                        </div>

                        <div className="text-center">
                          <span className="text-gray-600 text-lg">{row.absentPct}%</span>
                        </div>

                        <div className="text-center">
                          <span className="text-gray-600 text-lg">{row.gymPct}%</span>
                        </div>

                        <div className="text-center">
                          <span className="text-gray-600 text-lg">{row.homePct}%</span>
                        </div>

                        <div className="text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button onClick={() => openFeedback(row)} className="text-teal-600 text-sm hover:underline">
                              Feedback
                            </button>
                            <button
                              onClick={() =>
                                navigate('/home/attendance-history', {
                                  state: {
                                    member: row,
                                    startDate,
                                    endDate,
                                  },
                                })
                              }
                              className="text-teal-600 text-sm hover:underline"
                            >
                              Old History
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {isFeedbackOpen ? (
        <div
          className="fixed inset-0 bg-black/20 flex items-center justify-center z-50 p-4"
          onClick={closeFeedback}
        >
          <div
            className="bg-white rounded-xl shadow-lg w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="text-base font-medium text-gray-900 mb-4">Feedback</div>

              <textarea
                placeholder="Add Feedback"
                className="w-full p-4 border border-gray-300 rounded-lg mb-4 min-h-[120px] resize-none focus:outline-none focus:ring-2 focus:ring-teal-500"
                value={feedbackComment}
                onChange={(e) => setFeedbackComment(e.target.value)}
              />

              {feedbackError ? (
                <div className="text-sm text-red-600 mb-4">{feedbackError}</div>
              ) : null}

              <button
                type="button"
                onClick={handleSendFeedback}
                disabled={isSendingFeedback}
                className={`block ml-auto w-40 px-[56px] py-2 rounded-full transition ${isSendingFeedback ? 'bg-teal-400 text-white cursor-not-allowed' : 'bg-teal-600 text-white hover:bg-teal-700'
                  }`}
              >
                {isSendingFeedback ? 'Sending...' : 'Send'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
};

export default TrackAttendence;
