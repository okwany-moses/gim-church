import React, { useRef } from 'react';
import { 
  X, 
  Printer, 
  Shield, 
  IdCard, 
  MapPin, 
  Calendar, 
  Phone,
  Layers
} from 'lucide-react';
import { Member, Branch, CellGroup } from '../types.js';

interface MemberIdCardModalProps {
  member: Member;
  branches: Branch[];
  cellGroups: CellGroup[];
  isOpen: boolean;
  onClose: () => void;
}

export default function MemberIdCardModal({
  member,
  branches,
  cellGroups,
  isOpen,
  onClose
}: MemberIdCardModalProps) {
  const printAreaRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  // Resolve Branch and Cell Group Names
  const branchName = member.branch_name || branches.find(b => b.id === member.branch_id)?.name || 'HQ Branch';
  const cellGroupName = member.cell_group_name || cellGroups.find(cg => cg.id === member.cell_group_id)?.name || 'General';

  // Get formatted registration number (fallback if missing)
  const regNo = member.reg_number || `GIMK-${String(member.id).padStart(4, '0')}`;

  const handlePrint = () => {
    // Elegant printing mechanism using window.print() but targeting the ID Card via print CSS
    window.print();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/65 backdrop-blur-xs flex items-center justify-center p-4 z-[250] print:bg-white print:p-0 print:static print:inset-auto">
      {/* Container wrapper */}
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-100 flex flex-col max-h-[90vh] print:shadow-none print:border-none print:static print:max-h-full print:w-auto">
        
        {/* Modal Header (Hidden on print) */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 print:hidden shrink-0">
          <div className="flex items-center gap-2">
            <IdCard className="text-amber-400" size={18} />
            <h3 className="font-extrabold text-sm uppercase tracking-wider">Member ID Card Generator</h3>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-white transition cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body / Scrollable section */}
        <div className="p-6 md:p-8 space-y-8 overflow-y-auto print:p-0 print:overflow-visible flex-1">
          
          {/* Quick Notice (Hidden on print) */}
          <div className="bg-blue-50/70 border border-blue-100/80 p-3.5 rounded-xl flex items-start gap-2.5 text-xs text-blue-800 leading-relaxed print:hidden">
            <Shield className="text-blue-600 shrink-0 mt-0.5" size={16} />
            <div>
              <strong className="font-extrabold block mb-0.5">Professional Print Ready</strong>
              <span>This card has been pre-formatted for standard credit card sizing <span className="font-bold">(3.375" x 2.125")</span>. When printing, select "Print background graphics" and choose "Save as PDF" or send to a PVC badge printer.</span>
            </div>
          </div>

          {/* Printable Layout Container */}
          <div 
            ref={printAreaRef}
            className="flex flex-col md:flex-row items-center justify-center gap-6 md:gap-8 py-4 print:py-0 print:flex-col print:gap-12"
          >
            {/* FRONT SIDE CARD */}
            <div 
              id="gimk-id-card-front"
              className="relative w-[340px] h-[216px] rounded-xl overflow-hidden border border-slate-200/80 shadow-lg bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 text-white flex flex-col justify-between p-4 select-none shrink-0 print:shadow-none print:border print:border-slate-400 print:page-break-inside-avoid print:my-4"
              style={{ contentVisibility: 'auto' }}
            >
              {/* Card watermark overlay */}
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(59,130,246,0.1),transparent_70%)] pointer-events-none" />
              <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-slate-950/80 to-transparent pointer-events-none" />
              <div className="absolute top-0 right-0 w-32 h-32 bg-[radial-gradient(circle_at_top_right,rgba(234,179,8,0.06),transparent_70%)] pointer-events-none" />

              {/* Card Header */}
              <div className="flex items-start justify-between border-b border-white/10 pb-2 z-10 shrink-0">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center overflow-hidden border border-white/20 p-0.5">
                    <span className="text-[10px] font-black text-blue-900 tracking-tighter">GIMK</span>
                  </div>
                  <div>
                    <h4 className="text-[9px] font-black uppercase tracking-wider leading-tight text-white">Gideons International</h4>
                    <p className="text-[7px] text-slate-300 font-bold uppercase tracking-widest leading-none">Ministries Kenya</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[6px] font-black bg-amber-400/90 text-slate-950 px-1.5 py-0.5 rounded-sm uppercase tracking-wider block">Official Member</span>
                </div>
              </div>

              {/* Card Middle Content */}
              <div className="flex items-center gap-4 py-2 z-10 flex-1">
                {/* ID Photo Placeholder */}
                <div className="w-18 h-18 rounded-lg bg-slate-800 border-2 border-amber-400/80 flex flex-col items-center justify-center relative overflow-hidden shrink-0 shadow-inner">
                  <div className="w-14 h-14 rounded-full bg-slate-700/80 border border-slate-600 flex items-center justify-center text-slate-300 text-lg font-black uppercase">
                    {member.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                  </div>
                  <div className="absolute bottom-0 inset-x-0 bg-slate-950/80 py-0.5 text-[6px] text-center font-bold text-slate-400 tracking-wider">
                    MEMB
                  </div>
                </div>

                {/* Info Text */}
                <div className="flex-1 space-y-1 text-left min-w-0">
                  <h3 className="text-xs font-black text-white leading-tight truncate uppercase tracking-wide">
                    {member.name}
                  </h3>
                  
                  <div className="grid grid-cols-1 gap-0.5 text-[8px] text-slate-300">
                    <div className="flex items-center gap-1 truncate">
                      <Layers size={8} className="text-amber-400/80 shrink-0" />
                      <span className="font-medium">Branch:</span>
                      <span className="font-extrabold text-white truncate">{branchName}</span>
                    </div>
                    <div className="flex items-center gap-1 truncate">
                      <MapPin size={8} className="text-amber-400/80 shrink-0" />
                      <span className="font-medium">Cell Group:</span>
                      <span className="font-extrabold text-white truncate">{cellGroupName}</span>
                    </div>
                    <div className="flex items-center gap-1 truncate">
                      <Calendar size={8} className="text-amber-400/80 shrink-0" />
                      <span className="font-medium">Join Date:</span>
                      <span className="font-extrabold text-white">{member.join_date}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Card Footer */}
              <div className="flex items-end justify-between border-t border-white/5 pt-1.5 z-10 shrink-0">
                <div className="space-y-0.5 text-left">
                  <span className="text-[6px] text-slate-400 block uppercase font-bold">MEMBER ID NO.</span>
                  <span className="text-[10px] font-mono font-black text-amber-400 tracking-wider leading-none">
                    {regNo}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 bg-slate-900/50 border border-white/5 px-2 py-0.5 rounded-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  <span className="text-[7px] text-slate-300 font-extrabold uppercase tracking-widest">{member.status}</span>
                </div>
              </div>
            </div>

            {/* BACK SIDE CARD */}
            <div 
              id="gimk-id-card-back"
              className="relative w-[340px] h-[216px] rounded-xl overflow-hidden border border-slate-200/80 shadow-lg bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 text-slate-300 flex flex-col justify-between p-4 select-none shrink-0 print:shadow-none print:border print:border-slate-400 print:page-break-inside-avoid print:my-4"
            >
              {/* Fine Print / Contact */}
              <div className="space-y-2 text-left z-10">
                <h5 className="text-[7px] font-extrabold uppercase tracking-wider text-amber-400 border-b border-white/10 pb-1">
                  TERMS AND CONDITIONS OF USE
                </h5>
                <p className="text-[6px] text-slate-400 leading-normal font-medium">
                  1. This card is official identification for Gideons International Ministries Kenya (GIMK).
                  <br />
                  2. It is non-transferable and remains the sole property of GIMK Church Registry.
                  <br />
                  3. If lost or stolen, report immediately to the Church Administration Office.
                  <br />
                  4. Subject to revocation upon cessation of active fellowship or as per church directives.
                </p>
              </div>

              {/* Barcode & Security Area */}
              <div className="flex items-center justify-between gap-4 py-2 z-10">
                {/* Styled Barcode Mock */}
                <div className="bg-white p-1 rounded-sm shrink-0 flex flex-col items-center justify-center">
                  <div className="flex items-end h-8 gap-0.5 w-32 bg-white px-1">
                    {[1,3,1,2,1,4,1,2,3,1,2,1,4,2,1,3,1,2,1,3,1,4,1,2,1].map((w, idx) => (
                      <div 
                        key={idx} 
                        className="bg-black h-full" 
                        style={{ width: `${w * 1}px` }}
                      />
                    ))}
                  </div>
                  <span className="text-[6px] font-mono text-slate-900 font-bold tracking-widest mt-0.5">
                    {regNo}
                  </span>
                </div>

                {/* Signature Section */}
                <div className="flex-1 text-center border-l border-white/10 pl-4 space-y-1">
                  <div className="font-serif text-[10px] italic text-slate-400/80 select-none pointer-events-none font-medium">
                    Apostle M. Okwany
                  </div>
                  <div className="border-t border-slate-500/50 w-full pt-1">
                    <span className="text-[6px] text-slate-400 block uppercase font-bold tracking-wider">
                      ADMINISTRATOR SIGNATURE
                    </span>
                  </div>
                </div>
              </div>

              {/* Footer Return Address */}
              <div className="border-t border-white/5 pt-1.5 flex items-center justify-between text-[6px] text-slate-400 font-bold uppercase tracking-wider z-10 shrink-0">
                <div className="flex items-center gap-1">
                  <MapPin size={6} className="text-amber-400 shrink-0" />
                  <span>Ramba-Kabondo Headquarters, Kenya</span>
                </div>
                <span>gimk.org</span>
              </div>
            </div>
          </div>

        </div>

        {/* Modal Footer (Hidden on print) */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between print:hidden shrink-0">
          <div className="text-[11px] text-slate-500 font-medium">
            Click Print to output directly to standard ID badge card format.
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-slate-200 hover:bg-slate-100 text-slate-600 rounded-lg text-xs font-semibold cursor-pointer transition"
            >
              Close
            </button>
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-md transition cursor-pointer"
            >
              <Printer size={14} />
              <span>Print Member ID</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
