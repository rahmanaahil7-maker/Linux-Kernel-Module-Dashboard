/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar.tsx';
import { ModuleCatalog } from './components/ModuleCatalog.tsx';
import { CodeWorkbench } from './components/CodeWorkbench.tsx';
import { RingVisualizer } from './components/RingVisualizer.tsx';
import { TerminalConsole } from './components/TerminalConsole.tsx';
import { CharDeviceTestBench } from './components/CharDeviceTestBench.tsx';
import { NetfilterLiveFirewall } from './components/NetfilterLiveFirewall.tsx';
import { PanicLab } from './components/PanicLab.tsx';
import { KernelGuideModal } from './components/KernelGuideModal.tsx';
import { exportKernelProject } from './utils/exportBundle.ts';
import {
  createInitialKernelState,
  loadModule,
  unloadModule,
  updateModuleParam,
  writeToCharDevice,
  readFromCharDevice,
  ioctlCharDevice,
  processNetfilterPacket,
  triggerKernelFault,
  recoverKernel,
  executeShellCommand,
} from './kernel/engine.ts';
import type { KernelState, NetfilterPacket } from './kernel/types.ts';

export default function App() {
  const [kernelState, setKernelState] = useState<KernelState>(() => createInitialKernelState());
  const [activeTab, setActiveTab] = useState<
    'workbench' | 'architecture' | 'terminal' | 'chardev' | 'netfilter' | 'panic'
  >('workbench');
  const [selectedModuleId, setSelectedModuleId] = useState<string>('hello_lkm');
  const [isGuideOpen, setIsGuideOpen] = useState<boolean>(false);

  // Background ticker for uptime in simulated kernel
  useEffect(() => {
    const timer = setInterval(() => {
      setKernelState((prev) => {
        if (prev.panicState.isPanicked) return prev;
        return {
          ...prev,
          uptimeSeconds: prev.uptimeSeconds + 1,
        };
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleLoadModule = (moduleId: string) => {
    setKernelState((prev) => loadModule(prev, moduleId));
  };

  const handleUnloadModule = (moduleId: string) => {
    setKernelState((prev) => unloadModule(prev, moduleId));
  };

  const handleUpdateParam = (
    moduleId: string,
    paramName: string,
    value: string | number | boolean
  ) => {
    setKernelState((prev) => updateModuleParam(prev, moduleId, paramName, value));
  };

  const handleWriteCharDevice = (
    text: string,
    algo?: 'plain' | 'xor' | 'caesar' | 'rot13',
    key?: number
  ) => {
    setKernelState((prev) => writeToCharDevice(prev, text, algo, key));
  };

  const handleReadCharDevice = () => {
    setKernelState((prev) => {
      const { state: nextState } = readFromCharDevice(prev);
      return nextState;
    });
  };

  const handleIoctlCharDevice = (
    cmd: 'RESET_BUF' | 'SET_KEY' | 'SET_ALGO',
    paramValue?: number | string
  ) => {
    setKernelState((prev) => ioctlCharDevice(prev, cmd, paramValue));
  };

  const handleSendPacket = (
    packet: Omit<NetfilterPacket, 'id' | 'timestamp' | 'verdict' | 'matchedRule'>
  ) => {
    setKernelState((prev) => {
      const { state: nextState } = processNetfilterPacket(prev, packet);
      return nextState;
    });
  };

  const handleTriggerFault = (
    faultType: 'NULL_DEREF' | 'BAD_USER_COPY' | 'MEM_LEAK' | 'SPINLOCK_DEADLOCK'
  ) => {
    setKernelState((prev) => triggerKernelFault(prev, faultType));
  };

  const handleRecoverKernel = () => {
    setKernelState(recoverKernel(kernelState));
  };

  const handleExecuteCommand = (cmdLine: string) => {
    setKernelState((prev) => {
      const { state: nextState } = executeShellCommand(prev, cmdLine);
      return nextState;
    });
  };

  const handleClearDmesg = () => {
    setKernelState((prev) => ({
      ...prev,
      dmesg: [],
    }));
  };

  const handleExportProject = () => {
    exportKernelProject(kernelState.modules);
  };

  const currentModule =
    kernelState.modules.find((m) => m.id === selectedModuleId) || kernelState.modules[0];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-amber-500 selection:text-slate-950">
      <Navbar
        kernelState={kernelState}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onResetKernel={handleRecoverKernel}
        onOpenGuide={() => setIsGuideOpen(true)}
        onExportCode={handleExportProject}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6">
        {activeTab === 'workbench' && (
          <div className="space-y-6">
            <ModuleCatalog
              modules={kernelState.modules}
              selectedModuleId={selectedModuleId}
              onSelectModule={setSelectedModuleId}
              onLoadModule={handleLoadModule}
              onUnloadModule={handleUnloadModule}
              onUpdateParam={handleUpdateParam}
            />

            <CodeWorkbench
              module={currentModule}
              onLoadModule={handleLoadModule}
              onUnloadModule={handleUnloadModule}
            />
          </div>
        )}

        {activeTab === 'architecture' && <RingVisualizer />}

        {activeTab === 'terminal' && (
          <TerminalConsole
            kernelState={kernelState}
            onExecuteCommand={handleExecuteCommand}
            onClearDmesg={handleClearDmesg}
          />
        )}

        {activeTab === 'chardev' && (
          <CharDeviceTestBench
            kernelState={kernelState}
            onWrite={handleWriteCharDevice}
            onRead={handleReadCharDevice}
            onIoctl={handleIoctlCharDevice}
            onLoadModule={handleLoadModule}
          />
        )}

        {activeTab === 'netfilter' && (
          <NetfilterLiveFirewall
            kernelState={kernelState}
            onSendPacket={handleSendPacket}
            onLoadModule={handleLoadModule}
            onUpdateParam={handleUpdateParam}
          />
        )}

        {activeTab === 'panic' && (
          <PanicLab
            kernelState={kernelState}
            onTriggerFault={handleTriggerFault}
            onRecoverKernel={handleRecoverKernel}
          />
        )}
      </main>

      <KernelGuideModal
        isOpen={isGuideOpen}
        onClose={() => setIsGuideOpen(false)}
        onExport={handleExportProject}
      />

      {/* Global Status Footer */}
      <footer className="border-t border-slate-900 bg-slate-950/80 py-3 px-4 text-xs font-mono text-slate-500 select-none">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span>K-MOD Studio &bull; Linux Kernel Module Architect</span>
            <span className="hidden sm:inline text-slate-700">|</span>
            <span className="hidden sm:inline">x86_64 Supervisor Mode (Ring 0)</span>
          </div>

          <div className="flex items-center gap-4 text-slate-400">
            <span>Modules in Memory: {kernelState.modules.filter((m) => m.status === 'loaded').length}/6</span>
            <span>dmesg Ring Buffer: {kernelState.dmesg.length} logs</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
