import React from 'react';
import { Download, FileJson, FileSpreadsheet } from 'lucide-react';

export function GrafanaExportBar({ activeCount = 0, onExport }) {
  return (
    <div className="grafana-panel p-3 flex flex-col sm:flex-row items-center justify-between gap-3 font-mono">
      <div className="flex items-center gap-2">
        <Download size={14} className="text-[#58a6ff]" />
        <span className="grafana-panel-title">REPORT EXPORT PIPELINE</span>
        <span className="text-[10px] text-[#8b949e]">
          SCOPED TO ACTIVE THREAT STREAM FILTER
        </span>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => onExport('json')}
          className="flex items-center gap-1.5 px-3 py-1 rounded bg-[#21262d] hover:bg-[#30363d] border border-[#30363d] text-xs text-[#c9d1d9] transition"
        >
          <FileJson size={13} className="text-[#a371f7]" />
          EXPORT FILTERED JSON ({activeCount} EVENTS)
        </button>

        <button
          onClick={() => onExport('csv')}
          className="flex items-center gap-1.5 px-3 py-1 rounded bg-[#21262d] hover:bg-[#30363d] border border-[#30363d] text-xs text-[#c9d1d9] transition"
        >
          <FileSpreadsheet size={13} className="text-[#3fb950]" />
          EXPORT FILTERED CSV ({activeCount} EVENTS)
        </button>
      </div>
    </div>
  );
}
