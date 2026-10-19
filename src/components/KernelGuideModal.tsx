import React, { useState } from 'react';
import {
  X,
  BookOpen,
  Copy,
  CheckCircle,
  Terminal,
  ShieldCheck,
  Download,
  ExternalLink,
} from 'lucide-react';

interface KernelGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: () => void;
}

export const KernelGuideModal: React.FC<KernelGuideModalProps> = ({
  isOpen,
  onClose,
  onExport,
}) => {
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  if (!isOpen) return null;

  const copyText = (section: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(section);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const ubuntuCommands = `# 1. Install GCC and Kernel Headers matching your running kernel
sudo apt update
sudo apt install -y build-essential linux-headers-$(uname -r)

# 2. Verify header files are installed
ls -la /lib/modules/$(uname -r)/build

# 3. Create your module directory and source code
mkdir -p ~/lkm_project && cd ~/lkm_project

# 4. Compile the module using Kbuild
make

# 5. Insert module into the running kernel
sudo insmod hello_lkm.ko greet_count=5

# 6. View kernel ring buffer output
sudo dmesg | tail -n 15

# 7. Check module status in sysfs and lsmod
lsmod | grep hello_lkm
cat /sys/module/hello_lkm/parameters/greet_count

# 8. Unload the module safely
sudo rmmod hello_lkm`;

  const secureBootNotes = `# If your system uses UEFI Secure Boot:
# You may receive: "insmod: ERROR: could not insert module: Required key not available"
# Solution: Sign your .ko with a Machine Owner Key (MOK):
openssl req -new -x509 -newkey rsa:2048 -keyout MOK.priv -outform DER -out MOK.der -nodes -days 36500 -subj "/CN=MyKernelDev/"
sudo /usr/src/linux-headers-$(uname -r)/scripts/sign-file sha256 MOK.priv MOK.der hello_lkm.ko
sudo mokutil --import MOK.der`;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-3xl w-full p-6 shadow-2xl my-8 relative flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/20 text-amber-400 rounded-lg border border-amber-500/30">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-mono text-base font-bold text-slate-100">
                Real Linux LKM Compilation &amp; Deployment Guide
              </h2>
              <p className="text-xs text-slate-400">
                Run these C kernel modules on your own Linux PC, Cloud VPS, or VM
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-100 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto py-4 space-y-5 font-mono text-xs">
          {/* Section 1: Ubuntu / Debian / Arch commands */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-amber-300 flex items-center gap-2">
                <Terminal className="w-4 h-4" />
                Step-by-Step Terminal Workflow (Ubuntu / Debian / Fedora)
              </span>
              <button
                onClick={() => copyText('ubuntu', ubuntuCommands)}
                className="flex items-center gap-1 text-[11px] bg-slate-800 hover:bg-slate-700 text-slate-300 px-2.5 py-1 rounded transition"
              >
                {copiedSection === 'ubuntu' ? (
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
                <span>{copiedSection === 'ubuntu' ? 'Copied!' : 'Copy Script'}</span>
              </button>
            </div>
            <pre className="bg-slate-900 p-3 rounded border border-slate-800 text-slate-200 overflow-x-auto whitespace-pre leading-relaxed text-[11px]">
              {ubuntuCommands}
            </pre>
          </div>

          {/* Section 2: Secure Boot / MOK */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-cyan-300 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4" />
                UEFI Secure Boot &amp; Module Signing (MOK)
              </span>
              <button
                onClick={() => copyText('mok', secureBootNotes)}
                className="flex items-center gap-1 text-[11px] bg-slate-800 hover:bg-slate-700 text-slate-300 px-2.5 py-1 rounded transition"
              >
                {copiedSection === 'mok' ? (
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
                <span>{copiedSection === 'mok' ? 'Copied!' : 'Copy Script'}</span>
              </button>
            </div>
            <p className="text-slate-400 text-[11px] mb-2 leading-relaxed">
              If your motherboard has Secure Boot enabled, the kernel will refuse to load unsigned <code className="text-amber-300">.ko</code> files. Sign them with a Machine Owner Key as shown below:
            </p>
            <pre className="bg-slate-900 p-3 rounded border border-slate-800 text-slate-200 overflow-x-auto whitespace-pre leading-relaxed text-[11px]">
              {secureBootNotes}
            </pre>
          </div>

          {/* Section 3: Golden Rules of Kernel Development */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
            <h3 className="font-bold text-amber-300">
              The 5 Golden Rules of Ring 0 Kernel Programming:
            </h3>
            <ul className="list-disc list-inside text-slate-300 space-y-1.5 text-[11px] leading-relaxed">
              <li>
                <strong className="text-white">No standard libc:</strong> You cannot use <code className="text-slate-400">printf</code> or <code className="text-slate-400">malloc</code>. Use <code className="text-amber-300">printk</code> / <code className="text-amber-300">pr_info</code> and <code className="text-amber-300">kmalloc(..., GFP_KERNEL)</code>.
              </li>
              <li>
                <strong className="text-white">Always verify user pointers:</strong> Never dereference a <code className="text-slate-400">char __user *</code> directly. Always use <code className="text-emerald-400">copy_from_user</code> and <code className="text-emerald-400">copy_to_user</code>.
              </li>
              <li>
                <strong className="text-white">No Floating Point Math:</strong> The FPU context is not saved on kernel entry for performance. Use fixed-point or integer arithmetic.
              </li>
              <li>
                <strong className="text-white">Small Kernel Stack:</strong> The kernel stack is typically only 8KB or 16KB per thread. Never allocate large arrays on the stack—use <code className="text-amber-300">kmalloc</code>.
              </li>
              <li>
                <strong className="text-white">Clean Up Everything:</strong> Any allocated memory, registered char device, or sysfs node not freed in <code className="text-cyan-300">module_exit()</code> will leak permanently until the machine is rebooted.
              </li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
          <button
            onClick={onExport}
            className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs font-mono transition"
          >
            <Download className="w-4 h-4" />
            <span>Download All 6 Kernel Modules (.zip / .c bundle)</span>
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-mono transition"
          >
            Close Guide
          </button>
        </div>
      </div>
    </div>
  );
};
