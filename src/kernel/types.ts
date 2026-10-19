export type KernelLogLevel =
  | 'KERN_EMERG'
  | 'KERN_ALERT'
  | 'KERN_CRIT'
  | 'KERN_ERR'
  | 'KERN_WARNING'
  | 'KERN_NOTICE'
  | 'KERN_INFO'
  | 'KERN_DEBUG';

export interface DmesgEntry {
  id: string;
  timestamp: number; // in seconds like 12.458921
  level: KernelLogLevel;
  facility: string; // e.g. "kmod_core", "kcrypto", "netfilter"
  message: string;
}

export interface ModuleParam {
  name: string;
  type: 'int' | 'charp' | 'bool' | 'ulong';
  value: string | number | boolean;
  defaultValue: string | number | boolean;
  perm: string; // e.g. "0644", "0444"
  description: string;
}

export interface DeviceNode {
  path: string; // e.g. "/dev/kcrypto"
  type: 'char' | 'block';
  major: number;
  minor: number;
  description: string;
  permissions: string;
}

export interface ProcEntry {
  path: string; // e.g. "/proc/sysmon"
  mode: string;
  description: string;
}

export interface SyscallTrace {
  id: string;
  timestamp: string;
  pid: number;
  comm: string;
  syscall: string;
  args: string[];
  retval: string;
  durationUs: number;
  ringFlow: string;
}

export interface KernelModule {
  id: string;
  name: string; // e.g. "kcrypto"
  version: string;
  author: string;
  description: string;
  license: string;
  sizeBytes: number;
  memoryAddress: string; // e.g. "0xffffffffc045a000"
  refCount: number;
  dependencies: string[];
  status: 'unloaded' | 'compiling' | 'loaded' | 'panicked';
  category: 'Driver' | 'Security' | 'Filesystem' | 'Networking' | 'Core';
  params: ModuleParam[];
  devices: DeviceNode[];
  procEntries: ProcEntry[];
  cSourceCode: string;
  makeFileCode: string;
  userTestCode?: string;
}

export interface NetfilterPacket {
  id: string;
  timestamp: string;
  protocol: 'TCP' | 'UDP' | 'ICMP';
  srcIp: string;
  dstIp: string;
  srcPort: number;
  dstPort: number;
  payload: string;
  verdict: 'NF_ACCEPT' | 'NF_DROP' | 'NF_QUEUE';
  matchedRule?: string;
}

export interface KernelPanicState {
  isPanicked: boolean;
  reason?: string;
  faultType?: 'NULL_DEREF' | 'BAD_USER_COPY' | 'MEM_LEAK' | 'SPINLOCK_DEADLOCK';
  rip?: string;
  rsp?: string;
  cr2?: string;
  callTrace?: string[];
  tainted: string;
  timestamp?: number;
}

export interface CharDeviceBuffer {
  content: string;
  cipherMode: 'plain' | 'xor' | 'caesar' | 'rot13';
  cipherKey: number;
  totalReads: number;
  totalWrites: number;
  bytesProcessed: number;
}

export interface KernelState {
  kernelVersion: string;
  arch: string;
  uptimeSeconds: number;
  modules: KernelModule[];
  dmesg: DmesgEntry[];
  syscallHistory: SyscallTrace[];
  panicState: KernelPanicState;
  charBuffer: CharDeviceBuffer;
  packetHistory: NetfilterPacket[];
  terminalHistory: string[];
  commandOutputHistory: Array<{ command: string; output: string; time: string; status: number }>;
}
