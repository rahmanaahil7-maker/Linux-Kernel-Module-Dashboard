import React from 'react';
import {
  Play,
  Square,
  Sliders,
  FileCode,
  HardDrive,
  Info,
  CheckCircle,
  ExternalLink,
} from 'lucide-react';
import type { KernelModule } from '../kernel/types.ts';

interface ModuleCatalogProps {
  modules: KernelModule[];
  selectedModuleId: string;
  onSelectModule: (moduleId: string) => void;
  onLoadModule: (moduleId: string) => void;
  onUnloadModule: (moduleId: string) => void;
  onUpdateParam: (moduleId: string, paramName: string, value: string | number | boolean) => void;
}

export const ModuleCatalog: React.FC<ModuleCatalogProps> = ({
  modules,
  selectedModuleId,
  onSelectModule,
  onLoadModule,
  onUnloadModule,
  onUpdateParam,
}) => {
  const selectedModule = modules.find((m) => m.id === selectedModuleId) || modules[0];

  const getCategoryColor = (cat: KernelModule['category']) => {
    switch (cat) {
      case 'Driver':
        return 'text-emerald-400 bg-emerald-950/40 border-emerald-800/40';
      case 'Security':
        return 'text-red-400 bg-red-950/40 border-red-800/40';
      case 'Networking':
        return 'text-cyan-400 bg-cyan-950/40 border-cyan-800/40';
      case 'Filesystem':
        return 'text-purple-400 bg-purple-950/40 border-purple-800/40';
      case 'Core':
      default:
        return 'text-amber-400 bg-amber-950/40 border-amber-800/40';
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Module Selector Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {modules.map((mod) => {
          const isSelected = mod.id === selectedModuleId;
          const isLoaded = mod.status === 'loaded';

          return (
            <div
              key={mod.id}
              onClick={() => onSelectModule(mod.id)}
              className={`cursor-pointer rounded-xl border p-4 transition text-left relative flex flex-col justify-between ${
                isSelected
                  ? 'bg-slate-900 border-amber-500/80 shadow-md shadow-amber-950/20 ring-1 ring-amber-500/30'
                  : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900/80'
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span
                    className={`text-[10px] uppercase font-mono font-bold px-2 py-0.5 rounded border ${getCategoryColor(
                      mod.category
                    )}`}
                  >
                    {mod.category}
                  </span>

                  <div className="flex items-center gap-1.5">
                    {isLoaded ? (
                      <span className="flex items-center gap-1 text-[11px] font-mono text-emerald-400 bg-emerald-950/50 border border-emerald-800/50 px-2 py-0.5 rounded-full">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        In Ring 0
                      </span>
                    ) : (
                      <span className="text-[11px] font-mono text-slate-500 bg-slate-800/50 px-2 py-0.5 rounded-full">
                        Unloaded (.ko)
                      </span>
                    )}
                  </div>
                </div>

                <h3 className="font-mono text-base font-bold text-slate-100 flex items-center gap-1.5">
                  <span>{mod.name}.ko</span>
                  <span className="text-xs font-normal text-slate-400">v{mod.version}</span>
                </h3>

                <p className="text-xs text-slate-400 line-clamp-2 mt-1 mb-3">
                  {mod.description}
                </p>

                <div className="grid grid-cols-2 gap-2 text-[11px] font-mono text-slate-400 bg-slate-950/50 p-2 rounded border border-slate-800/60 mb-3">
                  <div>
                    <span className="text-slate-500 block">Memory (Ring 0):</span>
                    <span className="text-slate-300 truncate block">{mod.memoryAddress}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Size:</span>
                    <span className="text-slate-300">{(mod.sizeBytes / 1024).toFixed(1)} KB</span>
                  </div>
                </div>

                {mod.devices.length > 0 && (
                  <div className="text-[11px] font-mono text-emerald-400 bg-emerald-950/30 px-2 py-1 rounded border border-emerald-800/40 mb-3 flex items-center gap-1">
                    <HardDrive className="w-3 h-3" />
                    <span>Registers: {mod.devices.map((d) => d.path).join(', ')}</span>
                  </div>
                )}
                {mod.procEntries.length > 0 && (
                  <div className="text-[11px] font-mono text-purple-300 bg-purple-950/30 px-2 py-1 rounded border border-purple-800/40 mb-3 flex items-center gap-1">
                    <FileCode className="w-3 h-3" />
                    <span>Procfs: {mod.procEntries.map((p) => p.path).join(', ')}</span>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-2 border-t border-slate-800/80">
                {isLoaded ? (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onUnloadModule(mod.id);
                    }}
                    className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 bg-red-950/50 hover:bg-red-900/60 text-red-300 border border-red-800/60 rounded text-xs font-mono font-medium transition"
                  >
                    <Square className="w-3.5 h-3.5 fill-current" />
                    <span>rmmod {mod.name}</span>
                  </button>
                ) : (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onLoadModule(mod.id);
                    }}
                    className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 bg-emerald-950/50 hover:bg-emerald-900/60 text-emerald-300 border border-emerald-800/60 rounded text-xs font-mono font-medium transition"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>insmod {mod.name}.ko</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected Module Detail & Parameter Tuner */}
      {selectedModule && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
            <div>
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-amber-400" />
                <h4 className="font-mono text-sm font-bold text-slate-100">
                  Runtime Parameter Tuner: <span className="text-amber-400">{selectedModule.name}.ko</span>
                </h4>
                <span className="text-xs text-slate-400 font-mono">
                  (/sys/module/{selectedModule.name}/parameters/)
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Linux kernel modules export tunable parameters defined with{' '}
                <code className="text-amber-300 font-mono">module_param()</code>. Changing them updates live kernel state.
              </p>
            </div>

            <div className="flex items-center gap-2">
              {selectedModule.status === 'loaded' ? (
                <button
                  onClick={() => onUnloadModule(selectedModule.id)}
                  className="flex items-center gap-1.5 px-3 py-1 bg-red-950 text-red-300 border border-red-800 rounded text-xs font-mono hover:bg-red-900 transition"
                >
                  <Square className="w-3 h-3 fill-current" />
                  <span>Unload from Ring 0</span>
                </button>
              ) : (
                <button
                  onClick={() => onLoadModule(selectedModule.id)}
                  className="flex items-center gap-1.5 px-3 py-1 bg-emerald-950 text-emerald-300 border border-emerald-800 rounded text-xs font-mono hover:bg-emerald-900 transition"
                >
                  <Play className="w-3 h-3 fill-current" />
                  <span>Insert into Ring 0</span>
                </button>
              )}
            </div>
          </div>

          {selectedModule.params.length === 0 ? (
            <div className="py-4 text-center text-xs text-slate-500 font-mono">
              No module parameters exported for this module.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-3">
              {selectedModule.params.map((param) => (
                <div
                  key={param.name}
                  className="bg-slate-950 p-3 rounded-lg border border-slate-800/80 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="font-mono text-xs font-bold text-amber-300">
                        {param.name}
                      </span>
                      <span className="font-mono text-[10px] text-slate-500 px-1.5 py-0.5 bg-slate-900 rounded border border-slate-800">
                        {param.type} | {param.perm}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mb-2">
                      {param.description}
                    </p>
                  </div>

                  <div>
                    {param.type === 'bool' ? (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            onUpdateParam(selectedModule.id, param.name, !param.value)
                          }
                          className={`w-full py-1 px-2 rounded text-xs font-mono font-medium transition ${
                            param.value
                              ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                              : 'bg-slate-800 text-slate-400 border border-slate-700'
                          }`}
                        >
                          Value: {param.value ? 'true (enabled)' : 'false (disabled)'}
                        </button>
                      </div>
                    ) : param.type === 'int' ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          value={param.value as number}
                          onChange={(e) =>
                            onUpdateParam(selectedModule.id, param.name, Number(e.target.value))
                          }
                          className="w-full bg-slate-900 border border-slate-700 text-slate-100 rounded px-2.5 py-1 text-xs font-mono focus:border-amber-500 focus:outline-none"
                        />
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={param.value as string}
                          onChange={(e) =>
                            onUpdateParam(selectedModule.id, param.name, e.target.value)
                          }
                          className="w-full bg-slate-900 border border-slate-700 text-slate-100 rounded px-2.5 py-1 text-xs font-mono focus:border-amber-500 focus:outline-none"
                        />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
