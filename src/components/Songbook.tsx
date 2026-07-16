import React, { useState, useEffect } from 'react';
import { Music, FileText, ExternalLink, Eye, Info } from 'lucide-react';
import { Hymn } from '../types.js';
import { api } from '../api.js';

interface SongbookProps {
  hymns: Hymn[];
}

export default function Songbook({ hymns }: SongbookProps) {
  const [pdfLink, setPdfLink] = useState<string>(() => {
    return localStorage.getItem('gimk_songbook_pdf') || '';
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    setIsLoading(true);
    api.getSetting('songbook_pdf_url')
      .then(res => {
        if (res && res.value) {
          setPdfLink(res.value);
          localStorage.setItem('gimk_songbook_pdf', res.value);
        }
      })
      .catch(err => {
        console.error('Failed to load songbook setting:', err);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

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
                <h4 className="text-xs font-bold text-slate-900">Custom Songbook Connected</h4>
                <p className="text-xs text-slate-600 leading-relaxed mt-1">
                  Welcome to the GIMK digital songbook. Below is the custom worship document uploaded by the ministry administrators.
                </p>
              </div>
            </div>
          </div>

          {/* Interactive Document Viewer Stage */}
          {isLoading ? (
            <div className="bg-white border border-slate-200 rounded-xl p-8 text-center space-y-2">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-slate-300 border-t-blue-600" style={{ borderTopColor: '#2563eb' }} />
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Loading GIMK Songbook PDF...</p>
            </div>
          ) : pdfLink ? (
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

              <div className="bg-slate-100 border border-slate-200 rounded-xl overflow-hidden h-[450px] relative shadow-sm">
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
                <h4 className="text-xs font-bold text-slate-700">No Songbook Linked Yet</h4>
                <p className="text-[11px] text-slate-400 max-w-sm mx-auto mt-1 leading-relaxed">
                  Your church administrators have not linked a GIMK worship book URL yet. Once configured, the document viewer will display here automatically.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
