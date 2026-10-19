import React, { useState } from 'react';
import {
  Cpu,
  Shield,
  ArrowRight,
  ArrowDown,
  Layers,
  Zap,
  Lock,
  Unlock,
  AlertOctagon,
  RefreshCw,
  Database,
  HardDrive,
} from 'lucide-react';

export const RingVisualizer: React.FC = () => {
  const [activeStep, setActiveStep] = useState<number>(0);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [simulationType, setSimulationType] = useState<'read' | 'write' | 'smap_violation'>('write');

  const startSimulation = (type: 'read' | 'write' | 'smap_violation') => {
    setSimulationType(type);
    setIsSimulating(true);
    setActiveStep(1);

    const stepTimes = [600, 1400, 2200, 3000];
    stepTimes.forEach((time, index) => {
      setTimeout(() => {
        setActiveStep(index + 2);
        if (index === stepTimes.length - 1) {
          setIsSimulating(false);
        }
      }, time);
    });
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Intro Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-amber-400" />
            <h2 className="font-mono text-base font-bold text-slate-100">
              Hardware Privilege Rings: Ring 3 (User) vs Ring 0 (Kernel)
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1 max-w-3xl">
            In Linux on x86_64, user-space applications run with restricted CPU privilege in <strong className="text-cyan-300">Ring 3</strong>.
            Linux Kernel Modules (LKMs) execute directly inside <strong className="text-amber-300">Ring 0</strong> with unrestricted access to CPU registers, physical RAM, and hardware.
          </p>
        </div>

        {/* Interactive Simulation Trigger Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => startSimulation('write')}
            disabled={isSimulating}
            className={`px-3 py-1.5 rounded text-xs font-mono font-medium border transition flex items-center gap-1.5 ${
              simulationType === 'write' && isSimulating
                ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>Simulate sys_write() & copy_from_user()</span>
          </button>

          <button
            onClick={() => startSimulation('read')}
            disabled={isSimulating}
            className={`px-3 py-1.5 rounded text-xs font-mono font-medium border transition flex items-center gap-1.5 ${
              simulationType === 'read' && isSimulating
                ? 'bg-cyan-500 text-slate-950 border-cyan-400 font-bold'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
            }`}
          >
            <RefreshCw className="w-3.5 h-3.5 text-cyan-400" />
            <span>Simulate sys_read() & copy_to_user()</span>
          </button>

          <button
            onClick={() => startSimulation('smap_violation')}
            disabled={isSimulating}
            className={`px-3 py-1.5 rounded text-xs font-mono font-medium border transition flex items-center gap-1.5 ${
              simulationType === 'smap_violation' && isSimulating
                ? 'bg-red-500 text-slate-950 border-red-400 font-bold'
                : 'bg-red-950/60 hover:bg-red-900/60 text-red-300 border-red-800'
            }`}
          >
            <AlertOctagon className="w-3.5 h-3.5 text-red-400" />
            <span>Simulate SMAP Violation (Panic)</span>
          </button>
        </div>
      </div>

      {/* Visual Ring Architecture Container */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Ring 3 (User Space) */}
        <div
          className={`rounded-xl border p-5 transition relative ${
            activeStep === 1 || activeStep === 5
              ? 'bg-cyan-950/20 border-cyan-500 ring-2 ring-cyan-500/30'
              : 'bg-slate-900/60 border-slate-800'
          }`}
        >
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-cyan-400" />
              <h3 className="font-mono text-sm font-bold text-cyan-300 uppercase tracking-wider">
                Ring 3: User Space (Restricted)
              </h3>
            </div>
            <span className="text-[11px] font-mono text-slate-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
              0x0000000000000000 - 0x00007fffffffffff
            </span>
          </div>

          <div className="mt-4 space-y-3">
            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
              <div className="flex items-center justify-between text-xs font-mono text-slate-300 mb-1">
                <span className="font-bold flex items-center gap-1.5">
                  <span>Application Process</span>
                  <span className="text-slate-500">(PID 1420 / test_client)</span>
                </span>
                <span className="text-[10px] text-cyan-400">Isolated Virtual Memory</span>
              </div>
              <p className="text-xs text-slate-400">
                Runs user code, loops, heap allocations via <code className="text-slate-300">malloc()</code>. Cannot access physical devices or kernel data directly.
              </p>
            </div>

            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
              <div className="flex items-center justify-between text-xs font-mono text-slate-300 mb-1">
                <span className="font-bold">GNU C Library (glibc)</span>
                <span className="text-[10px] text-cyan-400">Wrapper Layer</span>
              </div>
              <p className="text-xs text-slate-400">
                Wraps POSIX functions (<code className="text-slate-300">open</code>, <code className="text-slate-300">write</code>, <code className="text-slate-300">read</code>, <code className="text-slate-300">ioctl</code>) and prepares registers (%rax, %rdi, %rsi, %rdx) for CPU privilege transition.
              </p>
            </div>

            {/* Live simulation trace card */}
            {activeStep === 1 && (
              <div className="bg-cyan-950/80 border border-cyan-500 rounded-lg p-3 text-xs font-mono text-cyan-200 animate-pulse">
                <span className="font-bold">[Step 1]</span> User process executes{' '}
                <code className="text-white bg-cyan-900/60 px-1 py-0.5 rounded">
                  write(fd, "Kernel Data", 11)
                </code>
                . Putting syscall number 1 into %rax.
              </div>
            )}
          </div>
        </div>

        {/* Ring 0 (Kernel Space) */}
        <div
          className={`rounded-xl border p-5 transition relative ${
            activeStep === 3 || activeStep === 4
              ? 'bg-amber-950/20 border-amber-500 ring-2 ring-amber-500/30'
              : 'bg-slate-900/60 border-slate-800'
          }`}
        >
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-amber-400" />
              <h3 className="font-mono text-sm font-bold text-amber-300 uppercase tracking-wider">
                Ring 0: Kernel Space (Supervisor Mode)
              </h3>
            </div>
            <span className="text-[11px] font-mono text-slate-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
              0xffff800000000000 - 0xffffffffffffffff
            </span>
          </div>

          <div className="mt-4 space-y-3">
            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
              <div className="flex items-center justify-between text-xs font-mono text-slate-300 mb-1">
                <span className="font-bold flex items-center gap-1.5 text-amber-300">
                  <span>Linux Kernel Module (LKM)</span>
                  <span className="text-slate-500">(kcrypto.ko)</span>
                </span>
                <span className="text-[10px] text-amber-400 font-bold">Unrestricted Ring 0</span>
              </div>
              <p className="text-xs text-slate-400">
                Implements <code className="text-slate-300">file_operations</code>. Uses <code className="text-amber-300">kmalloc()</code>, hardware interrupts, spinlocks, and page table operations.
              </p>
            </div>

            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
              <div className="flex items-center justify-between text-xs font-mono text-slate-300 mb-1">
                <span className="font-bold">Virtual File System (VFS) Dispatch</span>
                <span className="text-[10px] text-slate-400">Kernel Subsystem</span>
              </div>
              <p className="text-xs text-slate-400">
                Translates <code className="text-slate-300">/dev/kcrypto</code> inode into driver function pointer <code className="text-slate-300">fops-&gt;write()</code>.
              </p>
            </div>

            {/* Live simulation trace card */}
            {activeStep === 3 && (
              <div className="bg-amber-950/80 border border-amber-500 rounded-lg p-3 text-xs font-mono text-amber-200 animate-pulse">
                <span className="font-bold">[Step 3]</span> VFS executes driver{' '}
                <code className="text-white bg-amber-900/60 px-1 py-0.5 rounded">
                  dev_write(filep, user_buf, 11)
                </code>
                . Inside Ring 0 supervisor mode!
              </div>
            )}

            {activeStep === 4 && simulationType !== 'smap_violation' && (
              <div className="bg-emerald-950/80 border border-emerald-500 rounded-lg p-3 text-xs font-mono text-emerald-200 animate-pulse">
                <span className="font-bold">[Step 4]</span> Driver runs{' '}
                <code className="text-white bg-emerald-900/60 px-1 py-0.5 rounded">
                  copy_from_user(kernel_buf, user_buf, 11)
                </code>
                . Memory boundary verified, data safely stored in kernel heap.
              </div>
            )}

            {activeStep === 4 && simulationType === 'smap_violation' && (
              <div className="bg-red-950/90 border border-red-500 rounded-lg p-3 text-xs font-mono text-red-200 animate-pulse">
                <span className="font-bold">[CRITICAL]</span> Direct dereference{' '}
                <code className="text-white bg-red-900 px-1 py-0.5 rounded">
                  *user_buf
                </code>{' '}
                attempted! CPU hardware SMAP triggered Page Fault in supervisor mode! Kernel Panic.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* The Central Memory Bridge & Syscall Trap Barrier */}
      <div
        className={`bg-slate-900 border rounded-xl p-5 transition ${
          activeStep === 2
            ? 'border-amber-400 shadow-lg shadow-amber-950/30'
            : 'border-slate-800'
        }`}
      >
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-amber-400" />
            <h3 className="font-mono text-sm font-bold text-slate-100">
              The Ring Barrier: System Call Traps & Memory Bridges
            </h3>
          </div>
          <span className="text-xs font-mono text-slate-400">
            x86-64 <code className="text-amber-300">SYSCALL</code> & <code className="text-amber-300">SYSRET</code> instructions
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-800 flex flex-col justify-between">
            <div>
              <span className="font-mono text-xs font-bold text-amber-300 block mb-1">
                1. CPU Privilege Switch
              </span>
              <p className="text-xs text-slate-400">
                The hardware switches CPU CPL (Current Privilege Level in %cs register) from 3 to 0. Interrupt descriptor table (IDT) points to kernel entry.
              </p>
            </div>
            <div className="mt-3 text-[11px] font-mono text-slate-500 bg-slate-900 p-1.5 rounded">
              Instruction: <span className="text-amber-300">syscall</span> (Fast Syscall)
            </div>
          </div>

          <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-800 flex flex-col justify-between">
            <div>
              <span className="font-mono text-xs font-bold text-emerald-300 block mb-1">
                2. copy_to_user / copy_from_user
              </span>
              <p className="text-xs text-slate-400">
                User memory is not directly trusted. The kernel checks page tables, access permissions, and handles user memory page faults gracefully without crashing the whole OS.
              </p>
            </div>
            <div className="mt-3 text-[11px] font-mono text-slate-500 bg-slate-900 p-1.5 rounded">
              Header: <span className="text-emerald-300">&lt;linux/uaccess.h&gt;</span>
            </div>
          </div>

          <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-800 flex flex-col justify-between">
            <div>
              <span className="font-mono text-xs font-bold text-red-300 block mb-1">
                3. SMAP & SMEP Protections
              </span>
              <p className="text-xs text-slate-400">
                Supervisor Mode Access/Execution Prevention: Hardware registers in CR4 prevent Ring 0 code from accidentally reading or executing Ring 3 memory pages.
              </p>
            </div>
            <div className="mt-3 text-[11px] font-mono text-slate-500 bg-slate-900 p-1.5 rounded">
              CPU Flag: <span className="text-red-300">CR4.SMAP / CR4.SMEP</span>
            </div>
          </div>
        </div>

        {/* Active step 2 alert */}
        {activeStep === 2 && (
          <div className="mt-4 bg-amber-950/60 border border-amber-500 rounded-lg p-3 text-xs font-mono text-amber-200 flex items-center justify-between animate-pulse">
            <span>
              [Step 2] CPU executes SYSCALL. Ring 3 suspended -&gt; Ring 0 kernel entry handler <code className="text-white">entry_SYSCALL_64</code> takes control.
            </span>
            <span className="text-[10px] bg-amber-500 text-slate-950 px-2 py-0.5 rounded font-bold">
              SWITCHING TO CPL=0
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
