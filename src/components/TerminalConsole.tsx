import React, { useState, useRef, useEffect } from 'react';
import {
  Terminal as TerminalIcon,
  ListFilter,
  Trash2,
  Send,
  Sparkles,
  Search,
  CheckCircle,
  AlertCircle,
  FileText,
} from 'lucide-react';
import type { DmesgEntry, KernelLogLevel, KernelState } from '../kernel/types.ts';

interface TerminalConsoleProps {
  kernelState: KernelState;
  onExecuteCommand: (cmd: string) => void;
  onClearDmesg: () => void;
}

export const TerminalConsole: React.FC<TerminalConsoleProps> = ({
  kernelState,
  onExecuteCommand,
  onClearDmesg,
}) => {
  const [inputVal, setInputVal] = useState<string>('');
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const [dmesgFilter, setDmesgFilter] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');

  const terminalEndRef = useRef<HTMLDivElement>(null);
  const dmesgEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [kernelState.commandOutputHistory]);

  useEffect(() => {
    dmesgEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [kernelState.dmesg.length]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      if (!inputVal.trim()) return;
      onExecuteCommand(inputVal);
      setInputVal('');
      setHistoryIndex(-1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const history = kernelState.terminalHistory;
      if (history.length > 0) {
        const nextIndex = historyIndex === -1 ? history.length - 1 : Math.max(0, historyIndex - 1);
        setHistoryIndex(nextIndex);
        setInputVal(history[nextIndex]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const history = kernelState.terminalHistory;
      if (historyIndex !== -1) {
        const nextIndex = historyIndex + 1;
        if (nextIndex >= history.length) {
          setHistoryIndex(-1);
          setInputVal('');
        } else {
          setHistoryIndex(nextIndex);
          setInputVal(history[nextIndex]);
        }
      }
    }
  };

  const quickCommands = [
    'lsmod',
    'insmod hello_lkm.ko greet_count=4',
    'rmmod hello_lkm',
    'echo "Secure Kernel Stream" > /dev/kcrypto',
    'cat /dev/kcrypto',
    'cat /proc/sysmon',
    'modinfo kcrypto',
    'uname -a',
  ];

  const filteredDmesg = kernelState.dmesg.filter((entry) => {
    if (dmesgFilter !== 'ALL') {
      if (dmesgFilter === 'ERR' && !['KERN_ERR', 'KERN_EMERG', 'KERN_ALERT', 'KERN_CRIT'].includes(entry.level)) {
        return false;
      }
      if (dmesgFilter === 'WARN' && entry.level !== 'KERN_WARNING') {
        return false;
      }
      if (dmesgFilter === 'INFO' && entry.level !== 'KERN_INFO' && entry.level !== 'KERN_NOTICE') {
        return false;
      }
    }
    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      return (
        entry.message.toLowerCase().includes(lower) ||
        entry.facility.toLowerCase().includes(lower)
      );
    }
    return true;
  });

  const getDmesgLevelStyle = (level: KernelLogLevel) => {
    switch (level) {
      case 'KERN_EMERG':
      case 'KERN_ALERT':
      case 'KERN_CRIT':
        return 'text-red-400 bg-red-950/60 font-bold border-red-500/40';
      case 'KERN_ERR':
        return 'text-red-300 bg-red-950/40 font-semibold border-red-800/40';
      case 'KERN_WARNING':
        return 'text-amber-400 bg-amber-950/40 font-semibold border-amber-800/40';
      case 'KERN_NOTICE':
        return 'text-cyan-300 bg-cyan-950/30 border-cyan-800/30';
      case 'KERN_INFO':
      default:
        return 'text-slate-300 bg-slate-900/50 border-slate-800/50';
    }
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
      {/* Linux Kernel Shell */}
      <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden flex flex-col h-[600px] shadow-lg">
        {/* Shell Title Bar */}
        <div className="bg-slate-900 px-4 py-2.5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TerminalIcon className="w-4 h-4 text-amber-400" />
            <span className="font-mono text-xs font-bold text-slate-100">
              root@lkm-host:~# (Ring 3 Shell to Ring 0 Syscalls)
            </span>
          </div>
          <button
            onClick={() => onExecuteCommand('clear')}
            className="text-xs font-mono text-slate-400 hover:text-slate-200 transition"
          >
            clear
          </button>
        </div>

        {/* Quick Suggestion Chips */}
        <div className="bg-slate-900/40 px-3 py-2 border-b border-slate-800/80 flex items-center gap-1.5 overflow-x-auto text-[11px] font-mono">
          <span className="text-slate-500 shrink-0 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-amber-400" /> Quick:
          </span>
          {quickCommands.map((cmd) => (
            <button
              key={cmd}
              onClick={() => onExecuteCommand(cmd)}
              className="bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white px-2 py-0.5 rounded border border-slate-700 whitespace-nowrap transition"
            >
              {cmd}
            </button>
          ))}
        </div>

        {/* Terminal Output Stream */}
        <div className="flex-1 p-4 overflow-y-auto font-mono text-xs leading-relaxed space-y-3 select-text bg-slate-950/95">
          <div className="text-slate-500">
            Welcome to Linux Kernel Module interactive environment (Kernel 6.11.0-generic x86_64).
            <br />
            Type <span className="text-amber-400">help</span> to view available commands.
          </div>

          {kernelState.commandOutputHistory.map((item, idx) => (
            <div key={idx} className="space-y-1">
              <div className="flex items-center gap-2 text-slate-400">
                <span className="text-emerald-400 font-bold">root@lkm-host:~#</span>
                <span className="text-slate-100 font-bold">{item.command}</span>
                <span className="text-[10px] text-slate-600 ml-auto">{item.time}</span>
              </div>
              {item.output && item.output !== '__CLEAR__' && (
                <pre
                  className={`p-2.5 rounded border whitespace-pre-wrap ${
                    item.status === 1
                      ? 'bg-red-950/30 text-red-300 border-red-900/40'
                      : 'bg-slate-900/60 text-slate-200 border-slate-800/60'
                  }`}
                >
                  {item.output}
                </pre>
              )}
            </div>
          ))}
          <div ref={terminalEndRef} />
        </div>

        {/* Command Input Prompt */}
        <div className="bg-slate-900 p-2.5 border-t border-slate-800 flex items-center gap-2">
          <span className="text-emerald-400 font-mono text-xs font-bold shrink-0">
            root@lkm-host:~#
          </span>
          <input
            ref={inputRef}
            type="text"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="e.g. lsmod, insmod hello_lkm.ko, cat /dev/kcrypto, help"
            className="flex-1 bg-transparent text-slate-100 text-xs font-mono focus:outline-none placeholder:text-slate-600"
          />
          <button
            onClick={() => {
              if (inputVal.trim()) {
                onExecuteCommand(inputVal);
                setInputVal('');
              }
            }}
            className="p-1.5 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 transition font-bold"
            title="Execute command"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Kernel Ring Buffer (dmesg -wH) */}
      <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden flex flex-col h-[600px] shadow-lg">
        {/* Dmesg Title & Filter Bar */}
        <div className="bg-slate-900 px-4 py-2.5 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-mono text-xs font-bold text-slate-100">
              Kernel Ring Buffer (dmesg -wH)
            </span>
            <span className="text-[11px] font-mono text-slate-500">
              [{filteredDmesg.length} events]
            </span>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-slate-950 px-2 py-0.5 rounded border border-slate-800 text-xs">
              <Search className="w-3 h-3 text-slate-500" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Filter logs..."
                className="bg-transparent text-slate-200 text-[11px] font-mono focus:outline-none w-24"
              />
            </div>

            <div className="flex items-center gap-1 text-[11px] font-mono">
              {(['ALL', 'INFO', 'WARN', 'ERR'] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setDmesgFilter(filter)}
                  className={`px-2 py-0.5 rounded transition ${
                    dmesgFilter === filter
                      ? 'bg-amber-500 text-slate-950 font-bold'
                      : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>

            <button
              onClick={onClearDmesg}
              className="p-1 text-slate-400 hover:text-red-400 transition"
              title="Clear ring buffer (dmesg -c)"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Dmesg Log List */}
        <div className="flex-1 p-3 overflow-y-auto font-mono text-xs leading-relaxed space-y-1.5 select-text bg-slate-950">
          {filteredDmesg.length === 0 ? (
            <div className="text-center py-12 text-slate-600 font-mono text-xs">
              No matching dmesg entries found.
            </div>
          ) : (
            filteredDmesg.map((entry) => (
              <div
                key={entry.id}
                className="flex items-start gap-2 hover:bg-slate-900/50 p-1 rounded transition text-[11px]"
              >
                <span className="text-slate-500 shrink-0 select-none">
                  [{entry.timestamp.toFixed(6).padStart(11, ' ')}]
                </span>
                <span
                  className={`px-1.5 py-0.2 rounded text-[10px] font-bold border shrink-0 ${getDmesgLevelStyle(
                    entry.level
                  )}`}
                >
                  {entry.facility}
                </span>
                <span
                  className={`break-all ${
                    entry.level === 'KERN_EMERG' || entry.level === 'KERN_ALERT'
                      ? 'text-red-300 font-bold'
                      : entry.level === 'KERN_WARNING'
                      ? 'text-amber-300'
                      : 'text-slate-200'
                  }`}
                >
                  {entry.message}
                </span>
              </div>
            ))
          )}
          <div ref={dmesgEndRef} />
        </div>
      </div>
    </div>
  );
};
