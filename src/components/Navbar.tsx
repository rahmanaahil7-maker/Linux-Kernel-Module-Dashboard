import React from 'react';
import {
  Terminal,
  Cpu,
  Layers,
  ShieldAlert,
  Download,
  RotateCcw,
  BookOpen,
  Radio,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import type { KernelState } from '../kernel/types.ts';

interface NavbarProps {
  kernelState: KernelState;
  activeTab: 'workbench' | 'architecture' | 'terminal' | 'chardev' | 'netfilter' | 'panic';
  setActiveTab: (tab: 'workbench' | 'architecture' | 'terminal' | 'chardev' | 'netfilter' | 'panic') => void;
  onResetKernel: () => void;
  onOpenGuide: () => void;
  onExportCode: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  kernelState,
  activeTab,
  setActiveTab,
  onResetKernel,
  onOpenGuide,
  onExportCode,
}) => {
  const loadedCount = kernelState.modules.filter((m) => m.status === 'loaded').length;
  const isPanicked = kernelState.panicState.isPanicked;

  const navItems: Array<{
    id: 'workbench' | 'architecture' | 'terminal' | 'chardev' | 'netfilter' | 'panic';
    label: string;
    icon: React.ReactNode;
    badge?: string;
  }> = [
    {
      id: 'workbench',
      label: 'Module Workbench',
      icon: <Layers className="w-4 h-4" />,
      badge: `${loadedCount} loaded`,
    },
    {
      id: 'architecture',
      label: 'Ring 0 vs Ring 3',
      icon: <Cpu className="w-4 h-4" />,
    },
    {
      id: 'terminal',
      label: 'Kernel Terminal & dmesg',
      icon: <Terminal className="w-4 h-4" />,
      badge: `${kernelState.dmesg.length}`,
    },
    {
      id: 'chardev',
      label: 'Device Driver Test Bench',
      icon: <Radio className="w-4 h-4" />,
      badge: kernelState.modules.find((m) => m.id === 'kcrypto')?.status === 'loaded' ? 'Active' : 'Offline',
    },
    {
      id: 'netfilter',
      label: 'Netfilter Packet Hook',
      icon: <CheckCircle2 className="w-4 h-4" />,
    },
    {
      id: 'panic',
      label: 'Kernel Oops & Panic Lab',
      icon: <AlertTriangle className="w-4 h-4 text-amber-400" />,
      badge: isPanicked ? 'PANIC!' : undefined,
    },
  ];

  return (
    <header className="bg-slate-950 border-b border-slate-800 text-slate-100 select-none sticky top-0 z-40">
      {/* Top status line */}
      <div className="max-w-7xl mx-auto px-4 py-2 flex flex-wrap items-center justify-between gap-3 text-xs border-b border-slate-900 bg-slate-950/80">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 font-mono">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-slate-400">KERNEL:</span>
            <span className="text-emerald-400 font-semibold">{kernelState.kernelVersion}</span>
            <span className="text-slate-600">|</span>
            <span className="text-slate-400">{kernelState.arch}</span>
          </div>

          <div className="hidden sm:flex items-center gap-2 font-mono text-slate-400">
            <span>UPTIME:</span>
            <span className="text-slate-200">{kernelState.uptimeSeconds.toFixed(1)}s</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isPanicked ? (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-red-950/80 border border-red-500/60 text-red-300 font-mono animate-pulse">
              <ShieldAlert className="w-3.5 h-3.5 text-red-400" />
              <span>KERNEL PANIC OCCURRED</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-emerald-950/40 border border-emerald-800/50 text-emerald-300 font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span>RING 0 HEALTHY</span>
            </div>
          )}

          <button
            onClick={onExportCode}
            className="flex items-center gap-1.5 px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded border border-slate-700 transition text-xs font-medium"
            title="Download full C source code, Makefile, and test suite"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export C Project</span>
          </button>

          <button
            onClick={onOpenGuide}
            className="flex items-center gap-1.5 px-3 py-1 bg-cyan-950/60 hover:bg-cyan-900/60 text-cyan-300 border border-cyan-800/70 rounded transition text-xs font-medium"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Real Linux Guide</span>
          </button>

          <button
            onClick={onResetKernel}
            className="flex items-center gap-1.5 px-3 py-1 bg-red-950/50 hover:bg-red-900/60 text-red-300 border border-red-800/70 rounded transition text-xs font-medium"
            title="Warm reboot kernel simulator state"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Warm Reboot</span>
          </button>
        </div>
      </div>

      {/* Main Brand & Tab Navigation */}
      <div className="max-w-7xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-500/20 via-orange-600/20 to-red-600/20 border border-amber-500/40 flex items-center justify-center shadow-lg shadow-amber-950/30">
            <span className="font-mono text-xl font-black text-amber-400">🐧</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-mono font-bold text-lg text-slate-100 tracking-tight">
                K-MOD <span className="text-amber-400">Studio</span>
              </h1>
              <span className="px-2 py-0.5 text-[10px] uppercase font-mono font-bold tracking-wider rounded bg-slate-800 text-amber-300 border border-slate-700">
                LKM Ring 0 Lab
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Linux Kernel Module Architect, Device Driver Engine & Ring 0 Sandbox
            </p>
          </div>
        </div>

        {/* Tab navigation buttons */}
        <nav className="flex flex-wrap items-center gap-1.5 bg-slate-900/80 p-1 rounded-lg border border-slate-800/80">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition ${
                  isActive
                    ? 'bg-amber-500 text-slate-950 font-semibold shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
                {item.badge && (
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
                      isActive
                        ? 'bg-slate-950/20 text-slate-950 font-bold'
                        : item.badge === 'PANIC!'
                        ? 'bg-red-500/30 text-red-300 border border-red-500/50'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
};
