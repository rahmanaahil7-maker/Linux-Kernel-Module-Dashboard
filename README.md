# 🐧 Linux Kernel Module (LKM) Studio & Interactive Simulator

![React](https://img.shields.io/badge/React-18+-61DAFB?logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-3178C6?logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-Bundler-646CFF?logo=vite&logoColor=white)
![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)

An interactive, browser-based **Linux Kernel Module (LKM) Workbench & Ring 0 Simulator** built with React and TypeScript. This project lets students and systems programmers explore Linux kernel internals, load/unload modules (`insmod`/`rmmod`), test character device drivers (`/dev`), inspect Netfilter firewall packets, and trigger/recover from kernel panics—all inside a safe, visual sandbox before exporting real C code.

---

## ✨ Key Features & Modules

- 🛠️ **Code Workbench & Module Catalog (`CodeWorkbench`, `ModuleCatalog`):** Browse starter LKM templates (e.g., `hello_lkm`), inspect C kernel source code, dynamically update module parameters (`updateModuleParam`), and load/unload modules into the simulated kernel state.
- 🔄 **Ring 3 ↔ Ring 0 Architecture Visualizer (`RingVisualizer`):** Interactive visualization of how user-space system calls transition across the privilege boundary into kernel subsystems.
- 💻 **Interactive Kernel Terminal (`TerminalConsole`):** Execute shell commands (`executeShellCommand`) like `insmod`, `rmmod`, `lsmod`, and `dmesg` against a live simulated kernel state with real-time uptime tracking.
- 📟 **Character Device Test Bench (`CharDeviceTestBench`):** Simulate VFS file operations (`readFromCharDevice`, `writeToCharDevice`, `ioctlCharDevice`) to see how user-space buffers interact with `/dev` character drivers.
- 🛡️ **Netfilter Live Firewall (`NetfilterLiveFirewall`):** Inject and inspect simulated network packets (`processNetfilterPacket`) to test custom packet filtering hooks and firewall rules in real time.
- 💥 **Kernel Panic & Fault Lab (`PanicLab`):** Safely trigger kernel faults (`triggerKernelFault`) such as null pointer dereferences or buffer overflows, inspect the simulated `Oops`/panic trace, and recover the kernel (`recoverKernel`).
- 📦 **One-Click C Project Exporter (`exportBundle`):** Export your configured kernel module directly into a ready-to-compile C source bundle (`exportKernelProject`) complete with a `Makefile`.

---

## 📂 Project Structure

```text
├── .aistudio/                     # Google AI Studio project metadata
├── src/
│   ├── components/
│   │   ├── CharDeviceTestBench.tsx  # VFS read/write/ioctl character device tester
│   │   ├── CodeWorkbench.tsx        # LKM C code viewer & parameter editor
│   │   ├── KernelGuideModal.tsx     # Interactive OS & LKM learning guide
│   │   ├── ModuleCatalog.tsx        # Sidebar selector for LKM templates
│   │   ├── Navbar.tsx               # Navigation bar & project export actions
│   │   ├── NetfilterLiveFirewall.tsx# Packet hook & firewall simulator
│   │   ├── PanicLab.tsx             # Kernel fault injection & recovery lab
│   │   ├── RingVisualizer.tsx       # User-space vs Kernel-space (Ring 0) diagram
│   │   └── TerminalConsole.tsx      # Simulated Linux shell & dmesg viewer
│   ├── kernel/
│   │   ├── engine.ts                # Core state machine for simulated kernel ops
│   │   ├── engine.test.ts           # Unit tests for kernel state transitions
│   │   └── types.ts                 # TypeScript interfaces (KernelState, NetfilterPacket)
│   ├── utils/
│   │   └── exportBundle.ts          # C source code & Makefile bundle exporter
│   ├── App.tsx                      # Root application state & tab router
│   ├── index.css                    # Global styles
│   └── main.tsx                     # React DOM entry point
├── .env.example                   # Environment variable template
├── index.html                     # HTML entry point
├── package.json                   # Project dependencies and scripts
├── tsconfig.json                  # TypeScript configuration
└── vite.config.ts                 # Vite bundler configuration
