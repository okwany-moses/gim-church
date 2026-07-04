import React, { useState } from 'react';
import { 
  Search, 
  BookOpen, 
  Calendar, 
  MessageSquare, 
  Music, 
  User, 
  Smartphone, 
  Printer, 
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Heart,
  FileText,
  Clock,
  Music4,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { api } from '../api.js';
import { Member, Contribution, Event, Sermon, Hymn, MemberStatement } from '../types.js';
import GridCalendar from './GridCalendar.js';
import Songbook from './Songbook.js';

interface CongregantPortalProps {
  events: Event[];
  sermons: Sermon[];
  hymns: Hymn[];
  members: Member[];
  onSubmitPrayerRequest: (data: { requestor_name: string; content: string; is_anonymous: number }) => Promise<any>;
}

const TRILINGUAL_SCRIPTURES = [
  {
    ref: "Joshua 1:9",
    english: "Have I not commanded you? Be strong and courageous. Do not be afraid; do not be discouraged, for the Lord your God will be with you wherever you go.",
    kiswahili: "Je! Si mimi niliyekuamuru? Uwe hodari na moyo wa ushujaa; usiogope wala usifanye wafadhaiko; kwa kuwa Bwana, Mungu wako, yu pamoja nawe kila uendako.",
    luo: "Oyo ok asiechiki? Bed ranyalo kendo chunyi maber. Kik iluor, kendo kik chunyi nyosore, nimar Ruoth Nyasachi ni kodi kamoro amora moidhiye."
  },
  {
    ref: "Proverbs 3:5-6",
    english: "Trust in the Lord with all your heart and lean not on your own understanding; in all your ways submit to him, and he will make your paths straight.",
    kiswahili: "Mtumaini Bwana kwa moyo wako wote, wala usizitegemee akili zako mwenyewe; katika njia zako zote mkiri yeye, naye atanyosha mapito yako.",
    luo: "Gen Ruoth gi chunyi duto, kendo kik ikorre kuom riekoni iwuon; kuom wechegi duto kete motalo, kendo enong''olne yoregi maber."
  },
  {
    ref: "Romans 8:28",
    english: "And we know that in all things God works for the good of those who love him, who have been called according to his purpose.",
    kiswahili: "Nasi twajua ya kuwa mambo yote hufanya kazi pamoja na wale wampendao Mungu katika kuwapatia mema, yaani, wale walioitwa kwa kusudi lake.",
    luo: "Ngope kendo wang''eyo ni kuom gik moko duto Nyasaye timo maber ne joma ohere, ma gin joma oluong mokuom chenro mare."
  },
  {
    ref: "Isaiah 40:31",
    english: "But those who hope in the Lord will renew their strength. They will soar on wings like eagles; they will run and not grow weary, they will walk and not be faint.",
    kiswahili: "Bali wao wamngojao Bwana watapata nguvu mpya; watapanda juu kwa mbawa kama tai; watapiga mbio, wala hawatachoka; watakwenda kwa miguu, wala hawatasituka.",
    luo: "To joma rito Ruoth chunygi nobed manyien. Gibiro dhaw gi lwetgi ka ugo; gibiro ringo to ok giboch, kendo gibiro wuotho to ok gibinind."
  }
];

export default function CongregantPortal({
  events,
  sermons,
  hymns,
  members,
  onSubmitPrayerRequest
}: CongregantPortalProps) {
  const [activeTab, setActiveTab] = useState<'home' | 'hymnal' | 'sermons' | 'songbook'>('home');

  // Scripture index state
  const [scriptureIndex, setScriptureIndex] = useState(0);

  // Prayer Request Form state
  const [prayerName, setPrayerName] = useState('');
  const [prayerContent, setPrayerContent] = useState('');
  const [prayerIsAnonymous, setPrayerIsAnonymous] = useState(false);
  const [prayerSuccess, setPrayerSuccess] = useState('');
  const [prayerError, setPrayerError] = useState('');
  const [isSubmittingPrayer, setIsSubmittingPrayer] = useState(false);

  // Hymnal Search State
  const [hymnSearch, setHymnSearch] = useState('');
  const [selectedHymn, setSelectedHymn] = useState<Hymn | null>(null);

  // Sermon Library active selector
  const [readingSermon, setReadingSermon] = useState<Sermon | null>(null);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', maximumFractionDigits: 0 }).format(val);
  };

  // Scripture controls
  const prevScripture = () => {
    setScriptureIndex(prev => prev === 0 ? TRILINGUAL_SCRIPTURES.length - 1 : prev - 1);
  };

  const nextScripture = () => {
    setScriptureIndex(prev => (prev + 1) % TRILINGUAL_SCRIPTURES.length);
  };

  const handlePrayerRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPrayerSuccess('');
    setPrayerError('');

    if (!prayerContent.trim()) {
      setPrayerError('Please type your prayer request content.');
      return;
    }

    try {
      setIsSubmittingPrayer(true);
      await onSubmitPrayerRequest({
        requestor_name: prayerIsAnonymous ? '' : (prayerName.trim() || 'Congregant'),
        content: prayerContent,
        is_anonymous: prayerIsAnonymous ? 1 : 0
      });
      setPrayerSuccess('Your prayer request has been securely submitted to the pastoral care team.');
      setPrayerContent('');
      setPrayerName('');
    } catch (err: any) {
      setPrayerError(err.message || 'Failed to submit prayer request.');
    } finally {
      setIsSubmittingPrayer(false);
    }
  };

  // Filter Hymns
  const filteredHymns = hymns.filter(h => 
    h.number.toString().includes(hymnSearch) ||
    h.title.toLowerCase().includes(hymnSearch.toLowerCase()) ||
    h.lyrics_english.toLowerCase().includes(hymnSearch.toLowerCase()) ||
    h.lyrics_kiswahili.toLowerCase().includes(hymnSearch.toLowerCase()) ||
    h.lyrics_luo.toLowerCase().includes(hymnSearch.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Welcome Hero Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white rounded-2xl p-6 md:p-8 border border-blue-900/30 relative overflow-hidden shadow-md">
        <div className="absolute right-0 top-0 w-64 h-64 bg-blue-600/10 rounded-full blur-2xl"></div>
        <div className="relative space-y-3 max-w-2xl">
          <span className="bg-amber-400 text-slate-950 px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider">
            Ramba HQ
          </span>
          <h1 className="text-xl md:text-3xl font-bold tracking-tight">Gideons International Ministries Kenya</h1>
          <p className="text-blue-200/80 text-xs md:text-sm">
            Welcome to our trilingual congregant portal. Access sermons, review fellowship schedules, and read lyrics from the golden hymnal.
          </p>
        </div>

        {/* Navigation Tabs on Hero */}
        <div className="flex flex-wrap gap-2 pt-6 border-t border-white/10 mt-6 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('home')}
            className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${activeTab === 'home' ? 'bg-amber-400 text-slate-950' : 'bg-white/10 text-white hover:bg-white/15'}`}
          >
            Home / Schedule
          </button>
          <button
            onClick={() => setActiveTab('songbook')}
            className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${activeTab === 'songbook' ? 'bg-amber-400 text-slate-950' : 'bg-white/10 text-white hover:bg-white/15'}`}
          >
            GIMK Hymnal Book
          </button>
          <button
            onClick={() => setActiveTab('sermons')}
            className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${activeTab === 'sermons' ? 'bg-amber-400 text-slate-950' : 'bg-white/10 text-white hover:bg-white/15'}`}
          >
            Sermon Library
          </button>
        </div>
      </div>

      {/* 1. HOME TAB */}
      {activeTab === 'home' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Trilingual Scripture Highlight */}
            <div className="bg-amber-50/50 border border-amber-200/80 p-6 rounded-xl space-y-4 shadow-2xs">
              <div className="flex items-center justify-between border-b border-amber-200/50 pb-2">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-800 flex items-center gap-1">
                  <BookOpen size={14} />
                  <span>Sabbath Scripture Reading</span>
                </span>
                <div className="flex items-center gap-1">
                  <button 
                    onClick={prevScripture}
                    className="p-1 hover:bg-amber-100 rounded-md text-amber-800 cursor-pointer"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <span className="text-[10px] font-bold text-amber-900 font-mono">
                    {scriptureIndex + 1} / {TRILINGUAL_SCRIPTURES.length}
                  </span>
                  <button 
                    onClick={nextScripture}
                    className="p-1 hover:bg-amber-100 rounded-md text-amber-800 cursor-pointer"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>

              {/* Verses */}
              <div className="space-y-4 text-xs leading-relaxed text-slate-700">
                <div>
                  <span className="font-bold text-slate-400 block mb-0.5">ENGLISH</span>
                  <p className="italic font-medium font-sans">"{TRILINGUAL_SCRIPTURES[scriptureIndex].english}"</p>
                </div>
                <div>
                  <span className="font-bold text-slate-400 block mb-0.5">KISWAHILI</span>
                  <p className="italic font-medium">"{TRILINGUAL_SCRIPTURES[scriptureIndex].kiswahili}"</p>
                </div>
                <div>
                  <span className="font-bold text-slate-400 block mb-0.5">DHO-LUO</span>
                  <p className="italic font-medium text-slate-800 font-serif">"{TRILINGUAL_SCRIPTURES[scriptureIndex].luo}"</p>
                </div>
                <div className="text-right pt-2 text-amber-950 font-extrabold text-[11px] font-mono">
                  — {TRILINGUAL_SCRIPTURES[scriptureIndex].ref}
                </div>
              </div>
            </div>

            {/* Upcoming Fellowships Grid Calendar */}
            <GridCalendar events={events} />
          </div>

          {/* Right Sidebar: Latest Sermon & Prayer Submission */}
          <div className="space-y-6">
            {/* Prayer Requests Submission Module */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
              <div>
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider font-mono flex items-center gap-1.5">
                  <Heart className="text-rose-600 animate-pulse animate-duration-1000" size={14} />
                  <span>Submit Prayer Request</span>
                </h3>
                <p className="text-[10px] text-slate-400 mt-0.5">Your requests are confidential and shared only with GIMK elders & pastors.</p>
              </div>

              <form onSubmit={handlePrayerRequestSubmit} className="space-y-3">
                {!prayerIsAnonymous && (
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Your Name / Family Name</label>
                    <input
                      type="text"
                      value={prayerName}
                      onChange={(e) => setPrayerName(e.target.value)}
                      placeholder="e.g. Brother Jared"
                      className="px-2.5 py-1.5 text-xs w-full border border-slate-200 rounded-lg bg-slate-50 focus:outline-hidden text-slate-800"
                    />
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Your Prayer Request / Need</label>
                  <textarea
                    value={prayerContent}
                    onChange={(e) => setPrayerContent(e.target.value)}
                    rows={3}
                    placeholder="Describe what we can stand with you in prayer for..."
                    className="px-2.5 py-1.5 text-xs w-full border border-slate-200 rounded-lg bg-slate-50 text-slate-800 focus:outline-hidden"
                  />
                </div>

                <div className="flex items-center gap-1.5 pt-1">
                  <input
                    type="checkbox"
                    id="anonymous-checkbox"
                    checked={prayerIsAnonymous}
                    onChange={(e) => setPrayerIsAnonymous(e.target.checked)}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-3.5 w-3.5"
                  />
                  <label htmlFor="anonymous-checkbox" className="text-[10px] font-semibold text-slate-500 cursor-pointer select-none">
                    Submit completely anonymously
                  </label>
                </div>

                {prayerError && (
                  <div className="p-2 bg-rose-50 text-rose-700 text-[10px] font-bold rounded flex items-center gap-1.5">
                    <AlertCircle size={13} />
                    <span>{prayerError}</span>
                  </div>
                )}

                {prayerSuccess && (
                  <div className="p-2 bg-green-50 text-green-700 text-[10px] font-bold rounded flex items-center gap-1.5">
                    <CheckCircle size={13} />
                    <span>{prayerSuccess}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSubmittingPrayer}
                  className="w-full inline-flex items-center justify-center gap-1 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs py-2 rounded-lg transition cursor-pointer select-none"
                >
                  <span>Submit to Pastors Care Team</span>
                </button>
              </form>
            </div>

            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow duration-200 space-y-4 flex flex-col justify-between">
              <div className="space-y-4">
                <span className="bg-blue-50 text-blue-800 border border-blue-100 text-[10px] font-extrabold px-2.5 py-1 rounded-full uppercase tracking-wider inline-block">
                  Latest Sermon
                </span>

                {sermons.length === 0 ? (
                  <p className="text-slate-400 text-xs">No pulpit sermons uploaded yet.</p>
                ) : (
                  <div className="space-y-3">
                    <h3 className="text-md font-extrabold text-slate-800">{sermons[0].title}</h3>
                    <div className="space-y-1 text-xs text-slate-500 font-medium">
                      <p>Preacher: <strong>{sermons[0].speaker}</strong></p>
                      <p>Date: {new Date(sermons[0].date).toLocaleDateString()}</p>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-100">
                      {sermons[0].summary}
                    </p>
                  </div>
                )}
              </div>

              {sermons.length > 0 && sermons[0].media_url && (
                <div className="pt-4 border-t border-slate-50 mt-4">
                  <a
                    href={sermons[0].media_url}
                    target="_blank"
                    referrerPolicy="no-referrer"
                    className="w-full inline-flex items-center justify-center gap-1 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs py-2 rounded-lg transition"
                  >
                    <span>Listen / Watch Message</span>
                    <ExternalLink size={13} />
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* SONGBOOK TAB */}
      {activeTab === 'songbook' && (
        <Songbook hymns={hymns} />
      )}

      {/* 4. SERMON LIBRARY */}
      {activeTab === 'sermons' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow duration-200">
            <h3 className="text-sm font-bold text-blue-900 tracking-tight">Parish Pulpit Messages</h3>
            <p className="text-xs text-slate-500">Read summaries or access recordings from past Sabbath sermons</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {sermons.map(s => (
              <div key={s.id} className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition duration-200 p-5 hover:border-blue-300 flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-50 pb-2">
                    <span className="text-xs font-mono font-bold text-blue-600">{new Date(s.date).toLocaleDateString()}</span>
                    <span className="text-[10px] text-slate-400">Preached by {s.speaker}</span>
                  </div>
                  <h4 className="text-sm font-bold text-slate-800">{s.title}</h4>
                  <p className="text-xs text-slate-600 leading-relaxed italic">{s.summary}</p>
                </div>

                {s.media_url && (
                  <div className="pt-4 border-t border-slate-50 mt-4 text-right">
                    <a
                      href={s.media_url}
                      target="_blank"
                      referrerPolicy="no-referrer"
                      className="inline-flex items-center gap-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold py-1.5 px-3 rounded-lg transition"
                    >
                      <span>Access Audio Link</span>
                      <ExternalLink size={11} />
                    </a>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
