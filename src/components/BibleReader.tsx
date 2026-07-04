import React, { useState, useEffect } from 'react';
import { 
  Book, 
  Search, 
  ChevronRight, 
  Bookmark, 
  ArrowLeft, 
  ArrowRight, 
  Heart, 
  Volume2, 
  Loader2, 
  RefreshCw, 
  Star,
  Info
} from 'lucide-react';
import { api } from '../api.js';

interface Verse {
  verse: number;
  text: string;
}

interface BookmarkedVerse {
  id: string; // key like "John 3:16-esv"
  book: string;
  chapter: number;
  verse: number;
  text: string;
  translation: string;
  reference: string;
}

const BIBLE_BOOKS = [
  // Old Testament
  { name: 'Genesis', chapters: 50, category: 'Pentateuch' },
  { name: 'Exodus', chapters: 40, category: 'Pentateuch' },
  { name: 'Leviticus', chapters: 27, category: 'Pentateuch' },
  { name: 'Numbers', chapters: 36, category: 'Pentateuch' },
  { name: 'Deuteronomy', chapters: 34, category: 'Pentateuch' },
  { name: 'Joshua', chapters: 24, category: 'Historical' },
  { name: 'Judges', chapters: 21, category: 'Historical' },
  { name: 'Ruth', chapters: 4, category: 'Historical' },
  { name: '1 Samuel', chapters: 31, category: 'Historical' },
  { name: '2 Samuel', chapters: 24, category: 'Historical' },
  { name: '1 Kings', chapters: 22, category: 'Historical' },
  { name: '2 Kings', chapters: 25, category: 'Historical' },
  { name: '1 Chronicles', chapters: 29, category: 'Historical' },
  { name: '2 Chronicles', chapters: 36, category: 'Historical' },
  { name: 'Ezra', chapters: 10, category: 'Historical' },
  { name: 'Nehemiah', chapters: 13, category: 'Historical' },
  { name: 'Esther', chapters: 10, category: 'Historical' },
  { name: 'Job', chapters: 42, category: 'Poetry' },
  { name: 'Psalms', chapters: 150, category: 'Poetry' },
  { name: 'Proverbs', chapters: 31, category: 'Poetry' },
  { name: 'Ecclesiastes', chapters: 12, category: 'Poetry' },
  { name: 'Song of Solomon', chapters: 8, category: 'Poetry' },
  { name: 'Isaiah', chapters: 66, category: 'Major Prophets' },
  { name: 'Jeremiah', chapters: 52, category: 'Major Prophets' },
  { name: 'Lamentations', chapters: 5, category: 'Major Prophets' },
  { name: 'Ezekiel', chapters: 48, category: 'Major Prophets' },
  { name: 'Daniel', chapters: 12, category: 'Major Prophets' },
  { name: 'Hosea', chapters: 14, category: 'Minor Prophets' },
  { name: 'Joel', chapters: 3, category: 'Minor Prophets' },
  { name: 'Amos', chapters: 9, category: 'Minor Prophets' },
  { name: 'Obadiah', chapters: 1, category: 'Minor Prophets' },
  { name: 'Jonah', chapters: 4, category: 'Minor Prophets' },
  { name: 'Micah', chapters: 7, category: 'Minor Prophets' },
  { name: 'Nahum', chapters: 3, category: 'Minor Prophets' },
  { name: 'Habakkuk', chapters: 3, category: 'Minor Prophets' },
  { name: 'Zephaniah', chapters: 3, category: 'Minor Prophets' },
  { name: 'Haggai', chapters: 2, category: 'Minor Prophets' },
  { name: 'Zechariah', chapters: 14, category: 'Minor Prophets' },
  { name: 'Malachi', chapters: 4, category: 'Minor Prophets' },
  
  // New Testament
  { name: 'Matthew', chapters: 28, category: 'Gospels' },
  { name: 'Mark', chapters: 16, category: 'Gospels' },
  { name: 'Luke', chapters: 24, category: 'Gospels' },
  { name: 'John', chapters: 21, category: 'Gospels' },
  { name: 'Acts', chapters: 28, category: 'History' },
  { name: 'Romans', chapters: 16, category: 'Epistles' },
  { name: '1 Corinthians', chapters: 16, category: 'Epistles' },
  { name: '2 Corinthians', chapters: 13, category: 'Epistles' },
  { name: 'Galatians', chapters: 6, category: 'Epistles' },
  { name: 'Ephesians', chapters: 6, category: 'Epistles' },
  { name: 'Philippians', chapters: 4, category: 'Epistles' },
  { name: 'Colossians', chapters: 4, category: 'Epistles' },
  { name: '1 Thessalonians', chapters: 5, category: 'Epistles' },
  { name: '2 Thessalonians', chapters: 3, category: 'Epistles' },
  { name: '1 Timothy', chapters: 6, category: 'Epistles' },
  { name: '2 Timothy', chapters: 4, category: 'Epistles' },
  { name: 'Titus', chapters: 3, category: 'Epistles' },
  { name: 'Philemon', chapters: 1, category: 'Epistles' },
  { name: 'Hebrews', chapters: 13, category: 'Epistles' },
  { name: 'James', chapters: 5, category: 'Epistles' },
  { name: '1 Peter', chapters: 5, category: 'Epistles' },
  { name: '2 Peter', chapters: 3, category: 'Epistles' },
  { name: '1 John', chapters: 5, category: 'Epistles' },
  { name: '2 John', chapters: 1, category: 'Epistles' },
  { name: '3 John', chapters: 1, category: 'Epistles' },
  { name: 'Jude', chapters: 1, category: 'Epistles' },
  { name: 'Revelation', chapters: 22, category: 'Apocalyptic' }
];

