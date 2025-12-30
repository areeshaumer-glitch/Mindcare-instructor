import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Calendar, ChevronDown } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { Method, callApi } from '../network/NetworkManager';
import { api } from '../network/Environment';

const AttendenceHistory = () => {
  const location = useLocation();
  const member = location?.state?.member || null;
  const navigationStartDate = location?.state?.startDate || '';
  const navigationEndDate = location?.state?.endDate || '';

  const parseYmdToLocalDate = useCallback((ymd) => {
    const raw = String(ymd || '').trim();
    if (!raw) return null;
    const [y, m, d] = raw.split('-').map((n) => Number(n));
    if (!y || !m || !d) return null;
    return new Date(y, m - 1, d);
  }, []);

  const [selectedDate, setSelectedDate] = useState(() => {
    const initial = parseYmdToLocalDate(navigationEndDate);
    return initial || new Date();
  });
  const [selectedYmd, setSelectedYmd] = useState('');
  const [showCalendar, setShowCalendar] = useState(false);
  const [rows, setRows] = useState([]);
  const [apiError, setApiError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const toUtcYMD = useCallback((date) => {
    const utc = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    return utc.toISOString().slice(0, 10);
  }, []);

  const defaultEndDate = useMemo(() => {
    if (typeof navigationEndDate === 'string' && navigationEndDate.trim()) {
      return String(navigationEndDate).trim();
    }
    return toUtcYMD(new Date());
  }, [navigationEndDate, toUtcYMD]);

  const defaultStartDate = useMemo(() => {
    if (typeof navigationStartDate === 'string' && navigationStartDate.trim()) {
      return String(navigationStartDate).trim();
    }
    const localEnd = parseYmdToLocalDate(defaultEndDate) || new Date();
    const d = new Date(localEnd);
    d.setDate(d.getDate() - 29);
    return toUtcYMD(d);
  }, [defaultEndDate, navigationStartDate, parseYmdToLocalDate, toUtcYMD]);

  const queryStartDate = selectedYmd ? selectedYmd : defaultStartDate;
  const queryEndDate = selectedYmd ? selectedYmd : defaultEndDate;

  const buildHistoryEndpoint = useCallback(() => {
    const params = new URLSearchParams();
    if (queryStartDate) params.set('startDate', queryStartDate);
    if (queryEndDate) params.set('endDate', queryEndDate);
    params.set('page', '1');
    params.set('limit', '1000');
    if (member?.key) {
      params.set('userId', String(member.key));
    }
    return `${api.attendanceMeHistory}?${params.toString()}`;
  }, [member?.key, queryEndDate, queryStartDate]);

  const loadHistory = useCallback(async () => {
    setApiError('');
    setIsLoading(true);

    await callApi({
      method: Method.GET,
      endPoint: buildHistoryEndpoint(),
      onSuccess: (res) => {
        const getNumber = (value) => {
          const n = Number(value);
          return Number.isFinite(n) ? n : 0;
        };

        const meta =
          res?.meta ||
          res?.data?.meta ||
          res?.data?.data?.meta ||
          null;

        const summary = meta?.summary || null;

        const apiGymPct = getNumber(summary?.percentGym);
        const apiHomePct = getNumber(summary?.percentHome);
        const apiAbsentPct = getNumber(summary?.percentAbsent);

        const fallbackGymPct = getNumber(member?.gymPct);
        const fallbackHomePct = getNumber(member?.homePct);
        const fallbackAbsentPct = getNumber(member?.absentPct);

        const apiTotalMarkedDays = getNumber(summary?.totalMarkedDays ?? meta?.totalMarkedDays);

        const shouldFallbackToSummaryRow =
          !selectedYmd &&
          member &&
          apiTotalMarkedDays === 0 &&
          (fallbackGymPct > 0 || fallbackHomePct > 0 || fallbackAbsentPct < 100);

        const gymPct = shouldFallbackToSummaryRow ? fallbackGymPct : apiGymPct;
        const homePct = shouldFallbackToSummaryRow ? fallbackHomePct : apiHomePct;
        const absentPct = shouldFallbackToSummaryRow ? fallbackAbsentPct : apiAbsentPct;

        setRows([
          {
            key: member?.key || 'me',
            name: member?.name || 'Me',
            gymPct,
            homePct,
            absentPct,
          },
        ]);
      },
      onError: (err) => {
        setRows([]);
        setApiError(err?.message || 'Failed to load attendance history. Please try again.');
      },
    });

    setIsLoading(false);
  }, [buildHistoryEndpoint, member, selectedYmd]);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

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
      setSelectedYmd(toUtcYMD(newDate));
      setShowCalendar(false);
    }
  };

  const navigateMonth = (direction) => {
    const newDate = new Date(selectedDate);
    newDate.setMonth(newDate.getMonth() + direction);
    setSelectedDate(newDate);
  };

  return (
    <>
      <div className="bg-white p-4 rounded-2xl">
        <div className="w-full mx-auto">
          {/* Header */}
          <div className="flex justify-between items-center mb-6 gap-4">
            <h1 className="text-2xl font-semibold text-teal-600">Attendance History</h1>
            
            {/* Date Selector */}
            <div className="relative">
              <button
                onClick={() => setShowCalendar(!showCalendar)}
                className="flex items-center justify-between gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50 transition-colors min-w-[220px]"
              >
                <Calendar className="w-5 h-5 text-gray-500" />
                <span className="text-gray-700">{selectedYmd ? formatDate(selectedDate) : 'Select Date'}</span>
                <ChevronDown className="w-4 h-4 text-gray-500" />
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
                        className={`h-8 text-sm rounded hover:bg-teal-100 transition-colors ${
                          selectedYmd && day === selectedDate.getDate() ? 'bg-teal-600 text-white hover:bg-teal-700' : 
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

          <div className="rounded-xl overflow-hidden border border-gray-100">
            <div className="overflow-x-auto">
              <div className="min-w-[560px]">
                <div className="bg-teal-600 text-white rounded-xl">
                  <div className="grid grid-cols-[2fr_1fr_1fr_1fr] gap-4 p-4 font-semibold text-lg">
                    <div className="text-left">Name</div>
                    <div className="text-center">Gym</div>
                    <div className="text-center">Home</div>
                    <div className="text-center">Absent</div>
                  </div>
                </div>

                <div className="divide-y divide-gray-100">
                  {isLoading ? (
                    <div className="p-6 text-center text-gray-600">Loading...</div>
                  ) : apiError ? (
                    <div className="p-6 text-center text-red-600">{apiError}</div>
                  ) : rows.length === 0 ? (
                    <div className="p-6 text-center text-gray-600">No attendance records found.</div>
                  ) : (
                    rows.map((row) => (
                      <div key={row.key} className="grid grid-cols-[2fr_1fr_1fr_1fr] gap-4 p-4 items-center">
                        <div className="text-left text-gray-700 truncate">{row?.name || 'Name Here'}</div>
                        <div className="text-center text-gray-700">{row.gymPct}%</div>
                        <div className="text-center text-gray-700">{row.homePct}%</div>
                        <div className="text-center text-gray-700">{row.absentPct}%</div>
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
