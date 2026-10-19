import React, { useState } from 'react';
import {
  FileCode,
  Terminal,
  Cpu,
  CheckCircle,
  Copy,
  Play,
  RotateCw,
  Box,
  Layers,
  HelpCircle,
} from 'lucide-react';
import type { KernelModule } from '../kernel/types.ts';

interface CodeWorkbenchProps {
  module: KernelModule;
  onLoadModule: (moduleId: string) => void;
  onUnloadModule: (moduleId: string) => void;
}

export const CodeWorkbench: React.FC<CodeWorkbenchProps> = ({
  module,
  onLoadModule,
  onUnloadModule,
}) => {
  const [activeFileTab, setActiveFileTab] = useState<'c_source' | 'makefile' | 'user_test'>('c_source');
  const [isCompiling, setIsCompiling] = useState<boolean>(false);
  const [buildLogs, setBuildLogs] = useState<string[] | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const [activeConcept, setActiveConcept] = useState<string | null>(null);

  const isLoaded = module.status === 'loaded';

  const handleCopy = () => {
    let text = '';
    if (activeFileTab === 'c_source') text = module.cSourceCode;
    else if (activeFileTab === 'makefile') text = module.makeFileCode;
    else text = module.userTestCode || '';

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSimulateCompile = () => {
    setIsCompiling(true);
    setBuildLogs(null);

    const steps = [
      `make -C /lib/modules/6.11.0-generic/build M=/usr/src/${module.name} modules`,
      `make[1]: Entering directory '/usr/lib/modules/6.11.0-generic/build'`,
      `  CC [M]  /usr/src/${module.name}/${module.name}.o`,
      `  MODPOST /usr/src/${module.name}/Module.symvers`,
      `  CC [M]  /usr/src/${module.name}/${module.name}.mod.o`,
      `  LD [M]  /usr/src/${module.name}/${module.name}.ko`,
      `  BTF [M] /usr/src/${module.name}/${module.name}.ko`,
      `make[1]: Leaving directory '/usr/lib/modules/6.11.0-generic/build'`,
      `Build succeeded! Artifact generated: ${module.name}.ko (${(module.sizeBytes / 1024).toFixed(1)} KB, ELF 64-bit relocatable x86-64)`,
    ];

    setTimeout(() => {
      setBuildLogs(steps);
      setIsCompiling(false);
    }, 800);
  };

  const getCodeContent = () => {
    if (activeFileTab === 'c_source') return module.cSourceCode;
    if (activeFileTab === 'makefile') return module.makeFileCode;
    return module.userTestCode || '// No user space test script defined for this module';
  };

  const getFileName = () => {
    if (activeFileTab === 'c_source') return `${module.name}.c`;
    if (activeFileTab === 'makefile') return 'Makefile';
    return `test_${module.name}.c`;
  };

  const concepts = [
    {
      id: 'module_init',
      title: 'module_init() & module_exit()',
      desc: 'Macros that register initialization and cleanup routines called when insmod and rmmod are executed in Ring 0.',
    },
    {
      id: 'copy_user',
      title: 'copy_to_user() & copy_from_user()',
      desc: 'Mandatory memory barrier APIs. Directly dereferencing user space pointers in kernel space causes SMAP / Page Fault panics.',
    },
    {
      id: 'file_operations',
      title: 'struct file_operations',
      desc: 'Function pointer table connecting VFS system calls (read, write, open, ioctl) to driver handlers.',
    },
    {
      id: 'gpl_license',
      title: 'MODULE_LICENSE("GPL")',
      desc: 'Declares module licensing. Without GPL, access to internal kernel symbols (EXPORT_SYMBOL_GPL) is denied by kmod.',
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      {/* Top Banner & Quick Actions */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <FileCode className="w-5 h-5 text-amber-400" />
            <h2 className="font-mono text-base font-bold text-slate-100">
              Source Code & Kbuild Workbench: <span className="text-amber-400">{module.name}</span>
            </h2>
            <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
              {module.license}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Real Linux C source code using official kernel headers (<code className="text-slate-300">linux/module.h</code>, <code className="text-slate-300">linux/init.h</code>, <code className="text-slate-300">linux/fs.h</code>).
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded border border-slate-700 text-xs font-mono transition"
          >
            {copied ? <CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied!' : 'Copy Code'}</span>
          </button>

          <button
            onClick={handleSimulateCompile}
            disabled={isCompiling}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded text-xs font-mono transition shadow-sm"
          >
            {isCompiling ? (
              <RotateCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Terminal className="w-3.5 h-3.5" />
            )}
            <span>{isCompiling ? 'Compiling Kbuild...' : 'Compile (.ko)'}</span>
          </button>

          {isLoaded ? (
            <button
              onClick={() => onUnloadModule(module.id)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-red-950/70 hover:bg-red-900 text-red-300 border border-red-800 rounded text-xs font-mono font-medium transition"
            >
              <span>rmmod {module.name}</span>
            </button>
          ) : (
            <button
              onClick={() => onLoadModule(module.id)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-950/70 hover:bg-emerald-900 text-emerald-300 border border-emerald-800 rounded text-xs font-mono font-medium transition"
            >
              <Play className="w-3 h-3 fill-current" />
              <span>insmod {module.name}.ko</span>
            </button>
          )}
        </div>
      </div>

      {/* Kernel Concept Badges */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {concepts.map((concept) => (
          <button
            key={concept.id}
            onClick={() => setActiveConcept(activeConcept === concept.id ? null : concept.id)}
            className={`p-2.5 rounded-lg border text-left transition text-xs ${
              activeConcept === concept.id
                ? 'bg-amber-950/40 border-amber-500/60 text-amber-200'
                : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 text-slate-300'
            }`}
          >
            <div className="font-mono font-bold text-[11px] flex items-center justify-between mb-1">
              <span className="truncate">{concept.title}</span>
              <HelpCircle className="w-3 h-3 text-slate-500 shrink-0" />
            </div>
            <p className="text-[10px] text-slate-400 line-clamp-2">
              {concept.desc}
            </p>
          </button>
        ))}
      </div>

      {/* Concept Expanded Explanation */}
      {activeConcept && (
        <div className="bg-amber-950/30 border border-amber-600/40 rounded-lg p-3 text-xs text-amber-200 font-mono flex items-start gap-2.5 animate-fadeIn">
          <Cpu className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">Kernel Architecture Note: </span>
            {concepts.find((c) => c.id === activeConcept)?.desc}
          </div>
        </div>
      )}

      {/* Editor & File Tabs */}
      <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        {/* Editor Title Bar */}
        <div className="bg-slate-900/90 border-b border-slate-800 px-4 py-2 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setActiveFileTab('c_source')}
              className={`px-3 py-1 text-xs font-mono font-medium rounded transition flex items-center gap-1.5 ${
                activeFileTab === 'c_source'
                  ? 'bg-slate-800 text-amber-300 border border-slate-700'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <FileCode className="w-3.5 h-3.5" />
              <span>{module.name}.c</span>
            </button>

            <button
              onClick={() => setActiveFileTab('makefile')}
              className={`px-3 py-1 text-xs font-mono font-medium rounded transition flex items-center gap-1.5 ${
                activeFileTab === 'makefile'
                  ? 'bg-slate-800 text-amber-300 border border-slate-700'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Box className="w-3.5 h-3.5" />
              <span>Makefile</span>
            </button>

            <button
              onClick={() => setActiveFileTab('user_test')}
              className={`px-3 py-1 text-xs font-mono font-medium rounded transition flex items-center gap-1.5 ${
                activeFileTab === 'user_test'
                  ? 'bg-slate-800 text-amber-300 border border-slate-700'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Terminal className="w-3.5 h-3.5" />
              <span>user_test.c</span>
            </button>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
            <span>File:</span>
            <span className="text-slate-200">{getFileName()}</span>
            <span className="text-slate-600">|</span>
            <span>Lines: {getCodeContent().split('\n').length}</span>
          </div>
        </div>

        {/* Code Content */}
        <div className="p-4 overflow-x-auto max-h-[500px] font-mono text-xs leading-relaxed text-slate-200 select-text">
          <pre className="table w-full">
            <code>
              {getCodeContent()
                .split('\n')
                .map((line, idx) => (
                  <div key={idx} className="table-row hover:bg-slate-900/60">
                    <span className="table-cell select-none text-slate-600 text-right pr-4 w-10 text-[11px]">
                      {idx + 1}
                    </span>
                    <span className="table-cell whitespace-pre">
                      {line.startsWith('//') || line.startsWith('/*') || line.startsWith(' *') ? (
                        <span className="text-slate-500 italic">{line}</span>
                      ) : line.startsWith('#include') ? (
                        <span className="text-purple-400">{line}</span>
                      ) : line.includes('MODULE_LICENSE') ||
                        line.includes('MODULE_AUTHOR') ||
                        line.includes('MODULE_DESCRIPTION') ? (
                        <span className="text-amber-400 font-semibold">{line}</span>
                      ) : line.includes('copy_to_user') || line.includes('copy_from_user') ? (
                        <span className="text-emerald-400 font-bold bg-emerald-950/30 px-1 rounded">
                          {line}
                        </span>
                      ) : line.includes('module_init') || line.includes('module_exit') ? (
                        <span className="text-cyan-400 font-bold">{line}</span>
                      ) : (
                        line
                      )}
                    </span>
                  </div>
                ))}
            </code>
          </pre>
        </div>
      </div>

      {/* Build Logs Terminal */}
      {buildLogs && (
        <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden font-mono text-xs">
          <div className="bg-slate-900 px-4 py-2 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2 text-slate-300">
              <Terminal className="w-3.5 h-3.5 text-amber-400" />
              <span className="font-bold">Kbuild Compiler Output</span>
            </div>
            <button
              onClick={() => setBuildLogs(null)}
              className="text-slate-500 hover:text-slate-300 text-xs"
            >
              Close
            </button>
          </div>
          <div className="p-4 space-y-1 text-slate-300">
            {buildLogs.map((log, idx) => (
              <div
                key={idx}
                className={
                  log.includes('succeeded')
                    ? 'text-emerald-400 font-bold'
                    : log.includes('make')
                    ? 'text-slate-400'
                    : 'text-amber-300'
                }
              >
                {log}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
