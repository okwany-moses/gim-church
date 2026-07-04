import React, { useState } from 'react';
import { Calendar, Grid, List, ChevronLeft, ChevronRight, MapPin, Clock, Info } from 'lucide-react';
import { Event } from '../types.js';

interface GridCalendarProps {
  events: Event[];
}

export default function GridCalendar({ events }: GridCalendarProps) {
  const [viewMode, setViewMode] = useState<'month' | 'list'>('month');
  const [currentDate, setCurrentDate] = useState<Date>(new Date(2026, 5, 1)); // Default around June 2026 to align with mock dates
  const [selectedDayEvents, setSelectedDayEvents] = useState<Event[] | null>(null);

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Month navigation helpers
  const handlePrevMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
    setSelectedDayEvents(null);
  };

  const handleNextMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
    setSelectedDayEvents(null);
  };

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Calendar calculations
  const firstDayOfMonthIndex = new Date(year, month, 1).getDay();
  const totalDaysInMonth = new Date(year, month + 1, 0).getDate();

  // Create dates structure for monthly calendar grid
  const daysArray = [];
  // Fill leading empty squares from previous month
  for (let i = 0; i < firstDayOfMonthIndex; i++) {
    daysArray.push({ day: null, dateStr: '' });
  }
  // Fill actual days of the month
  for (let d = 1; d <= totalDaysInMonth; d++) {
    const formattedMonth = (month + 1).toString().padStart(2, '0');
    const formattedDay = d.toString().padStart(2, '0');
    const dateStr = `${year}-${formattedMonth}-${formattedDay}`;
    daysArray.push({ day: d, dateStr });
  }

  // Get events on a specific day
  const getEventsForDate = (dateStr: string) => {
    if (!dateStr) return [];
    return events.filter(e => e.date === dateStr);
  };

  // List all upcoming events in current and future months
  const sortedEvents = [...events].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const formatEventDateStr = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden" id="grid-events-calendar">
      {/* Calendar Header with View Toggle Controls */}
      <div className="bg-slate-50 border-b border-slate-200 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight flex items-center gap-1.5">
            <Calendar className="text-blue-600" size={15} />
            <span>Upcoming Parishes & Joint Events</span>
          </h3>
          <p className="text-[11px] text-slate-500">View GIMK corporate schedule and fellowship calendars</p>
        </div>

        <div className="flex items-center gap-2">
          {/* Month Navigator (Only shown in Monthly View) */}
          {viewMode === 'month' && (
            <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-1 mr-2 shadow-xs">
              <button
                onClick={handlePrevMonth}
                className="p-1 hover:bg-slate-100 rounded text-slate-600 cursor-pointer"
              >
                <ChevronLeft size={14} />
              </button>
              <span className="text-[11px] font-black text-slate-800 px-2 min-w-[100px] text-center uppercase tracking-wider font-mono">
                {months[month]} {year}
              </span>
              <button
                onClick={handleNextMonth}
                className="p-1 hover:bg-slate-100 rounded text-slate-600 cursor-pointer"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          )}

          {/* Toggle buttons */}
          <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-100/55 text-xs">
            <button
              onClick={() => setViewMode('month')}
              className={`px-3 py-1.5 rounded-md font-bold flex items-center gap-1 transition cursor-pointer ${viewMode === 'month' ? 'bg-white text-blue-700 shadow-xs border border-slate-200/55' : 'text-slate-500 hover:text-slate-800'}`}
            >
              <Grid size={13} />
              <span className="hidden sm:inline">Monthly Calendar</span>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1.5 rounded-md font-bold flex items-center gap-1 transition cursor-pointer ${viewMode === 'list' ? 'bg-white text-blue-700 shadow-xs border border-slate-200/55' : 'text-slate-500 hover:text-slate-800'}`}
            >
              <List size={13} />
              <span className="hidden sm:inline">Chronological List</span>
            </button>
          </div>
        </div>
      </div>

      {viewMode === 'month' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 divide-y lg:divide-y-0 lg:divide-x divide-slate-150">
          {/* Calendar Month Grid Pane */}
          <div className="lg:col-span-2 p-4">
            {/* Weekdays indicator bar */}
            <div className="grid grid-cols-7 gap-1 text-center border-b border-slate-150 pb-2 mb-2 shrink-0">
              {daysOfWeek.map(d => (
                <span key={d} className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  {d}
                </span>
              ))}
            </div>

            {/* Days Grid */}
            <div className="grid grid-cols-7 gap-1">
              {daysArray.map((dayObj, index) => {
                const dayEvents = getEventsForDate(dayObj.dateStr);
                const isSelected = selectedDayEvents && selectedDayEvents[0]?.date === dayObj.dateStr;
                
                return (
                  <div
                    key={index}
                    onClick={() => {
                      if (dayEvents.length > 0) {
                        setSelectedDayEvents(dayEvents);
                      } else {
                        setSelectedDayEvents(null);
                      }
                    }}
                    className={`min-h-[70px] bg-slate-50/50 p-1.5 border border-slate-100 rounded-lg flex flex-col justify-between transition group cursor-pointer ${dayObj.day ? 'hover:bg-blue-50/20 hover:border-blue-200' : 'bg-transparent border-none pointer-events-none'} ${isSelected ? 'bg-blue-50/40 border-blue-400 shadow-inner' : ''}`}
                  >
                    {dayObj.day ? (
                      <>
                        <div className="flex items-center justify-between">
                          <span className={`text-[11px] font-bold font-mono ${dayEvents.length > 0 ? 'text-blue-700 font-extrabold bg-blue-100/60 h-5 w-5 rounded-full flex items-center justify-center' : 'text-slate-500'}`}>
                            {dayObj.day}
                          </span>
                          {dayEvents.length > 0 && (
                            <span className="h-1.5 w-1.5 rounded-full bg-blue-600" />
                          )}
                        </div>

                        {/* Event list snippets */}
                        <div className="space-y-0.5 mt-1 flex-1 overflow-hidden">
                          {dayEvents.slice(0, 2).map(e => (
                            <div
                              key={e.id}
                              className="text-[9px] font-bold text-slate-700 truncate bg-white border border-slate-150 px-1 py-0.5 rounded"
                              title={e.title}
                            >
                              {e.title}
                            </div>
                          ))}
                          {dayEvents.length > 2 && (
                            <div className="text-[7px] font-extrabold text-blue-600 uppercase tracking-wider text-right pr-1">
                              +{dayEvents.length - 2} more
                            </div>
                          )}
                        </div>
                      </>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Selection Detail Drawer Panel */}
          <div className="p-4 bg-slate-50/40 flex flex-col justify-between">
            {selectedDayEvents ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider font-mono">
                    Events for {formatEventDateStr(selectedDayEvents[0].date)}
                  </h4>
                  <span className="text-[10px] font-extrabold bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                    {selectedDayEvents.length} scheduled
                  </span>
                </div>

                <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
                  {selectedDayEvents.map(e => (
                    <div key={e.id} className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs hover:border-blue-400 transition-colors">
                      <h5 className="text-xs font-black text-blue-900 tracking-tight leading-snug">{e.title}</h5>
                      <p className="text-[11px] text-slate-500 mt-1">{e.description}</p>
                      
                      <div className="flex flex-col gap-1 mt-3 border-t border-slate-100 pt-2 text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                        <span className="inline-flex items-center gap-1">
                          <MapPin size={11} className="text-blue-500 shrink-0" />
                          <span>{e.location || 'Church Main Sanctuary'}</span>
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Clock size={11} className="text-slate-400 shrink-0" />
                          <span>09:00 AM - 12:30 PM (EAT)</span>
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-center text-slate-400 h-full">
                <Info size={32} className="text-slate-300 mb-2 animate-bounce" />
                <p className="text-xs font-semibold">Select a highlighted day</p>
                <p className="text-[10px] text-slate-400 max-w-[200px] mt-0.5">Click any calendar day with blue numbers to inspect its scheduled services or fellowship times.</p>
              </div>
            )}

            {/* Quick tips */}
            <div className="mt-4 bg-blue-50/50 border border-blue-100/40 p-3 rounded-lg text-[10px] text-blue-800 shrink-0 font-medium leading-relaxed">
              <strong>Tip:</strong> Join GIMK Weekly Fellowships & Home Cell groups. Talk to your Cell Group leaders for directions and transport details.
            </div>
          </div>
        </div>
      ) : (
        /* Chronological list view */
        <div className="p-4 bg-white">
          <div className="space-y-3 max-w-3xl mx-auto">
            {sortedEvents.length === 0 ? (
              <div className="text-center py-16 text-slate-400 font-semibold text-xs">
                No events scheduled at this time.
              </div>
            ) : (
              sortedEvents.map(e => (
                <div key={e.id} className="bg-slate-50 p-4 rounded-xl border border-slate-150 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-white hover:border-blue-400 hover:shadow-xs transition duration-200">
                  <div className="space-y-1">
                    <span className="inline-block text-[10px] font-extrabold font-mono text-blue-700 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-md uppercase">
                      {formatEventDateStr(e.date)}
                    </span>
                    <h4 className="text-sm font-black text-slate-900 tracking-tight">{e.title}</h4>
                    <p className="text-xs text-slate-500 leading-relaxed">{e.description}</p>
                  </div>

                  <div className="flex flex-col sm:flex-row md:flex-col items-start gap-1 shrink-0 text-[10px] text-slate-400 font-extrabold uppercase tracking-widest border-t md:border-t-0 md:border-l border-slate-200 pt-2 md:pt-0 md:pl-4">
                    <span className="inline-flex items-center gap-1.5">
                      <MapPin size={12} className="text-blue-500" />
                      <span>{e.location}</span>
                    </span>
                    <span className="inline-flex items-center gap-1.5 mt-0.5">
                      <Clock size={12} className="text-slate-400" />
                      <span>Sunday 9:00 AM</span>
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