const TRANSLATIONS = [
  { id: 'esv', name: 'ESV Bible', desc: 'English Standard Version', badge: 'English' },
  { id: 'luo', name: 'Luo Bible', desc: 'Muma Maler (Dholuo)', badge: 'Luo' },
  { id: 'swahili', name: 'Swahili Bible', desc: 'Kiswahili Union Version', badge: 'Swahili' },
];

export default function BibleReader() {
  const [activeTab, setActiveTab] = useState<'browse' | 'search' | 'bookmarks'>('browse');
  const [selectedBook, setSelectedBook] = useState<string>('Genesis');
  const [selectedChapter, setSelectedChapter] = useState<number>(1);
  const [translation, setTranslation] = useState<string>('esv');
  
  // Chapter fetching states
  const [verses, setVerses] = useState<Verse[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Concordance search states
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<{ reference: string; text: string; theme: string }[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Bookmarks
  const [bookmarks, setBookmarks] = useState<BookmarkedVerse[]>([]);

  // Load bookmarks on mount
  useEffect(() => {
    const saved = localStorage.getItem('gimk_bible_bookmarks');
    if (saved) {
      try {
        setBookmarks(JSON.parse(saved));
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  // Fetch Chapter Verses
  const fetchChapter = async (bookName: string, chapterNum: number, trans: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.getBibleChapter(bookName, chapterNum, trans);
      if (res.success && res.verses) {
        setVerses(res.verses);
      } else {
        throw new Error("Failed to load scripture text");
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to retrieve scripture chapter. Please check connection and try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Trigger fetch when selection changes
  useEffect(() => {
    if (activeTab === 'browse') {
      fetchChapter(selectedBook, selectedChapter, translation);
    }
  }, [selectedBook, selectedChapter, translation, activeTab]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setSearchError(null);
    try {
      const res = await api.searchBible(searchQuery.trim(), translation);
      if (res.success && res.results) {
        setSearchResults(res.results);
      } else {
        throw new Error("No search results returned");
      }
    } catch (err: any) {
      console.error(err);
      setSearchError(err.message || "Concordance search failed. Please try a different query.");
    } finally {
      setIsSearching(false);
    }
  };

  // Bookmarking handlers
  const toggleBookmark = (verseObj: Verse) => {
    const id = `${selectedBook} ${selectedChapter}:${verseObj.verse}-${translation}`;
    const exists = bookmarks.some(b => b.id === id);

    let updated;
    if (exists) {
      updated = bookmarks.filter(b => b.id !== id);
    } else {
      const newBookmark: BookmarkedVerse = {
        id,
        book: selectedBook,
        chapter: selectedChapter,
        verse: verseObj.verse,
        text: verseObj.text,
        translation,
        reference: `${selectedBook} ${selectedChapter}:${verseObj.verse}`
      };
      updated = [...bookmarks, newBookmark];
    }

    setBookmarks(updated);
    localStorage.setItem('gimk_bible_bookmarks', JSON.stringify(updated));
  };

  const deleteBookmark = (id: string) => {
    const updated = bookmarks.filter(b => b.id !== id);
    setBookmarks(updated);
    localStorage.setItem('gimk_bible_bookmarks', JSON.stringify(updated));
  };

  const isVerseBookmarked = (verseNum: number) => {
    const id = `${selectedBook} ${selectedChapter}:${verseNum}-${translation}`;
    return bookmarks.some(b => b.id === id);
  };

  const bookData = BIBLE_BOOKS.find(b => b.name === selectedBook) || BIBLE_BOOKS[0];

  const handleNextChapter = () => {
    if (selectedChapter < bookData.chapters) {
      setSelectedChapter(prev => prev + 1);
    } else {
      const currentIdx = BIBLE_BOOKS.findIndex(b => b.name === selectedBook);
      if (currentIdx < BIBLE_BOOKS.length - 1) {
        setSelectedBook(BIBLE_BOOKS[currentIdx + 1].name);
        setSelectedChapter(1);
      }
    }
  };

  const handlePrevChapter = () => {
    if (selectedChapter > 1) {
      setSelectedChapter(prev => prev - 1);
    } else {
      const currentIdx = BIBLE_BOOKS.findIndex(b => b.name === selectedBook);
      if (currentIdx > 0) {
        const prevBook = BIBLE_BOOKS[currentIdx - 1];
        setSelectedBook(prevBook.name);
        setSelectedChapter(prevBook.chapters);
      }
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[650px]" id="bible-reader">
      {/* Header Tabs */}
      <div className="flex flex-col sm:flex-row bg-slate-50 border-b border-slate-200 items-stretch sm:items-center justify-between px-4 py-2 gap-2 shrink-0">
        <div className="flex gap-1.5 overflow-x-auto">
          <button
            onClick={() => setActiveTab('browse')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${activeTab === 'browse' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'}`}
          >
            <Book size={13} />
            <span>Bible Browser</span>
          </button>
          <button
            onClick={() => setActiveTab('search')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${activeTab === 'search' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'}`}
          >
            <Search size={13} />
            <span>Concordance Search</span>
          </button>
          <button
            onClick={() => setActiveTab('bookmarks')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${activeTab === 'bookmarks' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'}`}
          >
            <Bookmark size={13} />
            <span>Bookmarks ({bookmarks.length})</span>
          </button>
        </div>

        {/* Translation Selector Pill Bar */}
        <div className="flex items-center gap-1 bg-slate-200/60 p-1 rounded-xl self-end sm:self-auto border border-slate-300/40">
          {TRANSLATIONS.map(t => (
            <button
              key={t.id}
              onClick={() => setTranslation(t.id)}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider transition cursor-pointer select-none ${translation === t.id ? 'bg-white text-blue-700 shadow-sm font-extrabold' : 'text-slate-500 hover:text-slate-800'}`}
              title={t.desc}
            >
              {t.badge}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'browse' ? (
        <div className="flex flex-1 min-h-0 divide-x divide-slate-150">
          {/* Books and Chapters Selector Pane */}
          <div className="w-52 shrink-0 bg-slate-50 p-3 flex flex-col h-full overflow-y-auto">
            <h4 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-2 shrink-0">Select Book</h4>
            <div className="space-y-0.5 flex-1 overflow-y-auto pr-1">
              {BIBLE_BOOKS.map(book => (
                <button
                  key={book.name}
                  onClick={() => {
                    setSelectedBook(book.name);
                    setSelectedChapter(1);
                  }}
                  className={`w-full text-left px-2 py-1 rounded-md text-[11px] font-semibold flex items-center justify-between transition cursor-pointer ${selectedBook === book.name ? 'bg-blue-50 text-blue-800 font-extrabold border-l-2 border-blue-600' : 'text-slate-600 hover:bg-slate-100'}`}
                >
                  <span className="truncate">{book.name}</span>
                  <span className="text-[9px] text-slate-400 font-mono shrink-0 ml-1">{book.chapters} chs</span>
                </button>
              ))}
            </div>

            {/* Chapter Picker inside selector pane */}
            <div className="border-t border-slate-200 mt-3 pt-2 shrink-0">
              <h4 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1.5">Chapters</h4>
              <div className="grid grid-cols-4 gap-1 max-h-28 overflow-y-auto pr-1">
                {Array.from({ length: bookData.chapters }, (_, i) => i + 1).map(ch => (
                  <button
                    key={ch}
                    onClick={() => setSelectedChapter(ch)}
                    className={`h-6 w-full text-[10px] font-bold rounded flex items-center justify-center transition cursor-pointer ${selectedChapter === ch ? 'bg-blue-600 text-white' : 'bg-white hover:bg-slate-100 border border-slate-200 text-slate-700'}`}
                  >
                    {ch}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Verses Reading Pane */}
          <div className="flex-1 flex flex-col h-full bg-slate-50/20 overflow-hidden">
            {/* Nav Header */}
            <div className="px-5 py-3 bg-white border-b border-slate-200 flex items-center justify-between shrink-0 shadow-2xs">
              <div>
                <h3 className="text-sm font-black text-slate-900 tracking-tight flex items-center gap-1.5">
                  <span>{selectedBook}</span>
                  <span className="text-blue-600">Chapter {selectedChapter}</span>
                </h3>
                <p className="text-[9px] text-slate-400 uppercase tracking-widest font-bold">
                  {bookData.category} • {TRANSLATIONS.find(t => t.id === translation)?.desc}
                </p>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={handlePrevChapter}
                  className="p-1.5 hover:bg-slate-100 rounded-lg border border-slate-200 text-slate-600 cursor-pointer transition"
                  title="Previous Chapter"
                >
                  <ArrowLeft size={13} />
                </button>
                <span className="text-[10px] font-bold font-mono text-slate-500 bg-slate-150 px-2 py-0.5 rounded border border-slate-200/50">
                  {selectedChapter}/{bookData.chapters}
                </span>
                <button
                  onClick={handleNextChapter}
                  className="p-1.5 hover:bg-slate-100 rounded-lg border border-slate-200 text-slate-600 cursor-pointer transition"
                  title="Next Chapter"
                >
                  <ArrowRight size={13} />
                </button>
              </div>
            </div>

            {/* Verses Display */}
            <div className="flex-1 overflow-y-auto p-5 space-y-3 bg-white">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-400 space-y-3">
                  <Loader2 size={24} className="animate-spin text-blue-500" />
                  <p className="text-xs font-semibold">Retrieving official {TRANSLATIONS.find(t => t.id === translation)?.name} scripture...</p>
                </div>
              ) : error ? (
                <div className="flex flex-col items-center justify-center h-full max-w-sm mx-auto text-center space-y-4">
                  <div className="bg-rose-50 border border-rose-100 text-rose-800 p-4 rounded-xl text-xs font-semibold leading-relaxed">
                    ⚠️ {error}
                  </div>
                  <button 
                    onClick={() => fetchChapter(selectedBook, selectedChapter, translation)}
                    className="inline-flex items-center gap-1 px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold uppercase tracking-wider cursor-pointer shadow hover:bg-slate-800"
                  >
                    <RefreshCw size={13} />
                    <span>Retry Live Query</span>
                  </button>
                </div>
              ) : verses.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-400 space-y-2">
                  <Info size={20} className="text-slate-300" />
                  <p className="text-xs font-semibold">No verses found for this chapter.</p>
                </div>
              ) : (
                <div className="max-w-2xl mx-auto space-y-4 leading-relaxed pb-8">
                  <div className="bg-amber-50/50 border border-amber-100/60 p-3 rounded-xl text-[10px] text-amber-800 flex items-start gap-2 mb-2">
                    <Star size={14} className="text-amber-500 shrink-0 mt-0.5" />
                    <span>Click the bookmark icon beside any verse to save it permanently in your private beloved list.</span>
                  </div>
                  
                  {verses.map(v => (
                    <div key={v.verse} className="group flex gap-2 text-slate-800 hover:bg-slate-50/50 p-1.5 rounded-lg transition items-start">
                      <span className="text-[10px] font-extrabold text-blue-600 font-mono mt-1 w-6 select-none shrink-0 text-right">
                        {v.verse}
                      </span>
                      <p className="text-xs font-medium text-slate-700 flex-1">
                        {v.text}
                      </p>
                      <button
                        onClick={() => toggleBookmark(v)}
                        className={`opacity-0 group-hover:opacity-100 p-1 rounded-md transition cursor-pointer self-center ${isVerseBookmarked(v.verse) ? 'opacity-100 text-amber-500 bg-amber-50' : 'text-slate-300 hover:text-slate-500 hover:bg-slate-100'}`}
                        title={isVerseBookmarked(v.verse) ? "Remove Bookmark" : "Bookmark Verse"}
                      >
                        <Heart size={12} className={isVerseBookmarked(v.verse) ? 'fill-amber-400' : ''} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : activeTab === 'search' ? (
        /* Concordance search tab */
        <div className="flex-1 flex flex-col overflow-hidden bg-slate-50/20">
          <form onSubmit={handleSearch} className="p-4 bg-white border-b border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder={`Search the Holy Bible (${TRANSLATIONS.find(t => t.id === translation)?.name}) for words or themes...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-4 py-2 w-full border border-slate-200 focus:outline-hidden focus:ring-1 focus:ring-blue-500 rounded-lg text-xs"
                required
              />
            </div>
            <button
              type="submit"
              disabled={isSearching}
              className="px-5 py-2 bg-slate-900 text-white rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-slate-800 transition disabled:opacity-50 shrink-0 cursor-pointer flex items-center justify-center gap-1.5"
            >
              {isSearching ? <Loader2 size={13} className="animate-spin" /> : <Search size={13} />}
              <span>Search Scriptures</span>
            </button>
          </form>

          <div className="flex-1 overflow-y-auto p-5 bg-slate-50/30">
            {isSearching ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-400 space-y-3">
                <Loader2 size={24} className="animate-spin text-blue-500" />
                <p className="text-xs font-semibold">Running concordance query across {TRANSLATIONS.find(t => t.id === translation)?.name} database...</p>
              </div>
            ) : searchError ? (
              <div className="flex flex-col items-center justify-center h-full text-center max-w-sm mx-auto space-y-3">
                <div className="bg-rose-50 border border-rose-100 text-rose-800 p-4 rounded-xl text-xs font-semibold leading-relaxed">
                  ⚠️ {searchError}
                </div>
              </div>
            ) : searchResults.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center text-slate-400 space-y-2 p-6">
                <Search size={24} className="text-slate-300" />
                <h4 className="text-xs font-bold text-slate-600">Search the Live Word</h4>
                <p className="text-[11px] text-slate-400 max-w-xs mx-auto leading-relaxed">
                  Enter keyword queries like "faith", "love", "Muma Maler", or specific themes to search across {TRANSLATIONS.find(t => t.id === translation)?.desc}.
                </p>
              </div>
            ) : (
              <div className="space-y-4 max-w-3xl mx-auto pb-8">
                <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">
                  Query matches: {searchResults.length} verses found in {TRANSLATIONS.find(t => t.id === translation)?.name}
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {searchResults.map((s, idx) => (
                    <div
                      key={idx}
                      onClick={() => {
                        // Attempt to parse book and chapter to navigate
                        const parts = s.reference.split(' ');
                        const refChVer = parts.pop() || '';
                        const refBook = parts.join(' ');
                        const refCh = parseInt(refChVer.split(':')[0], 10) || 1;
                        setSelectedBook(refBook);
                        setSelectedChapter(refCh);
                        setActiveTab('browse');
                      }}
                      className="bg-white p-4 rounded-xl border border-slate-200 hover:border-blue-400 hover:shadow-xs transition duration-200 cursor-pointer flex flex-col justify-between space-y-3"
                    >
                      <div className="space-y-1.5">
                        <span className="inline-block text-[9px] font-extrabold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full uppercase tracking-wider">
                          {s.theme || 'Scripture'}
                        </span>
                        <p className="text-slate-700 text-xs leading-relaxed italic">
                          "{s.text}"
                        </p>
                      </div>
                      <div className="flex items-center justify-between text-xs font-extrabold text-slate-900 border-t border-slate-50 pt-2 shrink-0">
                        <span>{s.reference}</span>
                        <span className="text-blue-600 hover:underline inline-flex items-center gap-0.5">
                          <span>Browse</span>
                          <ChevronRight size={12} />
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Private bookmarked beloved scriptures list */
        <div className="flex-1 flex flex-col overflow-hidden bg-slate-50/20">
          <div className="p-4 bg-white border-b border-slate-200 flex justify-between items-center shrink-0">
            <div>
              <h4 className="text-xs font-bold text-slate-700">My Saved Scriptures</h4>
              <p className="text-[10px] text-slate-400">Personally bookmarked verses from various translations</p>
            </div>
            <span className="text-[10px] font-bold font-mono bg-slate-100 px-2.5 py-1 rounded-md border text-slate-600">
              {bookmarks.length} Bookmarks
            </span>
          </div>

          <div className="flex-1 overflow-y-auto p-5">
            {bookmarks.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center text-slate-400 space-y-2">
                <Bookmark size={24} className="text-slate-300" />
                <p className="text-xs font-semibold">Your bookmark ledger is empty</p>
                <p className="text-[11px] text-slate-400 max-w-xs leading-relaxed">
                  While browsing the scriptures, tap the heart button on the right of any verse to preserve it here for daily study.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl mx-auto pb-8">
                {bookmarks.map(b => (
                  <div
                    key={b.id}
                    className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs hover:border-blue-400 hover:shadow-xs transition duration-200 flex flex-col justify-between space-y-3"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="inline-block text-[8px] font-extrabold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full uppercase tracking-wider">
                          {TRANSLATIONS.find(t => t.id === b.translation)?.badge || b.translation}
                        </span>
                        <button
                          onClick={() => deleteBookmark(b.id)}
                          className="text-[10px] text-rose-500 font-bold hover:underline cursor-pointer"
                        >
                          Delete
                        </button>
                      </div>
                      <p className="text-slate-700 text-xs leading-relaxed">
                        "{b.text}"
                      </p>
                    </div>
                    <div className="flex items-center justify-between text-xs font-extrabold text-slate-900 border-t border-slate-50 pt-2 shrink-0">
                      <span>{b.reference}</span>
                      <button
                        onClick={() => {
                          setSelectedBook(b.book);
                          setSelectedChapter(b.chapter);
                          setTranslation(b.translation);
                          setActiveTab('browse');
                        }}
                        className="text-blue-600 hover:underline inline-flex items-center gap-0.5"
                      >
                        <span>Go to Chapter</span>
                        <ChevronRight size={12} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
