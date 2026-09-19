import React, { useEffect, useMemo, useState } from 'react';
import { Calendar, Check, Video } from 'lucide-react';
import { BookingCard as BookingCardData, KinClient } from '../core';

function dayKey(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

function timeLabel(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

export function BookingCard({
  card,
  client,
}: {
  card: BookingCardData;
  client: KinClient;
}) {
  const [selectedStart, setSelectedStart] = useState<string | null>(null);
  const [name, setName] = useState(client.userName || '');
  const [email, setEmail] = useState(client.userEmail || '');
  const [status, setStatus] = useState<'idle' | 'saving' | 'done' | 'error'>('idle');
  const [error, setError] = useState('');
  const [meetUrl, setMeetUrl] = useState('');

  const byDay = useMemo(() => {
    const groups: Record<string, typeof card.slots> = {};
    for (const slot of card.slots || []) {
      const day = dayKey(slot.start);
      groups[day] = groups[day] || [];
      groups[day].push(slot);
    }
    return groups;
  }, [card.slots]);

  const days = Object.keys(byDay);
  const [activeDay, setActiveDay] = useState('');
  useEffect(() => {
    if (!activeDay && days[0]) setActiveDay(days[0]);
  }, [days, activeDay]);

  const meetingId = card.meeting_type?.id;
  const duration = card.meeting_type?.duration_minutes || 30;

  const confirm = async () => {
    if (!selectedStart || !meetingId || status === 'saving' || status === 'done') return;
    setStatus('saving');
    setError('');
    try {
      const booked = await client.bookMeeting({
        meetingTypeId: meetingId,
        start: selectedStart,
        guestName: name,
        guestEmail: email,
      });
      setMeetUrl(booked?.meet_url || '');
      setStatus('done');
    } catch (e: any) {
      setStatus('error');
      setError(e.message || 'Booking failed');
    }
  };

  if (status === 'done') {
    return (
      <div className="kintw:mt-3 kintw:rounded-2xl kintw:border kintw:border-emerald-400 kintw:bg-emerald-50 kintw:p-4 kintw:text-kin-900">
        <div className="kintw:flex kintw:items-center kintw:gap-2 kintw:font-semibold">
          <Check size={16} />
          Google Meet booked
        </div>
        {selectedStart && (
          <p className="kintw:text-xs kintw:text-kin-600 kintw:mt-1">
            {dayKey(selectedStart)} · {timeLabel(selectedStart)}
          </p>
        )}
        {meetUrl && (
          <a href={meetUrl} target="_blank" rel="noreferrer" className="kintw:text-xs kintw:text-kin-accent kintw:mt-2 kintw:inline-block kintw:break-all">
            {meetUrl}
          </a>
        )}
        <p className="kintw:text-xs kintw:text-kin-600 kintw:mt-2">Please be on time.</p>
      </div>
    );
  }

  return (
    <div className="kintw:mt-3 kintw:rounded-2xl kintw:border kintw:border-kin-400 kintw:bg-kin-50 kintw:p-3 kintw:w-full">
      <div className="kintw:flex kintw:items-center kintw:gap-2 kintw:mb-2 kintw:text-kin-900">
        <Calendar size={16} />
        <div>
          <div className="kintw:text-sm kintw:font-semibold">{card.meeting_type?.name || 'Intro call'}</div>
          <div className="kintw:text-[11px] kintw:text-kin-600 kintw:flex kintw:items-center kintw:gap-1">
            <Video size={11} /> {duration} min · Google Meet
          </div>
        </div>
      </div>

      {days.length === 0 ? (
        <p className="kintw:text-xs kintw:text-kin-600">No open times this week.</p>
      ) : (card.slots || []).length <= 3 ? (
        <>
          <div className="kintw:flex kintw:flex-col kintw:gap-1.5">
            {(card.slots || []).map((slot) => (
              <button
                key={slot.start}
                type="button"
                onClick={() => setSelectedStart(slot.start)}
                className={`kintw:text-[12px] kintw:px-3 kintw:py-2 kintw:rounded-xl kintw:border kintw:cursor-pointer kintw:font-medium kintw:text-left ${
                  selectedStart === slot.start
                    ? 'kintw:bg-kin-accent kintw:text-black kintw:border-kin-accent'
                    : 'kintw:bg-kin-200 kintw:text-kin-800 kintw:border-kin-300'
                }`}
              >
                {dayKey(slot.start)} · {timeLabel(slot.start)}
              </button>
            ))}
          </div>
          {selectedStart && (
            <div className="kintw:mt-2 kintw:space-y-1.5">
              {(!client.userName || !client.userEmail) && (
                <>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your name"
                    className="kintw:w-full kintw:text-[13px] kintw:px-2 kintw:py-1.5 kintw:rounded-lg kintw:border kintw:border-kin-300 kintw:bg-kin-50 kintw:text-kin-900"
                  />
                  <input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Email for the invite"
                    className="kintw:w-full kintw:text-[13px] kintw:px-2 kintw:py-1.5 kintw:rounded-lg kintw:border kintw:border-kin-300 kintw:bg-kin-50 kintw:text-kin-900"
                  />
                </>
              )}
              <button
                type="button"
                onClick={confirm}
                disabled={status === 'saving'}
                className="kintw:w-full kintw:bg-kin-accent kintw:text-black kintw:rounded-xl kintw:py-2 kintw:text-[13px] kintw:font-semibold kintw:border-none kintw:cursor-pointer disabled:kintw:opacity-50"
              >
                {status === 'saving' ? 'Booking…' : `Book ${timeLabel(selectedStart)} · Google Meet`}
              </button>
              {error && <p className="kintw:text-[11px] kintw:text-red-500">{error}</p>}
            </div>
          )}
        </>
      ) : (
        <>
          <div className="kintw:flex kintw:gap-1 kintw:overflow-x-auto kintw:pb-2">
            {days.map((day) => (
              <button
                key={day}
                type="button"
                onClick={() => {
                  setActiveDay(day);
                  setSelectedStart(null);
                }}
                className={`kintw:whitespace-nowrap kintw:text-[11px] kintw:px-2.5 kintw:py-1 kintw:rounded-full kintw:border kintw:cursor-pointer ${
                  (activeDay || days[0]) === day
                    ? 'kintw:bg-kin-accent kintw:text-black kintw:border-kin-accent'
                    : 'kintw:bg-transparent kintw:text-kin-700 kintw:border-kin-300'
                }`}
              >
                {day}
              </button>
            ))}
          </div>
          <div className="kintw:grid kintw:grid-cols-2 kintw:gap-1.5 kintw:max-h-40 kintw:overflow-y-auto">
            {(byDay[activeDay || days[0]] || []).map((slot) => (
              <button
                key={slot.start}
                type="button"
                onClick={() => setSelectedStart(slot.start)}
                className={`kintw:text-[12px] kintw:px-2 kintw:py-2 kintw:rounded-xl kintw:border kintw:cursor-pointer kintw:font-medium ${
                  selectedStart === slot.start
                    ? 'kintw:bg-kin-accent kintw:text-black kintw:border-kin-accent'
                    : 'kintw:bg-kin-200 kintw:text-kin-800 kintw:border-kin-300'
                }`}
              >
                {timeLabel(slot.start)}
              </button>
            ))}
          </div>
          {selectedStart && (
            <div className="kintw:mt-2 kintw:space-y-1.5">
              {(!client.userName || !client.userEmail) && (
                <>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your name"
                    className="kintw:w-full kintw:text-[13px] kintw:px-2 kintw:py-1.5 kintw:rounded-lg kintw:border kintw:border-kin-300 kintw:bg-kin-50 kintw:text-kin-900"
                  />
                  <input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Email for the invite"
                    className="kintw:w-full kintw:text-[13px] kintw:px-2 kintw:py-1.5 kintw:rounded-lg kintw:border kintw:border-kin-300 kintw:bg-kin-50 kintw:text-kin-900"
                  />
                </>
              )}
              <button
                type="button"
                onClick={confirm}
                disabled={status === 'saving'}
                className="kintw:w-full kintw:bg-kin-accent kintw:text-black kintw:rounded-xl kintw:py-2 kintw:text-[13px] kintw:font-semibold kintw:border-none kintw:cursor-pointer disabled:kintw:opacity-50"
              >
                {status === 'saving' ? 'Booking…' : `Book ${timeLabel(selectedStart)} · Google Meet`}
              </button>
              {error && <p className="kintw:text-[11px] kintw:text-red-500">{error}</p>}
            </div>
          )}
        </>
      )}
    </div>
  );
}
