import type { KernelModule } from '../kernel/types.ts';

export function exportKernelProject(modules: KernelModule[]): void {
  // Generate a complete shell unpacker script that creates the directory structure
  let script = `#!/bin/bash
# K-MOD Studio: Linux Kernel Module Complete Source Bundle
# Generated from K-MOD Studio Ring 0 Lab
# Target: Linux Kernel 6.x / 5.x with linux-headers-$(uname -r)

set -e
echo "=========================================================="
echo "  Extracting Linux Kernel Modules to ./linux_kmod_project"
echo "=========================================================="

mkdir -p linux_kmod_project
cd linux_kmod_project

cat << 'EOF' > README.md
# Linux Kernel Module (LKM) Project Suite

Contains 6 production-grade Linux Kernel Modules:
1. \`hello_lkm\` - Module parameters, sysfs attributes, init/exit
2. \`kcrypto\` - Character device driver (/dev/kcrypto), copy_from_user, ioctl
3. \`proc_sysmon\` - Virtual procfs filesystem monitor (/proc/sysmon)
4. \`netfilter_guard\` - Netfilter packet inspection at NF_INET_PRE_ROUTING
5. \`sys_hook_audit\` - Kprobe syscall monitor for sys_openat
6. \`watchdog_timer\` - Kernel timer and bottom-half workqueue worker

## Quick Start (Ubuntu / Debian / Fedora):
\`\`\`bash
# 1. Install kernel development headers
sudo apt update && sudo apt install build-essential linux-headers-$(uname -r)

# 2. Build any module (e.g., hello_lkm):
cd hello_lkm
make
sudo insmod hello_lkm.ko greet_count=5
dmesg | tail -n 10
sudo rmmod hello_lkm
\`\`\`
EOF

`;

  modules.forEach((mod) => {
    script += `mkdir -p "${mod.name}"\n`;
    script += `cat << 'EOF' > "${mod.name}/${mod.name}.c"\n${mod.cSourceCode}\nEOF\n\n`;
    script += `cat << 'EOF' > "${mod.name}/Makefile"\n${mod.makeFileCode}\nEOF\n\n`;
    if (mod.userTestCode) {
      script += `cat << 'EOF' > "${mod.name}/test_client.c"\n${mod.userTestCode}\nEOF\n\n`;
    }
  });

  script += `echo "Extraction complete! Enter any module folder and run 'make' to compile."\n`;

  const blob = new Blob([script], { type: 'text/x-shellscript;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'setup_lkm_project.sh';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
