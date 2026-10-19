import React, { useState } from 'react';
import {
  Radio,
  Send,
  Download,
  Key,
  RotateCcw,
  Sliders,
  CheckCircle,
  FileCode,
  HardDrive,
  Cpu,
  Layers,
} from 'lucide-react';
import type { KernelState } from '../kernel/types.ts';

interface CharDeviceTestBenchProps {
  kernelState: KernelState;
  onWrite: (text: string, algo?: 'plain' | 'xor' | 'caesar' | 'rot13', key?: number) => void;
  onRead: () => void;
  onIoctl: (cmd: 'RESET_BUF' | 'SET_KEY' | 'SET_ALGO', paramValue?: number | string) => void;
  onLoadModule: (moduleId: string) => void;
}

export const CharDeviceTestBench: React.FC<CharDeviceTestBenchProps> = ({
  kernelState,
  onWrite,
  onRead,
  onIoctl,
  onLoadModule,
}) => {
  const [inputText, setInputText] = useState<string>('Secret Message from Ring 3 to Ring 0!');
  const [selectedAlgo, setSelectedAlgo] = useState<'plain' | 'xor' | 'caesar' | 'rot13'>('rot13');
  const [selectedKey, setSelectedKey] = useState<number>(13);

  const kcryptoMod = kernelState.modules.find((m) => m.id === 'kcrypto');
  const isLoaded = kcryptoMod?.status === 'loaded';
  const charBuffer = kernelState.charBuffer;

  const handleWriteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    onWrite(inputText, selectedAlgo, selectedKey);
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Device Driver Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Radio className="w-5 h-5 text-amber-400" />
            <h2 className="font-mono text-base font-bold text-slate-100">
              Character Device Driver Workbench: <span className="text-amber-400">/dev/kcrypto</span>
            </h2>
            <span
              className={`text-xs px-2 py-0.5 rounded font-mono font-medium ${
                isLoaded
                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                  : 'bg-red-950 text-red-300 border border-red-800'
              }`}
            >
              {isLoaded ? 'Device Active (Major: 240, Minor: 0)' : 'Module Not Loaded'}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1 max-w-3xl">
            Character device drivers expose a sequential stream of bytes. Applications in User Space (Ring 3) read and write to <code className="text-slate-300">/dev/kcrypto</code> using standard POSIX file descriptors, triggering <code className="text-emerald-400">copy_from_user()</code> and <code className="text-emerald-400">copy_to_user()</code>.
          </p>
        </div>

        {!isLoaded && (
          <button
            onClick={() => onLoadModule('kcrypto')}
            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded text-xs font-mono transition"
          >
            Insert kcrypto.ko into Ring 0
          </button>
        )}
      </div>

      {/* Main Workbench Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* User-Space I/O Test Controls */}
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 flex flex-col justify-between shadow-lg">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <span className="font-mono text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                <FileCode className="w-4 h-4 text-cyan-400" />
                Ring 3 User-Space Client Interface
              </span>
              <span className="text-[11px] font-mono text-slate-500">
                syscalls: write(2), read(2), ioctl(2)
              </span>
            </div>

            <form onSubmit={handleWriteSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-slate-300 mb-1.5">
                  Payload to write() to /dev/kcrypto:
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder="Enter plaintext message..."
                    disabled={!isLoaded}
                    className="flex-1 bg-slate-900 border border-slate-700 text-slate-100 rounded px-3 py-2 text-xs font-mono focus:border-amber-500 focus:outline-none disabled:opacity-50"
                  />
                  <button
                    type="submit"
                    disabled={!isLoaded}
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded text-xs font-mono transition flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>write()</span>
                  </button>
                </div>
              </div>

              {/* Algorithm & Key Settings */}
              <div className="grid grid-cols-2 gap-3 bg-slate-900/60 p-3 rounded-lg border border-slate-800/80">
                <div>
                  <label className="block text-[11px] font-mono text-slate-400 mb-1">
                    Cipher Algorithm:
                  </label>
                  <select
                    value={selectedAlgo}
                    onChange={(e) => {
                      const val = e.target.value as any;
                      setSelectedAlgo(val);
                      if (isLoaded) onIoctl('SET_ALGO', val);
                    }}
                    disabled={!isLoaded}
                    className="w-full bg-slate-950 border border-slate-700 text-slate-200 rounded px-2.5 py-1.5 text-xs font-mono focus:border-amber-500 focus:outline-none disabled:opacity-50"
                  >
                    <option value="rot13">ROT13 (Caesar 13)</option>
                    <option value="xor">XOR Bitwise Cipher</option>
                    <option value="caesar">Caesar Key Shift</option>
                    <option value="plain">Plain (Pass-through)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-mono text-slate-400 mb-1">
                    Cipher Key (ioctl): {selectedKey}
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="50"
                    value={selectedKey}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setSelectedKey(val);
                      if (isLoaded) onIoctl('SET_KEY', val);
                    }}
                    disabled={!isLoaded}
                    className="w-full accent-amber-500"
                  />
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex flex-wrap gap-2 pt-2">
                <button
                  type="button"
                  onClick={onRead}
                  disabled={!isLoaded}
                  className="flex-1 py-2 px-3 bg-cyan-950/80 hover:bg-cyan-900 text-cyan-300 border border-cyan-800 rounded text-xs font-mono font-medium transition flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>read() from /dev/kcrypto</span>
                </button>

                <button
                  type="button"
                  onClick={() => onIoctl('RESET_BUF')}
                  disabled={!isLoaded}
                  className="py-2 px-3 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 rounded text-xs font-mono font-medium transition flex items-center gap-1.5 disabled:opacity-50"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>ioctl(RESET_BUF)</span>
                </button>
              </div>
            </form>
          </div>

          {/* User Space Code Snippet */}
          <div className="mt-5 pt-4 border-t border-slate-800/80 font-mono text-[11px] text-slate-400 bg-slate-950 p-2.5 rounded border border-slate-800">
            <span className="text-slate-500 block mb-1">// What the user application runs in C:</span>
            <span className="text-purple-400">int</span> fd = open(<span className="text-amber-300">&quot;/dev/kcrypto&quot;</span>, O_RDWR);<br />
            write(fd, msg, strlen(msg)); <span className="text-slate-500">// -&gt; sys_write</span><br />
            ioctl(fd, KCRYPTO_IOCTL_SET_KEY, &amp;key); <span className="text-slate-500">// -&gt; sys_ioctl</span><br />
            read(fd, buffer, <span className="text-cyan-300">1024</span>); <span className="text-slate-500">// -&gt; sys_read</span>
          </div>
        </div>

        {/* Ring 0 Kernel Buffer & Hardware Device State */}
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 flex flex-col justify-between shadow-lg">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <span className="font-mono text-xs font-bold text-amber-300 uppercase tracking-wider flex items-center gap-2">
                <HardDrive className="w-4 h-4 text-amber-400" />
                Ring 0 Kernel Buffer Inspection
              </span>
              <span className="text-[11px] font-mono text-slate-500">
                kmalloc(1024, GFP_KERNEL)
              </span>
            </div>

            {/* Current Buffer Contents */}
            <div className="bg-slate-900 p-4 rounded-lg border border-slate-800 mb-4">
              <div className="flex items-center justify-between text-xs font-mono text-slate-400 mb-2">
                <span>Kernel Buffer Memory (HEX & ASCII):</span>
                <span className="text-amber-400 font-bold">
                  {charBuffer.content.length} bytes loaded
                </span>
              </div>

              <div className="bg-slate-950 p-3 rounded border border-slate-800 font-mono text-xs text-emerald-400 break-all select-text min-h-[60px] flex items-center">
                {charBuffer.content || (
                  <span className="text-slate-600 italic">Buffer empty (0 bytes)</span>
                )}
              </div>
            </div>

            {/* Device Stats */}
            <div className="grid grid-cols-3 gap-3 text-xs font-mono">
              <div className="bg-slate-900 p-3 rounded-lg border border-slate-800">
                <span className="text-slate-500 block text-[10px]">TOTAL WRITES:</span>
                <span className="text-slate-100 font-bold text-sm">
                  {charBuffer.totalWrites}
                </span>
              </div>

              <div className="bg-slate-900 p-3 rounded-lg border border-slate-800">
                <span className="text-slate-500 block text-[10px]">TOTAL READS:</span>
                <span className="text-slate-100 font-bold text-sm">
                  {charBuffer.totalReads}
                </span>
              </div>

              <div className="bg-slate-900 p-3 rounded-lg border border-slate-800">
                <span className="text-slate-500 block text-[10px]">BYTES PROCESSED:</span>
                <span className="text-slate-100 font-bold text-sm">
                  {charBuffer.bytesProcessed} B
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4 p-3 bg-emerald-950/20 border border-emerald-800/40 rounded-lg text-xs font-mono text-emerald-300">
            <span className="font-bold">Active Cipher Mode: </span>
            <span className="uppercase text-amber-300">{charBuffer.cipherMode}</span> | Key: {charBuffer.cipherKey}
          </div>
        </div>
      </div>

      {/* Live strace System Call History */}
      <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
        <div className="bg-slate-900 px-4 py-2.5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-cyan-400" />
            <h3 className="font-mono text-xs font-bold text-slate-100">
              Live strace Output: System Call Transition Interceptor
            </h3>
          </div>
          <span className="text-[11px] font-mono text-slate-500">
            PID, Syscall, Arguments, Return Value, & Ring Flow
          </span>
        </div>

        <div className="p-3 overflow-x-auto max-h-[240px] font-mono text-xs space-y-1.5 select-text">
          {kernelState.syscallHistory.length === 0 ? (
            <div className="text-slate-600 py-4 text-center">
              No system calls captured yet. Perform a read() or write() above!
            </div>
          ) : (
            kernelState.syscallHistory.map((trace) => (
              <div
                key={trace.id}
                className="bg-slate-900/60 p-2 rounded border border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-[11px]"
              >
                <div className="flex items-center gap-2">
                  <span className="text-slate-500">[{trace.timestamp}]</span>
                  <span className="text-cyan-300 font-bold">{trace.comm}[{trace.pid}]</span>
                  <span className="text-amber-300 font-semibold">{trace.syscall}({trace.args.join(', ')})</span>
                  <span className="text-slate-400">=</span>
                  <span className="text-emerald-400 font-bold">{trace.retval}</span>
                </div>
                <div className="flex items-center gap-2 text-[10px] text-slate-400">
                  <span className="bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800 text-slate-300">
                    {trace.durationUs} µs
                  </span>
                  <span className="text-slate-500 hidden sm:inline">{trace.ringFlow}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
