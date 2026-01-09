import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { Calendar, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Method, callApi, emitToast } from '../../network/NetworkManager';
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
  const calendarRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (calendarRef.current && !calendarRef.current.contains(event.target)) {
        setShowCalendar(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const [currentPage, setCurrentPage] = useState(1);
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

  const extractArrayFromApiResponse = (res) => {
    if (Array.isArray(res)) return res;
    if (Array.isArray(res?.data)) return res.data;
    if (Array.isArray(res?.data?.data)) return res.data.data;
    if (Array.isArray(res?.items)) return res.items;
    if (Array.isArray(res?.data?.items)) return res.data.items;
    if (Array.isArray(res?.docs)) return res.docs;
    if (Array.isArray(res?.data?.docs)) return res.data.docs;
    if (Array.isArray(res?.result)) return res.result;
    if (Array.isArray(res?.payload)) return res.payload;
    return [];
  };

  const loadAttendance = useCallback(async () => {
    setApiError('');
    setIsLoading(true);

    await callApi({
      method: Method.GET,
      endPoint: buildSummaryEndpoint(),
      onSuccess: (res) => {
        const list = extractArrayFromApiResponse(res);

        const mappedRows = list.map((item, index) => ({
          key: item?.userId || item?._id || item?.id || String(index),
          userId: item?.userId || item?.user?._id || item?.user?.id || item?._id || item?.id || '',
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
  }, [buildSummaryEndpoint]);

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
      emitToast('Please add feedback.', 'error');
      return;
    }

    if (!String(instructorProfileId || '').trim()) {
      emitToast('Unable to submit feedback. Missing instructor profile id.', 'error');
      return;
    }

    setIsSendingFeedback(true);
    try {
      const bodyParams = {
        type: 'gym',
        comment,
        rating: 4,
        instructorProfileId,
      };

      await new Promise((resolve, reject) => {
        callApi({
          method: Method.POST,
          endPoint: api.feedback,
          bodyParams,
          showToast: false,
          onSuccess: (res) => {
            emitToast('Feedback submitted', 'success');
            resolve(res);
          },
          onError: (err) => reject(new Error(err?.message || 'Failed to submit feedback. Please try again.')),
        });
      });

      closeFeedback();
    } catch (e) {
      emitToast(e?.message || 'Failed to submit feedback. Please try again.', 'error');
    } finally {
      setIsSendingFeedback(false);
    }
  };

  useEffect(() => {
    void loadAttendance();
  }, [loadAttendance]);

  useEffect(() => {
    setCurrentPage(1);
  }, [rows]);

  const ITEMS_PER_PAGE = 10;
  const totalPages = Math.ceil(rows.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const currentRows = rows.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  return (
    <>
      <div className=" bg-white p-4 rounded-2xl">
        <div className="w-full mx-auto">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
            <h1 className="text-2xl md:text- font-semibold" style={{ color: "#008080" }}>Track Attendance </h1>

            {/* Date Selector */}
            <div className="relative" ref={calendarRef}>
              <button
                onClick={() => setShowCalendar(!showCalendar)}
                className="flex items-center justify-between gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50 transition-colors min-w-[220px] focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0"
                style={{ outline: 'none', boxShadow: 'none' }}
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
                      className="p-1 hover:bg-gray-100 rounded focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0"
                      style={{ outline: 'none', boxShadow: 'none' }}
                    >
                      <ChevronDown className="w-4 h-4 rotate-90" />
                    </button>
                    <h3 className="font-semibold">
                      {selectedDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                    </h3>
                    <button
                      onClick={() => navigateMonth(1)}
                      className="p-1 hover:bg-gray-100 rounded focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0"
                      style={{ outline: 'none', boxShadow: 'none' }}
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
                    {generateCalendar().map((day, index) => {
                      const dateToCheck = day ? new Date(selectedDate.getFullYear(), selectedDate.getMonth(), day) : null;
                      const today = new Date();
                      today.setHours(0, 0, 0, 0);
                      const isFuture = dateToCheck && dateToCheck > today;

                      return (
                        <button
                          key={index}
                          onClick={() => handleDateSelect(day)}
                          className={`h-8 text-sm rounded transition-colors ${
                            hasSelectedDate && day === selectedDate.getDate()
                              ? 'bg-[#008080] text-white hover:opacity-90'
                              : day
                              ? isFuture
                                ? 'text-gray-300 cursor-default pointer-events-none'
                                : 'text-gray-700 hover:bg-gray-100 hover:bg-[#00808020]'
                              : ''
                          } focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0`}
                          style={{ outline: 'none', boxShadow: 'none' }}
                          disabled={!day || isFuture}
                        >
                          {day}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Attendance Table */}
          <div className="bg-white">
            <div className="overflow-x-auto pb-2">
              <div className="min-w-[1000px] lg:min-w-0">
                <div className="text-white rounded-xl" style={{ backgroundColor: "#008080" }}>
                  <div className="grid grid-cols-[1.2fr_0.8fr_1fr_1fr_1fr] gap-4 p-4 font-semibold text-lg whitespace-nowrap">
                    <div className="text-left">Name</div>
                    <div className="text-left">Absent</div>
                    <div className="text-left">Attend from Gym</div>
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
                    currentRows.map((row) => (
                      <div key={row.key} className="grid grid-cols-[1.2fr_0.8fr_1fr_1fr_1fr] gap-4 p-6 items-center">
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
                            <p
                              className="font-medium text-gray-700 text-lg truncate"
                              title={row?.name || ''}
                            >
                              {row?.name && row.name.length > 13
                                ? row.name.substring(0, 13) + "..."
                                : (row?.name || 'Name Here')}
                            </p>
                          </div>
                        </div>

                        <div className="text-left">
                          <span className="text-gray-600 text-lg ml-2">{row.absentPct}%</span>
                        </div>

                        <div className="text-left">
                          <span className="text-gray-600 text-lg ml-6">{row.gymPct}%</span>
                        </div>

                        <div className="text-center">
                          <span className="text-gray-600 text-lg">{row.homePct}%</span>
                        </div>

                        <div className="text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button onClick={() => openFeedback(row)} className="text-sm hover:underline" style={{ color: "#008080" }}>
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
                              className="text-sm hover:underline"
                              style={{ color: "#008080" }}
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

            {/* Pagination Controls */}
            {rows.length > 0 && (
              <div className="flex items-center justify-end px-6 py-4 border-t border-gray-100 gap-4">
                <span className="text-sm text-gray-600">
                  Page {currentPage} of {totalPages}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className={`p-2 rounded-lg border transition-colors ${
                      currentPage === 1
                        ? 'border-gray-200 text-gray-400 cursor-not-allowed'
                        : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <ChevronLeft size={20} />
                  </button>
                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className={`p-2 rounded-lg border transition-colors ${
                      currentPage === totalPages
                        ? 'border-gray-200 text-gray-400 cursor-not-allowed'
                        : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <ChevronRight size={20} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {isFeedbackOpen ? (
        <div
          className="fixed inset-0 backdrop-blur-sm bg-black/10 flex items-center justify-center z-50 p-4"
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
                className="w-full p-4 border border-gray-300 rounded-lg mb-4 min-h-[150px] resize-none focus:outline-none focus:ring-2 focus:ring-teal-500"
                value={feedbackComment}
                onChange={(e) => setFeedbackComment(e.target.value)}
              />



              <button
                type="button"
                onClick={handleSendFeedback}
                disabled={isSendingFeedback}
                className={`block ml-auto w-[244px] h-[48px] rounded-full transition ${isSendingFeedback ? 'opacity-50 text-white cursor-not-allowed' : 'text-white hover:opacity-90'
                  }`}
                style={{ backgroundColor: "#008080" }}
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
