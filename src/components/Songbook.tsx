import React, { useState, useEffect } from 'react';
import { Music, FileText, ExternalLink, Link, Eye, Info, CheckCircle } from 'lucide-react';
import { Hymn } from '../types.js';

interface SongbookProps {
  hymns: Hymn[];
}

export default function Songbook({ hymns }: SongbookProps) {
  // Read initial PDF link from localStorage or default to a placeholder
  const [pdfLink, setPdfLink] = useState<string>(() => {
    return localStorage.getItem('gimk_songbook_pdf') || '';
  });
  const [inputUrl, setInputUrl] = useState(pdfLink);
  const [showSavedToast, setShowSavedToast] = useState(false);

  const handleSavePdf = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('gimk_songbook_pdf', inputUrl.trim());
    setPdfLink(inputUrl.trim());
    setShowSavedToast(true);
    setTimeout(() => setShowSavedToast(false), 3000);
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[650px]" id="songbook-section">
      {/* Header */}
      <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <div className="bg-blue-100 p-2 rounded-lg text-blue-700">
            <Music size={18} />
          </div>
          <div>
            <h2 className="text-sm font-black text-slate-900 tracking-tight">GIMK Digital Songbook & Hymnal</h2>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Official Custom Worship Resources</p>
          </div>
        </div>
        <div className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest hidden sm:block">
          Hymnal Book Viewer
        </div>
      </div>

      <div className="flex-1 flex flex-col min-h-0 bg-slate-50/20 p-6 overflow-y-auto">
        <div className="max-w-3xl mx-auto w-full space-y-6">
          {/* Informational Clean-up Card */}
          <div className="bg-white border border-blue-100 rounded-xl p-5 shadow-2xs space-y-3">
            <div className="flex items-start gap-3">
              <Info className="text-blue-600 mt-0.5 shrink-0" size={16} />
              <div>
                <h4 className="text-xs font-bold text-slate-900">Custom Songbook Section Ready</h4>
                <p className="text-xs text-slate-600 leading-relaxed mt-1">
                  According to your instructions, all preset template songs and multi-language translation columns have been cleared. 
                  This section is now a dedicated workspace for your upcoming custom GIMK Hymnal Book or PDF document.
                </p>
              </div>
            </div>
          </div>

          {/* Setup / Configuration Form */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <Link className="text-blue-600" size={15} />
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Configure GIMK Hymnal Document Link</h3>
            </div>

            <form onSubmit={handleSavePdf} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                  Songbook Book / PDF URL Link
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={inputUrl}
                    onChange={(e) => setInputUrl(e.target.value)}
                    placeholder="https://example.com/your-gimk-hymnal.pdf"
                    className="flex-1 px-3 py-2 border border-slate-200 focus:outline-hidden focus:ring-1 focus:ring-blue-500 rounded-lg text-xs"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-slate-800 transition shrink-0 cursor-pointer"
                  >
                    Save Config
                  </button>
                </div>
                <p className="text-[10px] text-slate-400">
                  Paste the direct link to your PDF, Google Drive doc, or online songbook resource. It will be saved instantly.
                </p>
              </div>
            </form>

            {showSavedToast && (
              <div className="flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 border border-emerald-100 p-2.5 rounded-lg font-semibold animate-in fade-in duration-200">
                <CheckCircle size={14} />
                <span>Link updated successfully! The document below is now connected.</span>
              </div>
            )}
          </div>

          {/* Interactive Document Viewer Stage */}
          {pdfLink ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Eye size={12} className="text-blue-500" />
                  <span>Active Connected Document Preview</span>
                </span>
                <a
                  href={pdfLink}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1"
                >
                  <span>Open in New Tab</span>
                  <ExternalLink size={12} />
                </a>
              </div>

              <div className="bg-slate-100 border border-slate-200 rounded-xl overflow-hidden h-[320px] relative shadow-sm">
                <iframe
                  src={pdfLink}
                  title="GIMK Connected Songbook Document"
                  className="w-full h-full border-none"
                  sandbox="allow-scripts allow-same-origin allow-popups"
                />
              </div>
            </div>
          ) : (
            <div className="bg-slate-50 border border-dashed border-slate-200 rounded-xl p-8 text-center space-y-3">
              <div className="mx-auto w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                <FileText size={20} />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-700">No Songbook Link Provided Yet</h4>
                <p className="text-[11px] text-slate-400 max-w-sm mx-auto mt-1 leading-relaxed">
                  Enter the URL above to integrate your custom GIMK praise book. The digital interactive viewer will automatically boot once the URL is linked.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
