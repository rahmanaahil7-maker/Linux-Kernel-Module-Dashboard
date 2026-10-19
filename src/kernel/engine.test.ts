import test from 'node:test';
import assert from 'node:assert/strict';
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
  executeShellCommand,
} from './engine.ts';

test('createInitialKernelState initializes clean kernel environment', () => {
  const state = createInitialKernelState();
  assert.equal(state.kernelVersion, '6.11.0-generic');
  assert.ok(state.modules.length >= 6);
  assert.ok(state.dmesg.length > 0);
  assert.equal(state.panicState.isPanicked, false);
});

test('loadModule transitions module status to loaded and logs to dmesg', () => {
  const state = createInitialKernelState();
  const nextState = loadModule(state, 'hello_lkm', { greet_count: 2 });
  const mod = nextState.modules.find((m) => m.id === 'hello_lkm');

  assert.ok(mod);
  assert.equal(mod.status, 'loaded');
  assert.equal(mod.params.find((p) => p.name === 'greet_count')?.value, 2);

  // Check dmesg has entry
  const lastDmesg = nextState.dmesg[nextState.dmesg.length - 1];
  assert.ok(lastDmesg.message.includes('hello_lkm') || lastDmesg.message.includes('sysfs'));
});

test('unloadModule transitions module back to unloaded', () => {
  let state = createInitialKernelState();
  state = loadModule(state, 'proc_sysmon');
  assert.equal(state.modules.find((m) => m.id === 'proc_sysmon')?.status, 'loaded');

  state = unloadModule(state, 'proc_sysmon');
  assert.equal(state.modules.find((m) => m.id === 'proc_sysmon')?.status, 'unloaded');
});

test('Character device kcrypto handles write, transform, and read', () => {
  let state = createInitialKernelState();
  state = loadModule(state, 'kcrypto');

  // Test ROT13 transform
  state = writeToCharDevice(state, 'Hello Kernel', 'rot13');
  const { state: readState, result } = readFromCharDevice(state);

  assert.equal(result, 'Uryyb Xreary');
  assert.ok(readState.charBuffer.totalWrites > 0);
  assert.ok(readState.charBuffer.totalReads > 0);
});

test('IOCTL commands update key and reset buffer', () => {
  let state = createInitialKernelState();
  state = loadModule(state, 'kcrypto');
  state = writeToCharDevice(state, 'Test Message', 'plain');
  assert.equal(state.charBuffer.content, 'Test Message');

  // Reset via IOCTL
  state = ioctlCharDevice(state, 'RESET_BUF');
  assert.equal(state.charBuffer.content, '');

  // Set Key via IOCTL
  state = ioctlCharDevice(state, 'SET_KEY', 42);
  assert.equal(state.charBuffer.cipherKey, 42);
});

test('Netfilter packet hook drops banned port packets', () => {
  let state = createInitialKernelState();
  state = loadModule(state, 'netfilter_guard');

  const { state: s1, packet: p1 } = processNetfilterPacket(state, {
    protocol: 'TCP',
    srcIp: '192.168.1.50',
    dstIp: '10.0.0.1',
    srcPort: 51234,
    dstPort: 4444, // Banned port!
    payload: 'Exploit attempt',
  });
  assert.equal(p1.verdict, 'NF_DROP');

  const { packet: p2 } = processNetfilterPacket(s1, {
    protocol: 'TCP',
    srcIp: '192.168.1.50',
    dstIp: '10.0.0.1',
    srcPort: 51234,
    dstPort: 80, // Allowed port
    payload: 'GET / HTTP/1.1',
  });
  assert.equal(p2.verdict, 'NF_ACCEPT');
});

test('Kernel Fault simulator generates Panic State and Oops dumps', () => {
  let state = createInitialKernelState();
  state = triggerKernelFault(state, 'NULL_DEREF');
  assert.equal(state.panicState.isPanicked, true);
  assert.ok(state.panicState.rip?.includes('kcrypto'));
  assert.ok(state.dmesg.some((e) => e.level === 'KERN_EMERG'));
});

test('Shell command parser handles lsmod, insmod, rmmod, uname, and cat', () => {
  let state = createInitialKernelState();
  const r1 = executeShellCommand(state, 'uname -r');
  assert.equal(r1.output, '6.11.0-generic');

  const r2 = executeShellCommand(r1.state, 'insmod hello_lkm.ko greet_count=4');
  assert.equal(r2.state.modules.find((m) => m.id === 'hello_lkm')?.status, 'loaded');

  const r3 = executeShellCommand(r2.state, 'lsmod');
  assert.ok(r3.output.includes('hello_lkm'));

  const r4 = executeShellCommand(r3.state, 'rmmod hello_lkm');
  assert.equal(r4.state.modules.find((m) => m.id === 'hello_lkm')?.status, 'unloaded');
});
