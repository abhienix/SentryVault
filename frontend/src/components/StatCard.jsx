import React from 'react';

export const StatCard = ({ title, value, icon: Icon, subtext, color = "blue" }) => {
  return (
    <div className="bg-white rounded border-2 border-slate-300 shadow-sm overflow-hidden">
      <div className="bg-[#003366] text-white px-4 py-1.5 text-xs font-bold uppercase tracking-wider flex items-center justify-between border-b border-[#002244]">
        <span>{title}</span>
        {Icon && <Icon className="w-4 h-4 text-sky-200" />}
      </div>
      <div className="p-4 bg-slate-50">
        <h3 className="text-2xl font-extrabold text-slate-900 font-mono tracking-tight">{value}</h3>
        {subtext && <p className="text-xs text-slate-500 font-semibold mt-1 font-sans">{subtext}</p>}
      </div>
    </div>
  );
};
