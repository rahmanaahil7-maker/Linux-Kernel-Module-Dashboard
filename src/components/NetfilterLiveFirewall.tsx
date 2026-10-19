import React, { useState } from 'react';
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  Send,
  Sliders,
  Play,
  RotateCw,
  Radio,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import type { KernelState, NetfilterPacket } from '../kernel/types.ts';

interface NetfilterLiveFirewallProps {
  kernelState: KernelState;
  onSendPacket: (packet: Omit<NetfilterPacket, 'id' | 'timestamp' | 'verdict' | 'matchedRule'>) => void;
  onLoadModule: (moduleId: string) => void;
  onUpdateParam: (moduleId: string, paramName: string, value: string | number | boolean) => void;
}

export const NetfilterLiveFirewall: React.FC<NetfilterLiveFirewallProps> = ({
  kernelState,
  onSendPacket,
  onLoadModule,
  onUpdateParam,
}) => {
  const [protocol, setProtocol] = useState<'TCP' | 'UDP' | 'ICMP'>('TCP');
  const [srcIp, setSrcIp] = useState<string>('192.168.1.84');
  const [dstIp, setDstIp] = useState<string>('10.0.0.1');
  const [srcPort, setSrcPort] = useState<number>(53412);
  const [dstPort, setDstPort] = useState<number>(4444); // default banned port
  const [payload, setPayload] = useState<string>('GET /exploit_payload HTTP/1.1');

  const nfMod = kernelState.modules.find((m) => m.id === 'netfilter_guard');
  const isLoaded = nfMod?.status === 'loaded';
  const blockPort = Number(nfMod?.params.find((p) => p.name === 'block_port')?.value ?? 4444);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSendPacket({
      protocol,
      srcIp,
      dstIp,
      srcPort,
      dstPort,
      payload,
    });
  };

  const presetPackets = [
    { label: 'Attacker Port 4444 (Drop)', port: 4444, proto: 'TCP' as const, payload: 'Reverse Shell Shellcode' },
    { label: 'Web Port 443 (Accept)', port: 443, proto: 'TCP' as const, payload: 'TLS 1.3 ClientHello' },
    { label: 'HTTP Port 80 (Accept)', port: 80, proto: 'TCP' as const, payload: 'GET /index.html' },
    { label: 'DNS Port 53 (Accept)', port: 53, proto: 'UDP' as const, payload: 'Standard Query A kernel.org' },
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-cyan-400" />
            <h2 className="font-mono text-base font-bold text-slate-100">
              Netfilter Hook Packet Inspector: <span className="text-cyan-400">NF_INET_PRE_ROUTING</span>
            </h2>
            <span
              className={`text-xs px-2 py-0.5 rounded font-mono font-medium ${
                isLoaded
                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                  : 'bg-red-950 text-red-300 border border-red-800'
              }`}
            >
              {isLoaded ? `Hook Registered (Blocking Port ${blockPort})` : 'Module Unloaded'}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1 max-w-3xl">
            Linux Netfilter hooks allow LKMs to register callbacks (<code className="text-cyan-300">nf_hook_ops</code>) directly inside the kernel network stack to inspect raw <code className="text-slate-300">sk_buff</code> IP packets before they reach user space.
          </p>
        </div>

        {!isLoaded && (
          <button
            onClick={() => onLoadModule('netfilter_guard')}
            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded text-xs font-mono transition"
          >
            Insert netfilter_guard.ko
          </button>
        )}
      </div>

      {/* Main Grid: Packet Generator & Live Verdict Stream */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Packet Generator Form */}
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 flex flex-col justify-between shadow-lg">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <span className="font-mono text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                <Radio className="w-4 h-4 text-cyan-400" />
                Raw IP Packet Generator (sk_buff)
              </span>
              <span className="text-[11px] font-mono text-slate-500">
                Hook: NF_INET_PRE_ROUTING
              </span>
            </div>

            {/* Presets */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-3 mb-3 border-b border-slate-800/80 text-[11px] font-mono">
              <span className="text-slate-500 shrink-0">Presets:</span>
              {presetPackets.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => {
                    setDstPort(preset.port);
                    setProtocol(preset.proto);
                    setPayload(preset.payload);
                  }}
                  className="bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white px-2 py-0.5 rounded border border-slate-700 whitespace-nowrap transition"
                >
                  {preset.label}
                </button>
              ))}
            </div>

            <form onSubmit={handleSubmit} className="space-y-3 font-mono text-xs">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-400 text-[11px] mb-1">Protocol:</label>
                  <select
                    value={protocol}
                    onChange={(e) => setProtocol(e.target.value as any)}
                    className="w-full bg-slate-900 border border-slate-700 text-slate-100 rounded px-2.5 py-1.5 focus:border-amber-500 focus:outline-none"
                  >
                    <option value="TCP">TCP</option>
                    <option value="UDP">UDP</option>
                    <option value="ICMP">ICMP</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 text-[11px] mb-1">Source Port:</label>
                  <input
                    type="number"
                    value={srcPort}
                    onChange={(e) => setSrcPort(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-700 text-slate-100 rounded px-2.5 py-1.5 focus:border-amber-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 text-[11px] mb-1">Dest Port:</label>
                  <input
                    type="number"
                    value={dstPort}
                    onChange={(e) => setDstPort(Number(e.target.value))}
                    className={`w-full border rounded px-2.5 py-1.5 focus:outline-none ${
                      dstPort === blockPort && isLoaded
                        ? 'bg-red-950/40 border-red-500 text-red-300 font-bold'
                        : 'bg-slate-900 border-slate-700 text-slate-100'
                    }`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 text-[11px] mb-1">Source IP:</label>
                  <input
                    type="text"
                    value={srcIp}
                    onChange={(e) => setSrcIp(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 text-slate-100 rounded px-2.5 py-1.5 focus:border-amber-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 text-[11px] mb-1">Destination IP:</label>
                  <input
                    type="text"
                    value={dstIp}
                    onChange={(e) => setDstIp(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 text-slate-100 rounded px-2.5 py-1.5 focus:border-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 text-[11px] mb-1">Packet Payload:</label>
                <input
                  type="text"
                  value={payload}
                  onChange={(e) => setPayload(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 text-slate-100 rounded px-2.5 py-1.5 focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded text-xs font-mono transition flex items-center justify-center gap-2 shadow"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Transmit Packet into Kernel Stack</span>
                </button>
              </div>
            </form>
          </div>

          {/* Module Parameter Tweaker */}
          {isLoaded && (
            <div className="mt-4 pt-3 border-t border-slate-800 text-xs font-mono">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Active Banned Port Parameter:</span>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={blockPort}
                    onChange={(e) =>
                      onUpdateParam('netfilter_guard', 'block_port', Number(e.target.value))
                    }
                    className="w-20 bg-slate-900 border border-slate-700 text-amber-300 rounded px-2 py-1 text-center text-xs font-bold"
                  />
                  <span className="text-slate-500 text-[10px]">/sys/module/...</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Live Packet Verdict Stream */}
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 flex flex-col justify-between shadow-lg">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <span className="font-mono text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                Live Hook Verdict Stream (sk_buff)
              </span>
              <span className="text-[11px] font-mono text-slate-500">
                {kernelState.packetHistory.length} Packets Evaluated
              </span>
            </div>

            <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
              {kernelState.packetHistory.length === 0 ? (
                <div className="text-slate-600 text-center py-12 font-mono text-xs">
                  No network packets processed yet. Click &quot;Transmit Packet&quot;!
                </div>
              ) : (
                kernelState.packetHistory.map((pkt) => (
                  <div
                    key={pkt.id}
                    className={`p-3 rounded-lg border font-mono text-xs flex flex-col gap-1.5 transition ${
                      pkt.verdict === 'NF_DROP'
                        ? 'bg-red-950/30 border-red-800/60 text-red-200'
                        : 'bg-emerald-950/20 border-emerald-800/50 text-emerald-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {pkt.verdict === 'NF_DROP' ? (
                          <span className="flex items-center gap-1 font-bold text-red-400 bg-red-950 px-2 py-0.5 rounded border border-red-700/60 text-[10px]">
                            <XCircle className="w-3 h-3" />
                            NF_DROP
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 font-bold text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-700/60 text-[10px]">
                            <CheckCircle2 className="w-3 h-3" />
                            NF_ACCEPT
                          </span>
                        )}
                        <span className="text-slate-400 font-bold">{pkt.protocol}</span>
                        <span className="text-slate-200">
                          {pkt.srcIp}:{pkt.srcPort} &rarr; {pkt.dstIp}:{pkt.dstPort}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-500">{pkt.timestamp}</span>
                    </div>

                    <div className="text-[11px] text-slate-400 bg-slate-950/80 px-2 py-1 rounded border border-slate-800 truncate">
                      Payload: &quot;{pkt.payload}&quot;
                    </div>

                    {pkt.matchedRule && (
                      <div className="text-[10px] text-red-400 font-semibold">
                        Rule: {pkt.matchedRule}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
