import React, { useState } from 'react';
import {
  AlertTriangle,
  AlertOctagon,
  RotateCcw,
  Cpu,
  Flame,
  CheckCircle,
  FileCode,
  ShieldAlert,
  Info,
} from 'lucide-react';
import type { KernelState } from '../kernel/types.ts';

interface PanicLabProps {
  kernelState: KernelState;
  onTriggerFault: (type: 'NULL_DEREF' | 'BAD_USER_COPY' | 'MEM_LEAK' | 'SPINLOCK_DEADLOCK') => void;
  onRecoverKernel: () => void;
}

export const PanicLab: React.FC<PanicLabProps> = ({
  kernelState,
  onTriggerFault,
  onRecoverKernel,
}) => {
  const [selectedScenario, setSelectedScenario] = useState<
    'NULL_DEREF' | 'BAD_USER_COPY' | 'MEM_LEAK' | 'SPINLOCK_DEADLOCK'
  >('NULL_DEREF');

  const panicState = kernelState.panicState;
  const isPanicked = panicState.isPanicked;

  const scenarios = [
    {
      id: 'NULL_DEREF' as const,
      title: 'Kernel NULL Pointer Dereference',
      severity: 'Fatal (Oops / Panic)',
      summary: 'Writing or reading address 0x0000000000000000 in Ring 0 triggers an unhandled page fault.',
      badCode: `// In bad_driver.c:
int *ptr = NULL;
*ptr = 0xdeadbeef; // CRASH! Supervisor write to unmapped page 0`,
      fixCode: `// Secure fix:
if (!ptr) {
    pr_err("kmod: NULL pointer detected, aborting\\n");
    return -EINVAL;
}
*ptr = 0xdeadbeef;`,
      why: 'Unlike user space where a NULL dereference generates SIGSEGV (terminating only that process), in Ring 0 there is no safety net—the entire kernel crashes.',
    },
    {
      id: 'BAD_USER_COPY' as const,
      title: 'SMAP Violation (Direct User Pointer Access)',
      severity: 'Fatal (Panic)',
      summary: 'Directly dereferencing a user-space pointer without copy_from_user() in Ring 0.',
      badCode: `// In bad_driver.c:
ssize_t bad_write(struct file *f, const char __user *buf, size_t len) {
    char c = *buf; // ILLEGAL! Direct user memory dereference
    return len;
}`,
      fixCode: `// Secure fix:
ssize_t safe_write(struct file *f, const char __user *buf, size_t len) {
    char kbuf[128];
    if (copy_from_user(kbuf, buf, min(len, sizeof(kbuf))))
        return -EFAULT;
    return len;
}`,
      why: 'Modern CPUs implement SMAP (Supervisor Mode Access Prevention). Ring 0 cannot directly touch user space pages without explicit software barriers.',
    },
    {
      id: 'MEM_LEAK' as const,
      title: 'Kernel Slab Memory Leak (kmemleak)',
      severity: 'Warning / Degradation',
      summary: 'Allocating kernel heap memory with kmalloc() but forgetting kfree() in module_exit().',
      badCode: `// In module_init:
void *cache = kmalloc(4096, GFP_KERNEL);

// In module_exit:
// Missing: kfree(cache); -> Memory permanently leaked!`,
      fixCode: `// In module_exit:
if (cache) {
    kfree(cache);
    cache = NULL;
}`,
      why: 'Kernel memory is non-swappable physical RAM. Unreleased slab buffers accumulate until system runs out of low memory (OOM).',
    },
    {
      id: 'SPINLOCK_DEADLOCK' as const,
      title: 'Spinlock Deadlock / CPU Soft Lockup',
      severity: 'Critical (Watchdog Lockup)',
      summary: 'Calling spin_lock() twice on the same spinlock without unlocking, freezing the CPU core.',
      badCode: `// In driver handler:
spin_lock(&my_lock);
// ... nested function call ...
spin_lock(&my_lock); // DEADLOCK! CPU loops forever waiting for itself`,
      fixCode: `// Fix:
spin_lock(&my_lock);
do_work();
spin_unlock(&my_lock);`,
      why: 'Spinlocks busy-wait (spin) with interrupts disabled. A recursive lock prevents any other thread from running, triggering the kernel NMI watchdog.',
    },
  ];

  const currentScenario = scenarios.find((s) => s.id === selectedScenario)!;

  return (
    <div className="flex flex-col gap-6">
      {/* Panic Lab Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Flame className="w-5 h-5 text-red-400" />
            <h2 className="font-mono text-base font-bold text-slate-100">
              Kernel Crash, Oops &amp; Panic Laboratory
            </h2>
            {isPanicked && (
              <span className="text-xs px-2.5 py-0.5 rounded font-mono font-bold bg-red-950 text-red-300 border border-red-500 animate-pulse">
                SYSTEM CRASHED (RING 0 PANIC)
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-1 max-w-3xl">
            In user space, bad code only kills a process (<code className="text-slate-300">SIGSEGV</code>). In Ring 0, a single pointer mistake can bring down the entire Linux operating system. Test real failure modes below safely!
          </p>
        </div>

        {isPanicked ? (
          <button
            onClick={onRecoverKernel}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded text-xs font-mono transition shadow-lg"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Warm Reboot &amp; Clear Panic</span>
          </button>
        ) : (
          <div className="text-xs font-mono text-slate-400">
            System status: <span className="text-emerald-400 font-bold">Ring 0 Normal</span>
          </div>
        )}
      </div>

      {/* Live Crash Dump Display if Panicked */}
      {isPanicked && (
        <div className="bg-red-950/20 border-2 border-red-600/80 rounded-xl p-5 shadow-2xl font-mono text-xs">
          <div className="flex items-center justify-between pb-3 border-b border-red-800/60 mb-3">
            <div className="flex items-center gap-2 text-red-400 font-bold">
              <ShieldAlert className="w-5 h-5" />
              <span>KERNEL OOPS / PANIC DUMP (x86_64 CPU CORE 0)</span>
            </div>
            <span className="text-red-300 bg-red-950 px-2 py-0.5 rounded border border-red-800">
              {panicState.tainted}
            </span>
          </div>

          <div className="space-y-2 text-red-200">
            <div className="bg-slate-950/90 p-3 rounded border border-red-900/60 font-mono">
              <div className="text-red-400 font-bold mb-1">REASON: {panicState.reason}</div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-[11px] text-slate-300">
                <div>RIP: <span className="text-amber-300">{panicState.rip}</span></div>
                <div>RSP: <span className="text-amber-300">{panicState.rsp}</span></div>
                <div>CR2 (Page Fault): <span className="text-red-400">{panicState.cr2}</span></div>
              </div>
            </div>

            {panicState.callTrace && (
              <div>
                <span className="text-slate-400 text-[11px] block mb-1">Call Trace:</span>
                <div className="bg-slate-950/90 p-3 rounded border border-slate-800 font-mono text-[11px] space-y-1 text-slate-300">
                  {panicState.callTrace.map((frame, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className="text-slate-600">[{i}]</span>
                      <span className={i === 0 ? 'text-red-400 font-bold' : 'text-slate-300'}>
                        {frame}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Scenario Selection Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {scenarios.map((sc) => {
          const isSelected = selectedScenario === sc.id;
          return (
            <div
              key={sc.id}
              onClick={() => setSelectedScenario(sc.id)}
              className={`cursor-pointer rounded-xl border p-4 transition flex flex-col justify-between ${
                isSelected
                  ? 'bg-slate-900 border-amber-500/80 shadow-md ring-1 ring-amber-500/30'
                  : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-red-950/50 text-red-300 border border-red-800/50 font-bold">
                    {sc.severity}
                  </span>
                </div>
                <h4 className="font-mono text-xs font-bold text-slate-100 mb-1">
                  {sc.title}
                </h4>
                <p className="text-[11px] text-slate-400 line-clamp-2">
                  {sc.summary}
                </p>
              </div>

              <div className="pt-3 mt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedScenario(sc.id);
                    onTriggerFault(sc.id);
                  }}
                  className="w-full py-1.5 px-3 bg-red-950 hover:bg-red-900 text-red-300 border border-red-800 rounded text-xs font-mono font-medium transition flex items-center justify-center gap-1.5"
                >
                  <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
                  <span>Trigger Fault</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Scenario Educational Deep Dive: Bad Code vs C Fix */}
      <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 shadow-lg">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-amber-400" />
            <h3 className="font-mono text-xs font-bold text-slate-100 uppercase tracking-wider">
              Anatomy of the Bug: {currentScenario.title}
            </h3>
          </div>
          <button
            onClick={() => onTriggerFault(currentScenario.id)}
            className="px-3 py-1 bg-red-950 hover:bg-red-900 text-red-300 border border-red-800 rounded text-xs font-mono font-bold transition flex items-center gap-1.5"
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Simulate in Kernel</span>
          </button>
        </div>

        <p className="text-xs text-slate-300 mb-4 font-mono bg-slate-900/60 p-3 rounded border border-slate-800">
          <span className="text-amber-400 font-bold">Why it happens: </span>
          {currentScenario.why}
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 font-mono text-xs">
          {/* Vulnerable Code */}
          <div className="bg-slate-900/90 rounded-lg border border-red-900/60 p-3.5">
            <span className="text-red-400 font-bold block mb-2 flex items-center gap-1.5">
              <span>&#10006; Buggy / Insecure Kernel Code:</span>
            </span>
            <pre className="text-red-200 bg-slate-950 p-3 rounded border border-red-950 overflow-x-auto whitespace-pre">
              {currentScenario.badCode}
            </pre>
          </div>

          {/* Secure Fix */}
          <div className="bg-slate-900/90 rounded-lg border border-emerald-900/60 p-3.5">
            <span className="text-emerald-400 font-bold block mb-2 flex items-center gap-1.5">
              <span>&#10004; Correct Linux Kernel Implementation:</span>
            </span>
            <pre className="text-emerald-200 bg-slate-950 p-3 rounded border border-emerald-950 overflow-x-auto whitespace-pre">
              {currentScenario.fixCode}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};
