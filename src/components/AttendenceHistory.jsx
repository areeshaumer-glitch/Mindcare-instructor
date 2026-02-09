import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { ChevronDown } from 'lucide-react';
import images from '../assets/Images';
import { useLocation } from 'react-router-dom';
import { Method, callApi, emitToast } from '../network/NetworkManager';
import { api } from '../network/Environment';

const AttendenceHistory = ({ member: memberProp, startDate: startDateProp, endDate: endDateProp }) => {
  const location = useLocation();
  const navigationState = location?.state || {};
  const member = memberProp ?? navigationState.member ?? null;

  const [rows, setRows] = useState([]);
  const [apiError, setApiError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const calendarRef = useRef(null);

  const [rangeStart, setRangeStart] = useState(null);
  const [rangeEnd, setRangeEnd] = useState(null);
  const [viewAll, setViewAll] = useState(true);
  const [hasSelectedRange, setHasSelectedRange] = useState(false);
  
  // Keep track of applied range to restore if cancelled
  const [appliedRangeStart, setAppliedRangeStart] = useState(null);
  const [appliedRangeEnd, setAppliedRangeEnd] = useState(null);
  const [appliedViewAll, setAppliedViewAll] = useState(true);
  const [appliedHasSelectedRange, setAppliedHasSelectedRange] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);

  useEffect(() => {
    function handleClickOutside(event) {
      if (calendarRef.current && !calendarRef.current.contains(event.target)) {
        if (showCalendar) {
           // Reset to applied state on close
           setRangeStart(appliedRangeStart);
           setRangeEnd(appliedRangeEnd);
           setViewAll(appliedViewAll);
           setHasSelectedRange(appliedHasSelectedRange);
           setShowCalendar(false);
        }
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showCalendar, appliedRangeStart, appliedRangeEnd, appliedViewAll, appliedHasSelectedRange]);

  const toUtcYMD = useCallback((date) => {
    const utc = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    return utc.toISOString().slice(0, 10);
  }, []);

  const formatRangeDate = (date) =>
    date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

  const queryStartDate = useMemo(() => {
    if (viewAll) return '2024-01-01'; // Default start date for "All" history
    if (hasSelectedRange && rangeStart) return toUtcYMD(rangeStart);
    return null;
  }, [viewAll, hasSelectedRange, rangeStart, toUtcYMD]);

  const queryEndDate = useMemo(() => {
    if (viewAll) return toUtcYMD(new Date()); // Default end date for "All" history
    if (hasSelectedRange && rangeEnd) return toUtcYMD(rangeEnd);
    return null;
  }, [viewAll, hasSelectedRange, rangeEnd, toUtcYMD]);

  const buildHistoryEndpoint = useCallback(() => {
    const params = new URLSearchParams();
    if (queryStartDate) params.set('startDate', queryStartDate);
    if (queryEndDate) params.set('endDate', queryEndDate);
    params.set('page', '1');
    params.set('limit', '1000');
    
    if (member?.key) {
      // Use trainerId filter as this is for a specific member's history
      params.set('trainerId', String(member.key));
    }
    return `${api.attendanceTrainersSummary}?${params.toString()}`;
  }, [member?.key, queryEndDate, queryStartDate]);

  const loadHistory = useCallback(async () => {
    setApiError('');
    setIsLoading(true);

    await callApi({
      method: Method.GET,
      endPoint: buildHistoryEndpoint(),
      onSuccess: (res) => {
        let dataList = [];
        if (Array.isArray(res?.data)) dataList = res.data;
        else if (Array.isArray(res?.data?.data)) dataList = res.data.data;
        else if (Array.isArray(res)) dataList = res;

        const newRows = dataList.map((item) => {
           const stats = item?.stats || {};
           return {
             key: item.trainerId || member?.key || 'me',
             name: item.name || member?.name || 'Me',
             gymPct: stats.percentGym ?? 0,
             homePct: stats.percentHome ?? 0,
             absentPct: stats.percentAbsent ?? 0,
           };
        });

        if (newRows.length === 0 && member) {
           // Fallback if no data found but we have a member context, maybe show empty stats or just empty list
           // For now, let's just show empty list which will trigger "No attendance records found"
           setRows([]);
        } else {
           setRows(newRows);
        }
      },
      onError: (err) => {
        setRows([]);
        setApiError(err?.message || 'Failed to load attendance history. Please try again.');
      },
    });

    setIsLoading(false);
  }, [buildHistoryEndpoint, member]);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]); // loadHistory depends on buildHistoryEndpoint which depends on dates

  return (
    <>
      <div className="bg-white p-4 rounded-2xl">
        <div className="w-full mx-auto">
          {/* Header */}
          <div className="flex justify-between items-center mb-6 gap-4">
            <h1 className="text-2xl font-semibold" style={{ color: "#008080" }}>Attendance History</h1>

            {/* Date Selector */}
            <div className="relative" ref={calendarRef}>
              <button
                onClick={() => {
                    setRangeStart(appliedRangeStart);
                    setRangeEnd(appliedRangeEnd);
                    setViewAll(appliedViewAll);
                    setHasSelectedRange(appliedHasSelectedRange);
                    setShowCalendar(!showCalendar)
                }}
                className="w-[326px] h-[60px] rounded-[16px] opacity-100 flex items-center justify-between px-4 bg-[#F9FAFB] border border-gray-200 shadow-sm hover:bg-gray-50 transition-colors focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0"
                style={{ outline: 'none', boxShadow: 'none' }}
              >
                <span className="text-gray-700 text-base truncate">
                  {viewAll
                    ? 'Select Dates'
                    : hasSelectedRange && rangeStart && rangeEnd
                    ? `${formatRangeDate(rangeStart)} - ${formatRangeDate(rangeEnd)}`
                    : 'Select Dates'
                  }
                </span>
                <img src={images.calendar} alt="Calendar" className="w-5 h-5" />
              </button>

              {/* Calendar Dropdown */}
              {showCalendar && (
                <div className="absolute right-0 top-full mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-10 p-4 w-[326px]">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="view-all-checkbox-history"
                        checked={viewAll}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setViewAll(true);
                            setRangeStart(null);
                            setRangeEnd(null);
                            setHasSelectedRange(false);
                          } else {
                            if (!rangeStart || !rangeEnd) {
                              emitToast('Please select the dates', 'error');
                            } else {
                              setViewAll(false);
                            }
                          }
                        }}
                        className="w-4 h-4 text-teal-600 border-gray-300 rounded focus:ring-teal-500"
                      />
                      <label htmlFor="view-all-checkbox-history" className="text-sm font-medium text-gray-700">
                        All
                      </label>
                    </div>

                    <div className="flex flex-col gap-2">
                      <label className="text-sm text-gray-700">Start Date</label>
                      <input
                        type="date"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        value={rangeStart ? toUtcYMD(rangeStart) : ''}
                        max={toUtcYMD(new Date())}
                        onChange={(e) => {
                          const v = e.target.value;
                          const d = v ? new Date(v) : null;
                          setRangeStart(d);
                          if (d && rangeEnd) {
                            setViewAll(false);
                          }
                        }}
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="text-sm text-gray-700">End Date</label>
                      <input
                        type="date"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        value={rangeEnd ? toUtcYMD(rangeEnd) : ''}
                        max={toUtcYMD(new Date())}
                        onChange={(e) => {
                          const v = e.target.value;
                          const d = v ? new Date(v) : null;
                          setRangeEnd(d);
                          if (rangeStart && d) {
                            setViewAll(false);
                          }
                        }}
                      />
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                      <button
                        type="button"
                        className="w-full h-[40px] opacity-100 px-4 py-1 rounded-lg bg-teal-700 text-white hover:bg-teal-800"
                        onClick={() => {
                          if (viewAll) {
                            setAppliedViewAll(true);
                            setAppliedRangeStart(null);
                            setAppliedRangeEnd(null);
                            setAppliedHasSelectedRange(false);
                            setShowCalendar(false);
                            return;
                          }

                          const today = new Date();
                          const startOk = !!rangeStart && rangeStart <= today;
                          const endOk = !!rangeEnd && rangeEnd <= today;
                          const orderOk =
                            !!rangeStart && !!rangeEnd && rangeStart <= rangeEnd;
                          if (startOk && endOk && orderOk) {
                            setHasSelectedRange(true);
                            setAppliedHasSelectedRange(true);
                            setAppliedRangeStart(rangeStart);
                            setAppliedRangeEnd(rangeEnd);
                            setAppliedViewAll(false);

                            setShowCalendar(false);
                            setViewAll(false);
                          } else {
                            emitToast(
                              'Please select past dates with start before end.',
                              'error'
                            );
                          }
                        }}
                      >
                        Apply
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="rounded-xl overflow-hidden ">
            <div className="overflow-x-auto">
              <div className="min-w-[560px]">
                <div className="text-white rounded-xl" style={{ backgroundColor: "#008080" }}>
                  <div className="grid grid-cols-4 gap-4 px-10 py-4 font-semibold text-lg">
                    <div className="text-left">Name</div>
                    <div className="text-center">Gym</div>
                    <div className="text-center">Home</div>
                    <div className="text-right">Absent</div>
                  </div>
                </div>

                <div className="divide-y divide-gray-100">
                  {isLoading ? (
                    <div className="p-6 text-center text-gray-600">Loading...</div>
                  ) : rows.length === 0 ? (
                    <div className="p-6 text-center text-gray-600">No attendance records found.</div>
                  ) : (
                    rows.map((row) => (
                      <div key={row.key} className="grid grid-cols-4 gap-4 px-10 py-4 items-center">
                        <div className="text-left text-gray-700 truncate">{row?.name || 'Name Here'}</div>
                        <div className="text-center text-gray-700">{row.gymPct}%</div>
                        <div className="text-center text-gray-700">{row.homePct}%</div>
                        <div className="text-right text-gray-700">{row.absentPct}%</div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default AttendenceHistory;
