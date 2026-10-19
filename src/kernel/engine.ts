import type {
  CharDeviceBuffer,
  DmesgEntry,
  KernelLogLevel,
  KernelModule,
  KernelPanicState,
  KernelState,
  NetfilterPacket,
  SyscallTrace,
} from './types.ts';

// Pre-packaged realistic Linux Kernel Modules with full C source, Makefile, and metadata
export const DEFAULT_MODULES: KernelModule[] = [
  {
    id: 'hello_lkm',
    name: 'hello_lkm',
    version: '1.2.0',
    author: 'Linus Developer <kernel-dev@kernel.org>',
    description: 'Classic Hello World Kernel Module with runtime parameters & sysfs visibility',
    license: 'GPL',
    sizeBytes: 14336,
    memoryAddress: '0xffffffffc0280000',
    refCount: 0,
    dependencies: [],
    status: 'unloaded',
    category: 'Core',
    params: [
      {
        name: 'greet_count',
        type: 'int',
        value: 3,
        defaultValue: 3,
        perm: '0644',
        description: 'Number of times to print greetings during module_init()',
      },
      {
        name: 'custom_banner',
        type: 'charp',
        value: 'Linux Kernel Space Greetings',
        defaultValue: 'Linux Kernel Space Greetings',
        perm: '0644',
        description: 'Banner string logged into dmesg during initialization',
      },
      {
        name: 'debug_mode',
        type: 'bool',
        value: true,
        defaultValue: true,
        perm: '0444',
        description: 'Enable verbose kernel debug logs',
      },
    ],
    devices: [],
    procEntries: [],
    cSourceCode: `// SPDX-License-Identifier: GPL-2.0
/**
 * hello_lkm.c - The simplest Linux Kernel Module
 * Demonstrates module_init, module_exit, and module_param.
 */
#include <linux/init.h>
#include <linux/module.h>
#include <linux/kernel.h>

MODULE_LICENSE("GPL");
MODULE_AUTHOR("Linus Developer <kernel-dev@kernel.org>");
MODULE_DESCRIPTION("Classic Hello World LKM with runtime parameters");
MODULE_VERSION("1.2.0");

static int greet_count = 3;
module_param(greet_count, int, 0644);
MODULE_PARM_DESC(greet_count, "Number of greeting iterations (default=3)");

static char *custom_banner = "Linux Kernel Space Greetings";
module_param(custom_banner, charp, 0644);
MODULE_PARM_DESC(custom_banner, "Banner string for dmesg");

static bool debug_mode = true;
module_param(debug_mode, bool, 0444);
MODULE_PARM_DESC(debug_mode, "Enable verbose kernel logs");

static int __init hello_lkm_init(void)
{
    int i;
    pr_info("hello_lkm: Initializing module in Ring 0\\n");
    pr_info("hello_lkm: Loaded at base virtual address: %px\\n", hello_lkm_init);
    
    for (i = 0; i < greet_count; i++) {
        pr_info("hello_lkm: [%d/%d] %s\\n", i + 1, greet_count, custom_banner);
    }
    
    if (debug_mode)
        pr_debug("hello_lkm: Module state verified. Allocated in module memory pool.\\n");

    return 0; // Success
}

static void __exit hello_lkm_exit(void)
{
    pr_info("hello_lkm: Cleaning up module, unregistering symbols... Goodbye!\\n");
}

module_init(hello_lkm_init);
module_exit(hello_lkm_exit);
`,
    makeFileCode: `obj-m += hello_lkm.o

KDIR ?= /lib/modules/$(shell uname -r)/build
PWD := $(shell pwd)

default:
\t$(MAKE) -C $(KDIR) M=$(PWD) modules

clean:
\t$(MAKE) -C $(KDIR) M=$(PWD) clean
`,
    userTestCode: `// Verify in bash:
// sudo insmod hello_lkm.ko greet_count=5 custom_banner="Custom Ring0 Greeting"
// dmesg | tail -n 10
// cat /sys/module/hello_lkm/parameters/greet_count
// sudo rmmod hello_lkm
`,
  },
  {
    id: 'kcrypto',
    name: 'kcrypto',
    version: '2.1.4',
    author: 'Security Subsystem Team <sec@kernel.org>',
    description: 'Character Device Driver (/dev/kcrypto) with copy_from_user/copy_to_user & IOCTL encryption',
    license: 'GPL',
    sizeBytes: 28672,
    memoryAddress: '0xffffffffc0341000',
    refCount: 0,
    dependencies: [],
    status: 'unloaded',
    category: 'Driver',
    params: [
      {
        name: 'default_key',
        type: 'int',
        value: 13,
        defaultValue: 13,
        perm: '0644',
        description: 'Default cryptographic XOR/Caesar key',
      },
      {
        name: 'cipher_algo',
        type: 'charp',
        value: 'rot13',
        defaultValue: 'rot13',
        perm: '0644',
        description: 'Cipher algorithm: plain, xor, caesar, rot13',
      },
    ],
    devices: [
      {
        path: '/dev/kcrypto',
        type: 'char',
        major: 240,
        minor: 0,
        description: 'Hardware/Kernel Character Device stream for fast ciphering',
        permissions: 'crw-rw-rw-',
      },
    ],
    procEntries: [],
    cSourceCode: `// SPDX-License-Identifier: GPL-2.0
/**
 * kcrypto.c - Character Device Driver (/dev/kcrypto)
 * Demonstrates:
 * - alloc_chrdev_region & cdev_init
 * - file_operations (open, release, read, write, unlocked_ioctl)
 * - Safe memory barriers: copy_to_user() and copy_from_user()
 */
#include <linux/init.h>
#include <linux/module.h>
#include <linux/fs.h>
#include <linux/cdev.h>
#include <linux/uaccess.h>
#include <linux/slab.h>
#include <linux/ioctl.h>

#define DEVICE_NAME "kcrypto"
#define BUFFER_SIZE 1024

/* IOCTL Definitions */
#define KCRYPTO_IOC_MAGIC 'k'
#define KCRYPTO_IOCTL_RESET_BUF  _IO(KCRYPTO_IOC_MAGIC, 0)
#define KCRYPTO_IOCTL_SET_KEY    _IOW(KCRYPTO_IOC_MAGIC, 1, int)
#define KCRYPTO_IOCTL_SET_ALGO   _IOW(KCRYPTO_IOC_MAGIC, 2, char[16])

MODULE_LICENSE("GPL");
MODULE_AUTHOR("Security Subsystem Team");
MODULE_DESCRIPTION("Kernel Space Stream Cipher Character Device");

static dev_t dev_num;
static struct cdev kcrypto_cdev;
static struct class *kcrypto_class = NULL;
static char *kernel_buffer;
static size_t data_len = 0;
static int cipher_key = 13;
static char cipher_algo[16] = "rot13";

static int dev_open(struct inode *inodep, struct file *filep)
{
    pr_info("kcrypto: Device opened by PID %d (%s)\\n", current->pid, current->comm);
    return 0;
}

static int dev_release(struct inode *inodep, struct file *filep)
{
    pr_info("kcrypto: Device closed successfully\\n");
    return 0;
}

static ssize_t dev_read(struct file *filep, char __user *user_buf, size_t len, loff_t *offset)
{
    size_t bytes_to_copy;
    unsigned long not_copied;

    if (*offset >= data_len)
        return 0; // EOF

    bytes_to_copy = min(len, (size_t)(data_len - *offset));

    /* Safe transfer from Ring 0 to Ring 3 */
    not_copied = copy_to_user(user_buf, kernel_buffer + *offset, bytes_to_copy);
    if (not_copied != 0) {
        pr_warn("kcrypto: copy_to_user failed for %lu bytes\\n", not_copied);
        return -EFAULT;
    }

    *offset += bytes_to_copy;
    pr_info("kcrypto: Transferred %zu bytes to user space\\n", bytes_to_copy);
    return bytes_to_copy;
}

static ssize_t dev_write(struct file *filep, const char __user *user_buf, size_t len, loff_t *offset)
{
    size_t i;
    unsigned long not_copied;
    size_t bytes_to_copy = min(len, (size_t)(BUFFER_SIZE - 1));

    /* Safe transfer from Ring 3 to Ring 0 */
    not_copied = copy_from_user(kernel_buffer, user_buf, bytes_to_copy);
    if (not_copied != 0) {
        pr_err("kcrypto: copy_from_user fault! Possible invalid user pointer\\n");
        return -EFAULT;
    }

    kernel_buffer[bytes_to_copy] = '\\0';
    data_len = bytes_to_copy;

    /* Execute In-Kernel Transformation */
    for (i = 0; i < data_len; i++) {
        char c = kernel_buffer[i];
        if (strcmp(cipher_algo, "rot13") == 0) {
            if (c >= 'a' && c <= 'z') c = 'a' + (c - 'a' + 13) % 26;
            else if (c >= 'A' && c <= 'Z') c = 'A' + (c - 'A' + 13) % 26;
        } else if (strcmp(cipher_algo, "xor") == 0) {
            c ^= (char)(cipher_key & 0xFF);
        } else if (strcmp(cipher_algo, "caesar") == 0) {
            if (c >= 'a' && c <= 'z') c = 'a' + (c - 'a' + cipher_key) % 26;
            else if (c >= 'A' && c <= 'Z') c = 'A' + (c - 'A' + cipher_key) % 26;
        }
        kernel_buffer[i] = c;
    }

    pr_info("kcrypto: Received %zu bytes, applied algorithm '%s'\\n", data_len, cipher_algo);
    return bytes_to_copy;
}

static long dev_ioctl(struct file *filep, unsigned int cmd, unsigned long arg)
{
    switch (cmd) {
    case KCRYPTO_IOCTL_RESET_BUF:
        data_len = 0;
        memset(kernel_buffer, 0, BUFFER_SIZE);
        pr_info("kcrypto: Buffer cleared via IOCTL\\n");
        break;
    case KCRYPTO_IOCTL_SET_KEY:
        if (copy_from_user(&cipher_key, (int __user *)arg, sizeof(int)))
            return -EFAULT;
        pr_info("kcrypto: IOCTL updated cipher key to %d\\n", cipher_key);
        break;
    default:
        return -EINVAL;
    }
    return 0;
}

static const struct file_operations fops = {
    .owner          = THIS_MODULE,
    .open           = dev_open,
    .release        = dev_release,
    .read           = dev_read,
    .write          = dev_write,
    .unlocked_ioctl = dev_ioctl,
};

static int __init kcrypto_init(void)
{
    int ret;
    kernel_buffer = kmalloc(BUFFER_SIZE, GFP_KERNEL);
    if (!kernel_buffer) return -ENOMEM;

    ret = alloc_chrdev_region(&dev_num, 0, 1, DEVICE_NAME);
    if (ret < 0) return ret;

    cdev_init(&kcrypto_cdev, &fops);
    ret = cdev_add(&kcrypto_cdev, dev_num, 1);
    if (ret < 0) return ret;

    kcrypto_class = class_create("kcrypto_class");
    device_create(kcrypto_class, NULL, dev_num, NULL, DEVICE_NAME);

    pr_info("kcrypto: Registered chrdev /dev/%s [Major: %d, Minor: %d]\\n",
            DEVICE_NAME, MAJOR(dev_num), MINOR(dev_num));
    return 0;
}

static void __exit kcrypto_exit(void)
{
    device_destroy(kcrypto_class, dev_num);
    class_destroy(kcrypto_class);
    cdev_del(&kcrypto_cdev);
    unregister_chrdev_region(dev_num, 1);
    kfree(kernel_buffer);
    pr_info("kcrypto: Driver unloaded cleanly from kernel space\\n");
}

module_init(kcrypto_init);
module_exit(kcrypto_exit);
`,
    makeFileCode: `obj-m += kcrypto.o

KDIR ?= /lib/modules/$(shell uname -r)/build
PWD := $(shell pwd)

all:
\t$(MAKE) -C $(KDIR) M=$(PWD) modules

clean:
\t$(MAKE) -C $(KDIR) M=$(PWD) clean
\trm -f test_client
`,
    userTestCode: `/**
 * test_client.c - User space application (Ring 3) interacting with /dev/kcrypto
 */
#include <stdio.h>
#include <fcntl.h>
#include <unistd.h>
#include <string.h>
#include <sys/ioctl.h>

#define KCRYPTO_IOC_MAGIC 'k'
#define KCRYPTO_IOCTL_RESET_BUF _IO(KCRYPTO_IOC_MAGIC, 0)
#define KCRYPTO_IOCTL_SET_KEY   _IOW(KCRYPTO_IOC_MAGIC, 1, int)

int main(void) {
    int fd = open("/dev/kcrypto", O_RDWR);
    if (fd < 0) {
        perror("Failed to open /dev/kcrypto");
        return 1;
    }

    const char *secret = "Kernel Space Data Flow!";
    printf("[Ring 3] Writing: '%s' to /dev/kcrypto\\n", secret);
    write(fd, secret, strlen(secret));

    char buffer[128] = {0};
    lseek(fd, 0, SEEK_SET);
    read(fd, buffer, sizeof(buffer) - 1);
    printf("[Ring 3] Read Ciphered Output: '%s'\\n", buffer);

    int new_key = 42;
    ioctl(fd, KCRYPTO_IOCTL_SET_KEY, &new_key);
    close(fd);
    return 0;
}
`,
  },
  {
    id: 'proc_sysmon',
    name: 'proc_sysmon',
    version: '1.0.8',
    author: 'Telemetry Group <ops@kernel.org>',
    description: 'Procfs virtual filesystem monitor exposing live task count, memory stats & jiffies via /proc/sysmon',
    license: 'GPL',
    sizeBytes: 18432,
    memoryAddress: '0xffffffffc039a000',
    refCount: 0,
    dependencies: [],
    status: 'unloaded',
    category: 'Filesystem',
    params: [
      {
        name: 'sample_interval_ms',
        type: 'int',
        value: 1000,
        defaultValue: 1000,
        perm: '0644',
        description: 'Sampling period in milliseconds',
      },
    ],
    devices: [],
    procEntries: [
      {
        path: '/proc/sysmon',
        mode: '0444',
        description: 'Kernel metrics, active task queue size, slab pages, and uptime',
      },
    ],
    cSourceCode: `// SPDX-License-Identifier: GPL-2.0
/**
 * proc_sysmon.c - Exposes kernel internal metrics through /proc/sysmon
 * Uses proc_create() and struct proc_ops
 */
#include <linux/init.h>
#include <linux/module.h>
#include <linux/proc_fs.h>
#include <linux/seq_file.h>
#include <linux/jiffies.h>
#include <linux/sched/stat.h>

#define PROC_NAME "sysmon"

MODULE_LICENSE("GPL");
MODULE_AUTHOR("Telemetry Group");
MODULE_DESCRIPTION("Expose internal kernel stats via /proc/sysmon");

static int sysmon_show(struct seq_file *m, void *v)
{
    unsigned long uptime_secs = jiffies_to_msecs(get_jiffies_64()) / 1000;
    seq_printf(m, "=== Kernel System Monitor (/proc/%s) ===\\n", PROC_NAME);
    seq_printf(m, "Kernel Version : %s\\n", UTS_RELEASE);
    seq_printf(m, "Current Jiffies: %lu (HZ=%d)\\n", jiffies, HZ);
    seq_printf(m, "System Uptime  : %lu seconds\\n", uptime_secs);
    seq_printf(m, "Memory State   : LowMem OK, HighMem Normal\\n");
    seq_printf(m, "Security Level : Ring 0 Monitored\\n");
    return 0;
}

static int sysmon_open(struct inode *inode, struct file *file)
{
    return single_open(file, sysmon_show, NULL);
}

static const struct proc_ops sysmon_proc_ops = {
    .proc_open    = sysmon_open,
    .proc_read    = seq_read,
    .proc_lseek   = seq_lseek,
    .proc_release = single_release,
};

static int __init sysmon_init(void)
{
    struct proc_dir_entry *entry;
    entry = proc_create(PROC_NAME, 0444, NULL, &sysmon_proc_ops);
    if (!entry) {
        pr_err("proc_sysmon: Failed to create /proc/%s\\n", PROC_NAME);
        return -ENOMEM;
    }
    pr_info("proc_sysmon: Mounted /proc/%s successfully\\n", PROC_NAME);
    return 0;
}

static void __exit sysmon_exit(void)
{
    remove_proc_entry(PROC_NAME, NULL);
    pr_info("proc_sysmon: Removed /proc/%s\\n", PROC_NAME);
}

module_init(sysmon_init);
module_exit(sysmon_exit);
`,
    makeFileCode: `obj-m += proc_sysmon.o
KDIR ?= /lib/modules/$(shell uname -r)/build
all:
\t$(MAKE) -C $(KDIR) M=$(PWD) modules
clean:
\t$(MAKE) -C $(KDIR) M=$(PWD) clean
`,
    userTestCode: `// Run in terminal:
// cat /proc/sysmon
`,
  },
  {
    id: 'netfilter_guard',
    name: 'netfilter_guard',
    version: '3.0.1',
    author: 'Net Security WG <netfilter@kernel.org>',
    description: 'Netfilter IP Packet Hook module (NF_INET_PRE_ROUTING) filtering malicious TCP/UDP ports',
    license: 'GPL',
    sizeBytes: 32768,
    memoryAddress: '0xffffffffc0420000',
    refCount: 0,
    dependencies: [],
    status: 'unloaded',
    category: 'Networking',
    params: [
      {
        name: 'block_port',
        type: 'int',
        value: 4444,
        defaultValue: 4444,
        perm: '0644',
        description: 'Banned destination port to DROP (e.g., 4444 Metasploit, 23 Telnet)',
      },
      {
        name: 'log_dropped',
        type: 'bool',
        value: true,
        defaultValue: true,
        perm: '0644',
        description: 'Log dropped packets to kernel dmesg ring buffer',
      },
    ],
    devices: [],
    procEntries: [],
    cSourceCode: `// SPDX-License-Identifier: GPL-2.0
/**
 * netfilter_guard.c - Linux Kernel Netfilter Packet Inspection Hook
 * Intercepts sk_buff packets at NF_INET_PRE_ROUTING hook point.
 */
#include <linux/init.h>
#include <linux/module.h>
#include <linux/netfilter.h>
#include <linux/netfilter_ipv4.h>
#include <linux/ip.h>
#include <linux/tcp.h>

MODULE_LICENSE("GPL");
MODULE_AUTHOR("Net Security WG");
MODULE_DESCRIPTION("Netfilter Hook for Pre-Routing Packet Inspection");

static int block_port = 4444;
module_param(block_port, int, 0644);

static struct nf_hook_ops nf_ops;

static unsigned int hook_func(void *priv, struct sk_buff *skb,
                              const struct nf_hook_state *state)
{
    struct iphdr *iph;
    struct tcphdr *tcph;

    if (!skb) return NF_ACCEPT;
    iph = ip_hdr(skb);
    if (!iph) return NF_ACCEPT;

    if (iph->protocol == IPPROTO_TCP) {
        tcph = tcp_hdr(skb);
        if (tcph && ntohs(tcph->dest) == block_port) {
            pr_warn("netfilter_guard: [DROP] Blocked packet destined for port %d\\n", block_port);
            return NF_DROP; // Drop packet right at kernel entrance
        }
    }

    return NF_ACCEPT;
}

static int __init netfilter_guard_init(void)
{
    nf_ops.hook     = hook_func;
    nf_ops.pf       = NFPROTO_IPV4;
    nf_ops.hooknum  = NF_INET_PRE_ROUTING;
    nf_ops.priority = NF_IP_PRI_FIRST;

    nf_register_net_hook(&init_net, &nf_ops);
    pr_info("netfilter_guard: Hook registered at NF_INET_PRE_ROUTING (blocking port %d)\\n", block_port);
    return 0;
}

static void __exit netfilter_guard_exit(void)
{
    nf_unregister_net_hook(&init_net, &nf_ops);
    pr_info("netfilter_guard: Hook removed from netfilter subsystem\\n");
}

module_init(netfilter_guard_init);
module_exit(netfilter_guard_exit);
`,
    makeFileCode: `obj-m += netfilter_guard.o
KDIR ?= /lib/modules/$(shell uname -r)/build
all:
\t$(MAKE) -C $(KDIR) M=$(PWD) modules
clean:
\t$(MAKE) -C $(KDIR) M=$(PWD) clean
`,
    userTestCode: `// Send test packets:
// curl http://localhost:4444  -> DROPPED by Kernel!
// dmesg | grep netfilter_guard
`,
  },
  {
    id: 'sys_hook_audit',
    name: 'sys_hook_audit',
    version: '1.4.0',
    author: 'Kernel Audit Framework <audit@kernel.org>',
    description: 'System Call Monitor / Hook auditing sys_openat & sys_kill with tamper alerts',
    license: 'GPL',
    sizeBytes: 24576,
    memoryAddress: '0xffffffffc0488000',
    refCount: 0,
    dependencies: [],
    status: 'unloaded',
    category: 'Security',
    params: [
      {
        name: 'monitor_shadow',
        type: 'bool',
        value: true,
        defaultValue: true,
        perm: '0644',
        description: 'Alert when any process attempts to open /etc/shadow or /etc/passwd',
      },
    ],
    devices: [],
    procEntries: [],
    cSourceCode: `// SPDX-License-Identifier: GPL-2.0
/**
 * sys_hook_audit.c - Kernel System Call Auditing via Kprobes
 * Intercepts critical syscalls (sys_openat, sys_kill) in Ring 0
 */
#include <linux/init.h>
#include <linux/module.h>
#include <linux/kprobes.h>

MODULE_LICENSE("GPL");
MODULE_AUTHOR("Kernel Audit Framework");
MODULE_DESCRIPTION("Kprobe-based syscall security auditor");

static struct kprobe kp_openat;

static int handler_pre(struct kprobe *p, struct pt_regs *regs)
{
    pr_info("sys_hook_audit: [AUDIT] sys_openat invoked by PID %d (%s)\\n",
            current->pid, current->comm);
    return 0;
}

static int __init audit_init(void)
{
    kp_openat.symbol_name = "do_sys_openat2";
    kp_openat.pre_handler = handler_pre;

    if (register_kprobe(&kp_openat) < 0) {
        pr_err("sys_hook_audit: register_kprobe failed\\n");
        return -1;
    }

    pr_info("sys_hook_audit: Kprobe attached to do_sys_openat2\\n");
    return 0;
}

static void __exit audit_exit(void)
{
    unregister_kprobe(&kp_openat);
    pr_info("sys_hook_audit: Detached kprobe auditor\\n");
}

module_init(audit_init);
module_exit(audit_exit);
`,
    makeFileCode: `obj-m += sys_hook_audit.o
KDIR ?= /lib/modules/$(shell uname -r)/build
all:
\t$(MAKE) -C $(KDIR) M=$(PWD) modules
clean:
\t$(MAKE) -C $(KDIR) M=$(PWD) clean
`,
    userTestCode: `// Run sensitive actions in userspace:
// cat /etc/shadow
// dmesg | tail -n 5
`,
  },
  {
    id: 'watchdog_timer',
    name: 'watchdog_timer',
    version: '1.1.2',
    author: 'Reliability Team <ha@kernel.org>',
    description: 'High-resolution kernel timer and bottom-half workqueue logging system heartbeats',
    license: 'GPL',
    sizeBytes: 16384,
    memoryAddress: '0xffffffffc0512000',
    refCount: 0,
    dependencies: [],
    status: 'unloaded',
    category: 'Core',
    params: [
      {
        name: 'heartbeat_sec',
        type: 'int',
        value: 5,
        defaultValue: 5,
        perm: '0644',
        description: 'Seconds between watchdog timer firings',
      },
    ],
    devices: [],
    procEntries: [],
    cSourceCode: `// SPDX-License-Identifier: GPL-2.0
/**
 * watchdog_timer.c - Kernel Timer and Deferred Work (Workqueue)
 * Demonstrates: timer_setup(), mod_timer(), and bottom-half execution.
 */
#include <linux/init.h>
#include <linux/module.h>
#include <linux/timer.h>
#include <linux/workqueue.h>

MODULE_LICENSE("GPL");
MODULE_AUTHOR("Reliability Team");
MODULE_DESCRIPTION("Kernel Timer & Bottom Half Workqueue Watchdog");

static int heartbeat_sec = 5;
module_param(heartbeat_sec, int, 0644);

static struct timer_list watchdog_timer;
static struct workqueue_struct *watchdog_wq;
static struct work_struct watchdog_work;

static void watchdog_work_handler(struct work_struct *work)
{
    pr_info("watchdog_timer: [BOTTOM-HALF] Workqueue thread processed system health check\\n");
}

static void timer_callback(struct timer_list *t)
{
    pr_info("watchdog_timer: [TICK] Heartbeat timer expired, scheduling workqueue...\\n");
    queue_work(watchdog_wq, &watchdog_work);
    mod_timer(&watchdog_timer, jiffies + msecs_to_jiffies(heartbeat_sec * 1000));
}

static int __init watchdog_init(void)
{
    watchdog_wq = create_singlethread_workqueue("kwatchdog_wq");
    INIT_WORK(&watchdog_work, watchdog_work_handler);

    timer_setup(&watchdog_timer, timer_callback, 0);
    mod_timer(&watchdog_timer, jiffies + msecs_to_jiffies(heartbeat_sec * 1000));

    pr_info("watchdog_timer: Started periodic timer (interval=%d sec)\\n", heartbeat_sec);
    return 0;
}

static void __exit watchdog_exit(void)
{
    del_timer_sync(&watchdog_timer);
    flush_workqueue(watchdog_wq);
    destroy_workqueue(watchdog_wq);
    pr_info("watchdog_timer: Timer cancelled and workqueue flushed\\n");
}

module_init(watchdog_init);
module_exit(watchdog_exit);
`,
    makeFileCode: `obj-m += watchdog_timer.o
KDIR ?= /lib/modules/$(shell uname -r)/build
all:
\t$(MAKE) -C $(KDIR) M=$(PWD) modules
clean:
\t$(MAKE) -C $(KDIR) M=$(PWD) clean
`,
    userTestCode: `// Watch live kernel logs:
// dmesg -wH | grep watchdog_timer
`,
  },
];

export function createInitialKernelState(): KernelState {
  const initTimestamp = 1.042891;
  const initialDmesg: DmesgEntry[] = [
    {
      id: 'd1',
      timestamp: 0.000000,
      level: 'KERN_INFO',
      facility: 'kernel',
      message: 'Linux version 6.11.0-generic (buildd@lkm-host) (gcc version 14.2.0, GNU ld 2.43.1) #28-Ubuntu SMP PREEMPT_DYNAMIC',
    },
    {
      id: 'd2',
      timestamp: 0.012480,
      level: 'KERN_INFO',
      facility: 'kernel',
      message: 'Command line: BOOT_IMAGE=/vmlinuz-6.11.0-generic root=/dev/nvme0n1p2 ro quiet splash vt.handoff=7',
    },
    {
      id: 'd3',
      timestamp: 0.048912,
      level: 'KERN_INFO',
      facility: 'x86/cpu',
      message: 'x86: Booting SMP configuration: CPU 0 (Core 0), CPU 1 (Core 1), CPU 2 (Core 2), CPU 3 (Core 3)',
    },
    {
      id: 'd4',
      timestamp: 0.128401,
      level: 'KERN_INFO',
      facility: 'memory',
      message: 'Memory: 16298516K/16694784K available (16384K kernel code, 3240K rwdata, 4516K rodata, 2048K init, 3456K bss)',
    },
    {
      id: 'd5',
      timestamp: 0.389210,
      level: 'KERN_INFO',
      facility: 'kmod',
      message: 'kmod: module loader initialized, ready to insert dynamic Ring 0 code objects (.ko)',
    },
    {
      id: 'd6',
      timestamp: initTimestamp,
      level: 'KERN_NOTICE',
      facility: 'systemd[1]',
      message: 'Reached target Multi-User System. User space init completed.',
    },
  ];

  return {
    kernelVersion: '6.11.0-generic',
    arch: 'x86_64 (SMP 4 cores)',
    uptimeSeconds: 142.6,
    modules: JSON.parse(JSON.stringify(DEFAULT_MODULES)),
    dmesg: initialDmesg,
    syscallHistory: [
      {
        id: 's1',
        timestamp: '17:16:01.210',
        pid: 1042,
        comm: 'systemd',
        syscall: 'epoll_wait',
        args: ['3', '0x7ffcf8190000', '64', '-1'],
        retval: '1',
        durationUs: 14,
        ringFlow: 'Ring 3 -> INT 0x80/SYSCALL -> Ring 0 -> epoll_wait -> Ring 3',
      },
    ],
    panicState: {
      isPanicked: false,
      tainted: 'P - Proprietary module loaded: None',
    },
    charBuffer: {
      content: 'Kernel Ring 0 Protected Buffer Ready',
      cipherMode: 'rot13',
      cipherKey: 13,
      totalReads: 0,
      totalWrites: 0,
      bytesProcessed: 0,
    },
    packetHistory: [
      {
        id: 'p1',
        timestamp: '17:16:02.100',
        protocol: 'TCP',
        srcIp: '192.168.1.105',
        dstIp: '10.0.0.1',
        srcPort: 52410,
        dstPort: 443,
        payload: 'TLS ClientHello',
        verdict: 'NF_ACCEPT',
      },
    ],
    terminalHistory: [],
    commandOutputHistory: [],
  };
}

export function addDmesg(
  state: KernelState,
  level: KernelLogLevel,
  facility: string,
  message: string
): KernelState {
  const newUptime = state.uptimeSeconds + +(Math.random() * 0.4 + 0.05).toFixed(4);
  const newEntry: DmesgEntry = {
    id: `d_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    timestamp: +newUptime.toFixed(6),
    level,
    facility,
    message,
  };

  // Ring buffer maximum 200 items
  const updatedDmesg = [...state.dmesg, newEntry].slice(-200);
  return {
    ...state,
    uptimeSeconds: newUptime,
    dmesg: updatedDmesg,
  };
}

export function loadModule(
  state: KernelState,
  moduleId: string,
  customParams?: Record<string, string | number | boolean>
): KernelState {
  if (state.panicState.isPanicked) {
    return addDmesg(
      state,
      'KERN_EMERG',
      'kmod',
      `Cannot insert module '${moduleId}': Kernel in PANIC state. Reboot required.`
    );
  }

  const modIndex = state.modules.findIndex((m) => m.id === moduleId);
  if (modIndex === -1) {
    return addDmesg(
      state,
      'KERN_ERR',
      'kmod',
      `insmod: ERROR: could not load module ${moduleId}.ko: No such file or directory`
    );
  }

  const mod = state.modules[modIndex];
  if (mod.status === 'loaded') {
    return addDmesg(
      state,
      'KERN_WARNING',
      'kmod',
      `insmod: ERROR: could not insert module ${mod.name}: Module already loaded in Ring 0`
    );
  }

  // Update params if provided
  const updatedParams = mod.params.map((p) => {
    if (customParams && customParams[p.name] !== undefined) {
      return { ...p, value: customParams[p.name] };
    }
    return p;
  });

  const updatedModule: KernelModule = {
    ...mod,
    status: 'loaded',
    refCount: 0,
    params: updatedParams,
  };

  const newModules = [...state.modules];
  newModules[modIndex] = updatedModule;

  let nextState: KernelState = {
    ...state,
    modules: newModules,
  };

  // Log module_init entry
  nextState = addDmesg(
    nextState,
    'KERN_INFO',
    'kmod',
    `Loading kernel module '${mod.name}' (${mod.version}) into Ring 0 @ ${mod.memoryAddress}`
  );

  // Specific module init logs
  if (mod.id === 'hello_lkm') {
    const greetCount = Number(updatedParams.find((p) => p.name === 'greet_count')?.value ?? 3);
    const banner = String(updatedParams.find((p) => p.name === 'custom_banner')?.value ?? 'Hello');
    for (let i = 0; i < Math.min(greetCount, 5); i++) {
      nextState = addDmesg(
        nextState,
        'KERN_INFO',
        'hello_lkm',
        `[${i + 1}/${greetCount}] ${banner}`
      );
    }
    nextState = addDmesg(
      nextState,
      'KERN_INFO',
      'hello_lkm',
      `Allocated sysfs parameters at /sys/module/hello_lkm/parameters/`
    );
  } else if (mod.id === 'kcrypto') {
    nextState = addDmesg(
      nextState,
      'KERN_INFO',
      'kcrypto',
      `alloc_chrdev_region major=240 minor=0 allocated`
    );
    nextState = addDmesg(
      nextState,
      'KERN_INFO',
      'kcrypto',
      `cdev_add success. Created /dev/kcrypto with copy_from_user safe barrier`
    );
  } else if (mod.id === 'proc_sysmon') {
    nextState = addDmesg(
      nextState,
      'KERN_INFO',
      'proc_sysmon',
      `proc_create() created dynamic entry /proc/sysmon (mode=0444)`
    );
  } else if (mod.id === 'netfilter_guard') {
    const bannedPort = updatedParams.find((p) => p.name === 'block_port')?.value ?? 4444;
    nextState = addDmesg(
      nextState,
      'KERN_INFO',
      'netfilter_guard',
      `nf_register_net_hook at NF_INET_PRE_ROUTING (blocking destination TCP port ${bannedPort})`
    );
  } else if (mod.id === 'sys_hook_audit') {
    nextState = addDmesg(
      nextState,
      'KERN_INFO',
      'sys_hook_audit',
      `kprobe registered at do_sys_openat2 (Ring 0 syscall interception active)`
    );
  } else if (mod.id === 'watchdog_timer') {
    nextState = addDmesg(
      nextState,
      'KERN_INFO',
      'watchdog_timer',
      `timer_setup() initialized. Bottom-half workqueue worker started`
    );
  }

  return nextState;
}

export function unloadModule(state: KernelState, moduleId: string, force = false): KernelState {
  if (state.panicState.isPanicked) {
    return addDmesg(
      state,
      'KERN_EMERG',
      'kmod',
      `rmmod: Kernel panicked. Cannot safely unload module.`
    );
  }

  const modIndex = state.modules.findIndex((m) => m.id === moduleId);
  if (modIndex === -1) {
    return addDmesg(
      state,
      'KERN_ERR',
      'kmod',
      `rmmod: ERROR: Module ${moduleId} does not exist in kernel`
    );
  }

  const mod = state.modules[modIndex];
  if (mod.status !== 'loaded') {
    return addDmesg(
      state,
      'KERN_ERR',
      'kmod',
      `rmmod: ERROR: Module ${mod.name} is not currently loaded in kernel`
    );
  }

  if (mod.refCount > 0 && !force) {
    return addDmesg(
      state,
      'KERN_ERR',
      'kmod',
      `rmmod: ERROR: Module ${mod.name} is in use by ${mod.refCount} open file descriptor(s)`
    );
  }

  const updatedModule: KernelModule = {
    ...mod,
    status: 'unloaded',
    refCount: 0,
  };

  const newModules = [...state.modules];
  newModules[modIndex] = updatedModule;

  let nextState: KernelState = {
    ...state,
    modules: newModules,
  };

  nextState = addDmesg(
    nextState,
    'KERN_INFO',
    mod.name,
    `module_exit() called: unregistering symbols and freeing kmalloc memory...`
  );

  if (mod.id === 'kcrypto') {
    nextState = addDmesg(
      nextState,
      'KERN_INFO',
      'kcrypto',
      `cdev_del() and unregister_chrdev_region() cleared device node /dev/kcrypto`
    );
  } else if (mod.id === 'proc_sysmon') {
    nextState = addDmesg(
      nextState,
      'KERN_INFO',
      'proc_sysmon',
      `remove_proc_entry() removed /proc/sysmon`
    );
  } else if (mod.id === 'netfilter_guard') {
    nextState = addDmesg(
      nextState,
      'KERN_INFO',
      'netfilter_guard',
      `nf_unregister_net_hook: Packet inspection hook detached`
    );
  }

  nextState = addDmesg(
    nextState,
    'KERN_INFO',
    'kmod',
    `Module '${mod.name}' successfully removed from Ring 0 memory`
  );

  return nextState;
}

export function updateModuleParam(
  state: KernelState,
  moduleId: string,
  paramName: string,
  newValue: string | number | boolean
): KernelState {
  const modIndex = state.modules.findIndex((m) => m.id === moduleId);
  if (modIndex === -1) return state;

  const mod = state.modules[modIndex];
  const newParams = mod.params.map((p) => {
    if (p.name === paramName) {
      return { ...p, value: newValue };
    }
    return p;
  });

  const newModules = [...state.modules];
  newModules[modIndex] = { ...mod, params: newParams };

  let nextState: KernelState = {
    ...state,
    modules: newModules,
  };

  if (mod.status === 'loaded') {
    nextState = addDmesg(
      nextState,
      'KERN_INFO',
      mod.name,
      `sysfs write to /sys/module/${mod.name}/parameters/${paramName} -> new value: ${newValue}`
    );
  }

  return nextState;
}

export function writeToCharDevice(
  state: KernelState,
  text: string,
  cipherAlgoOverride?: 'plain' | 'xor' | 'caesar' | 'rot13',
  cipherKeyOverride?: number
): KernelState {
  const kcryptoMod = state.modules.find((m) => m.id === 'kcrypto');
  if (!kcryptoMod || kcryptoMod.status !== 'loaded') {
    return addDmesg(
      state,
      'KERN_ERR',
      'vfs',
      `write: /dev/kcrypto: No such device or address. Load kcrypto.ko first.`
    );
  }

  const algo = cipherAlgoOverride || state.charBuffer.cipherMode;
  const key = cipherKeyOverride !== undefined ? cipherKeyOverride : state.charBuffer.cipherKey;

  // Transform text in simulated Ring 0
  let processed = '';
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (algo === 'rot13') {
      if (char >= 'a' && char <= 'z') {
        processed += String.fromCharCode('a'.charCodeAt(0) + ((char.charCodeAt(0) - 97 + 13) % 26));
      } else if (char >= 'A' && char <= 'Z') {
        processed += String.fromCharCode('A'.charCodeAt(0) + ((char.charCodeAt(0) - 65 + 13) % 26));
      } else {
        processed += char;
      }
    } else if (algo === 'xor') {
      const charCode = char.charCodeAt(0) ^ (key & 0xff);
      // Printable fallback
      processed += String.fromCharCode(charCode < 32 || charCode > 126 ? (charCode % 94) + 33 : charCode);
    } else if (algo === 'caesar') {
      if (char >= 'a' && char <= 'z') {
        processed += String.fromCharCode('a'.charCodeAt(0) + ((char.charCodeAt(0) - 97 + key) % 26));
      } else if (char >= 'A' && char <= 'Z') {
        processed += String.fromCharCode('A'.charCodeAt(0) + ((char.charCodeAt(0) - 65 + key) % 26));
      } else {
        processed += char;
      }
    } else {
      processed += char;
    }
  }

  const newBuffer: CharDeviceBuffer = {
    ...state.charBuffer,
    content: processed,
    cipherMode: algo,
    cipherKey: key,
    totalWrites: state.charBuffer.totalWrites + 1,
    bytesProcessed: state.charBuffer.bytesProcessed + text.length,
  };

  const trace: SyscallTrace = {
    id: `sys_${Date.now()}`,
    timestamp: new Date().toTimeString().split(' ')[0] + '.' + Math.floor(Math.random() * 900 + 100),
    pid: Math.floor(Math.random() * 3000 + 1200),
    comm: 'user_test',
    syscall: 'sys_write',
    args: ['3 (/dev/kcrypto)', `"${text.slice(0, 18)}..."`, `${text.length}`],
    retval: `${text.length}`,
    durationUs: 38,
    ringFlow: 'Ring 3 user buffer -> copy_from_user() -> Ring 0 kmalloc buffer -> cipher transform',
  };

  let nextState: KernelState = {
    ...state,
    charBuffer: newBuffer,
    syscallHistory: [trace, ...state.syscallHistory].slice(0, 50),
  };

  nextState = addDmesg(
    nextState,
    'KERN_INFO',
    'kcrypto',
    `copy_from_user() safely copied ${text.length} bytes from user space; applied '${algo}' cipher`
  );

  return nextState;
}

export function readFromCharDevice(state: KernelState): { state: KernelState; result: string } {
  const kcryptoMod = state.modules.find((m) => m.id === 'kcrypto');
  if (!kcryptoMod || kcryptoMod.status !== 'loaded') {
    const errorState = addDmesg(
      state,
      'KERN_ERR',
      'vfs',
      `read: /dev/kcrypto: No such device or address`
    );
    return { state: errorState, result: '' };
  }

  const result = state.charBuffer.content;
  const newBuffer: CharDeviceBuffer = {
    ...state.charBuffer,
    totalReads: state.charBuffer.totalReads + 1,
  };

  const trace: SyscallTrace = {
    id: `sys_${Date.now()}`,
    timestamp: new Date().toTimeString().split(' ')[0] + '.' + Math.floor(Math.random() * 900 + 100),
    pid: Math.floor(Math.random() * 3000 + 1200),
    comm: 'cat',
    syscall: 'sys_read',
    args: ['3 (/dev/kcrypto)', '0x7ffcf8190000', '1024'],
    retval: `${result.length}`,
    durationUs: 29,
    ringFlow: 'Ring 0 kernel buffer -> copy_to_user() -> Ring 3 user buffer',
  };

  let nextState: KernelState = {
    ...state,
    charBuffer: newBuffer,
    syscallHistory: [trace, ...state.syscallHistory].slice(0, 50),
  };

  nextState = addDmesg(
    nextState,
    'KERN_INFO',
    'kcrypto',
    `copy_to_user() transferred ${result.length} bytes from kernel space to user process`
  );

  return { state: nextState, result };
}

export function ioctlCharDevice(
  state: KernelState,
  cmd: 'RESET_BUF' | 'SET_KEY' | 'SET_ALGO',
  paramValue?: number | string
): KernelState {
  const kcryptoMod = state.modules.find((m) => m.id === 'kcrypto');
  if (!kcryptoMod || kcryptoMod.status !== 'loaded') {
    return addDmesg(state, 'KERN_ERR', 'vfs', `ioctl: /dev/kcrypto: device not loaded`);
  }

  let updatedBuffer = { ...state.charBuffer };
  let msg = '';

  if (cmd === 'RESET_BUF') {
    updatedBuffer.content = '';
    msg = 'kcrypto: IOCTL KCRYPTO_IOCTL_RESET_BUF executed. Buffer cleared.';
  } else if (cmd === 'SET_KEY' && typeof paramValue === 'number') {
    updatedBuffer.cipherKey = paramValue;
    msg = `kcrypto: IOCTL KCRYPTO_IOCTL_SET_KEY updated key to ${paramValue}`;
  } else if (cmd === 'SET_ALGO' && typeof paramValue === 'string') {
    if (['plain', 'xor', 'caesar', 'rot13'].includes(paramValue)) {
      updatedBuffer.cipherMode = paramValue as any;
      msg = `kcrypto: IOCTL KCRYPTO_IOCTL_SET_ALGO changed mode to ${paramValue}`;
    }
  }

  const trace: SyscallTrace = {
    id: `sys_${Date.now()}`,
    timestamp: new Date().toTimeString().split(' ')[0] + '.' + Math.floor(Math.random() * 900 + 100),
    pid: Math.floor(Math.random() * 3000 + 1200),
    comm: 'user_test',
    syscall: 'sys_ioctl',
    args: ['3 (/dev/kcrypto)', `KCRYPTO_IOCTL_${cmd}`, `${paramValue ?? 0}`],
    retval: '0',
    durationUs: 19,
    ringFlow: 'Ring 3 ioctl() -> unlocked_ioctl -> Ring 0 dispatch',
  };

  let nextState: KernelState = {
    ...state,
    charBuffer: updatedBuffer,
    syscallHistory: [trace, ...state.syscallHistory].slice(0, 50),
  };

  return addDmesg(nextState, 'KERN_INFO', 'kcrypto', msg);
}

export function processNetfilterPacket(
  state: KernelState,
  packet: Omit<NetfilterPacket, 'id' | 'timestamp' | 'verdict' | 'matchedRule'>
): { state: KernelState; packet: NetfilterPacket } {
  const nfMod = state.modules.find((m) => m.id === 'netfilter_guard');
  const isLoaded = nfMod && nfMod.status === 'loaded';

  const bannedPort = isLoaded
    ? Number(nfMod.params.find((p) => p.name === 'block_port')?.value ?? 4444)
    : -1;

  let verdict: 'NF_ACCEPT' | 'NF_DROP' = 'NF_ACCEPT';
  let matchedRule: string | undefined = undefined;

  if (isLoaded && (packet.dstPort === bannedPort || packet.srcPort === bannedPort)) {
    verdict = 'NF_DROP';
    matchedRule = `Port ${bannedPort} blocked by netfilter_guard.ko`;
  }

  const evaluatedPacket: NetfilterPacket = {
    ...packet,
    id: `pkt_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    timestamp: new Date().toTimeString().split(' ')[0],
    verdict,
    matchedRule,
  };

  let nextState: KernelState = {
    ...state,
    packetHistory: [evaluatedPacket, ...state.packetHistory].slice(0, 40),
  };

  if (verdict === 'NF_DROP') {
    nextState = addDmesg(
      nextState,
      'KERN_WARNING',
      'netfilter_guard',
      `[NF_DROP] Dropped ${packet.protocol} packet from ${packet.srcIp}:${packet.srcPort} to ${packet.dstIp}:${packet.dstPort} (Banned port ${bannedPort})`
    );
  } else {
    nextState = addDmesg(
      nextState,
      'KERN_INFO',
      'netfilter',
      `[NF_ACCEPT] Passed ${packet.protocol} packet from ${packet.srcIp}:${packet.srcPort} to ${packet.dstIp}:${packet.dstPort}`
    );
  }

  return { state: nextState, packet: evaluatedPacket };
}

export function triggerKernelFault(
  state: KernelState,
  faultType: 'NULL_DEREF' | 'BAD_USER_COPY' | 'MEM_LEAK' | 'SPINLOCK_DEADLOCK'
): KernelState {
  if (faultType === 'NULL_DEREF') {
    const panicState: KernelPanicState = {
      isPanicked: true,
      reason: 'Kernel NULL pointer dereference at virtual address 0000000000000000',
      faultType: 'NULL_DEREF',
      rip: '0xffffffffc03411a8 (bad_lkm_write+0x28/0x70 [kcrypto])',
      rsp: '0xffffc9000020fd48',
      cr2: '0x0000000000000000',
      callTrace: [
        'bad_lkm_write+0x28/0x70 [kcrypto]',
        'vfs_write+0x102/0x450',
        'ksys_write+0x65/0xe0',
        'do_syscall_64+0x7b/0x160',
        'entry_SYSCALL_64_after_hwframe+0x76/0x7e',
      ],
      tainted: 'P           O      6.11.0-generic #28',
      timestamp: state.uptimeSeconds + 0.1,
    };

    let nextState = { ...state, panicState };
    nextState = addDmesg(nextState, 'KERN_EMERG', 'kernel', 'BUG: kernel NULL pointer dereference, address: 0000000000000000');
    nextState = addDmesg(nextState, 'KERN_EMERG', 'kernel', '#PF: supervisor write-access in kernel mode (Ring 0)');
    nextState = addDmesg(nextState, 'KERN_EMERG', 'kernel', '#PF: error_code(0x0002) - not-present page');
    nextState = addDmesg(nextState, 'KERN_ALERT', 'kernel', 'RIP: 0010:bad_lkm_write+0x28/0x70 [kcrypto]');
    nextState = addDmesg(nextState, 'KERN_EMERG', 'kernel', 'Kernel panic - not syncing: Fatal exception in interrupt/driver');
    return nextState;
  }

  if (faultType === 'BAD_USER_COPY') {
    const panicState: KernelPanicState = {
      isPanicked: true,
      reason: 'Kernel attempted direct user-space pointer dereference without copy_from_user()',
      faultType: 'BAD_USER_COPY',
      rip: '0xffffffffc0341200 (insecure_read+0x1b/0x50 [kcrypto])',
      rsp: '0xffffc9000020fd10',
      cr2: '0x00007ffcf8190040',
      callTrace: [
        'insecure_read+0x1b/0x50 [kcrypto]',
        'vfs_read+0x9e/0x390',
        'ksys_read+0x65/0xe0',
        'do_syscall_64+0x7b/0x160',
      ],
      tainted: 'P           O      6.11.0-generic #28',
      timestamp: state.uptimeSeconds + 0.1,
    };

    let nextState = { ...state, panicState };
    nextState = addDmesg(nextState, 'KERN_EMERG', 'kernel', 'BUG: unable to handle page fault for address 0x00007ffcf8190040');
    nextState = addDmesg(nextState, 'KERN_EMERG', 'kernel', '#PF: supervisor read-access to user address in Ring 0 violation (SMAP triggered)');
    nextState = addDmesg(nextState, 'KERN_EMERG', 'kernel', 'Kernel panic - not syncing: SMAP violation: direct user-space pointer dereference forbidden');
    return nextState;
  }

  if (faultType === 'MEM_LEAK') {
    let nextState = addDmesg(state, 'KERN_WARNING', 'kmemleak', 'kmemleak: 64 unreferenced object(s) found (total 262144 bytes)');
    nextState = addDmesg(nextState, 'KERN_WARNING', 'kmemleak', 'backtrace: [0xffffffffc03410a0] kmalloc+0x55/0x90 [kcrypto]');
    nextState = addDmesg(nextState, 'KERN_WARNING', 'kmemleak', 'Module unloaded without calling kfree() on allocated memory slabs!');
    return nextState;
  }

  // SPINLOCK_DEADLOCK
  let nextState = addDmesg(state, 'KERN_ERR', 'kernel', 'watchdog: BUG: soft lockup - CPU#2 stuck for 22s! [kcrypto:1482]');
  nextState = addDmesg(nextState, 'KERN_ERR', 'kernel', 'Modules linked in: kcrypto(O) netfilter_guard(O)');
  nextState = addDmesg(nextState, 'KERN_ERR', 'kernel', 'Call Trace: spin_lock(&dev_lock) called while already holding dev_lock without release!');
  return nextState;
}

export function recoverKernel(state: KernelState): KernelState {
  const fresh = createInitialKernelState();
  const resetDmesg: DmesgEntry = {
    id: `d_rec_${Date.now()}`,
    timestamp: 0.000000,
    level: 'KERN_INFO',
    facility: 'kernel',
    message: 'System warm-reboot initiated. Kernel registers restored. Ring 0 memory cleared.',
  };
  return {
    ...fresh,
    dmesg: [resetDmesg, ...fresh.dmesg],
  };
}

export function executeShellCommand(
  state: KernelState,
  cmdLine: string
): { state: KernelState; output: string } {
  const trimmed = cmdLine.trim();
  if (!trimmed) return { state, output: '' };

  const parts = trimmed.split(/\s+/);
  const cmd = parts[0];
  const args = parts.slice(1);

  let output = '';
  let updatedState = { ...state };

  switch (cmd) {
    case 'uname':
      if (args.includes('-r')) {
        output = state.kernelVersion;
      } else if (args.includes('-a')) {
        output = `Linux lkm-host ${state.kernelVersion} #28-Ubuntu SMP PREEMPT_DYNAMIC ${state.arch} GNU/Linux`;
      } else {
        output = 'Linux';
      }
      break;

    case 'lsmod': {
      const loaded = state.modules.filter((m) => m.status === 'loaded');
      const header = 'Module                  Size  Used by';
      if (loaded.length === 0) {
        output = header;
      } else {
        const rows = loaded.map((m) => {
          const nameCol = m.name.padEnd(20, ' ');
          const sizeCol = String(m.sizeBytes).padStart(6, ' ');
          const usedCol = String(m.refCount);
          return `${nameCol} ${sizeCol}  ${usedCol}`;
        });
        output = [header, ...rows].join('\n');
      }
      break;
    }

    case 'insmod': {
      if (args.length === 0) {
        output = 'insmod: ERROR: missing module file path operand\nUsage: insmod <module_name.ko> [param=value ...]';
      } else {
        const modTarget = args[0].replace(/\.ko$/, '');
        const customParams: Record<string, string | number | boolean> = {};
        for (const arg of args.slice(1)) {
          const [k, v] = arg.split('=');
          if (k && v !== undefined) {
            if (v === 'true') customParams[k] = true;
            else if (v === 'false') customParams[k] = false;
            else if (!isNaN(Number(v))) customParams[k] = Number(v);
            else customParams[k] = v;
          }
        }
        updatedState = loadModule(updatedState, modTarget, customParams);
        output = ''; // Kernel messages go to dmesg, standard insmod is silent on success
      }
      break;
    }

    case 'rmmod': {
      if (args.length === 0) {
        output = 'rmmod: ERROR: missing module name operand\nUsage: rmmod <module_name>';
      } else {
        const modTarget = args[0].replace(/\.ko$/, '');
        updatedState = unloadModule(updatedState, modTarget);
        output = '';
      }
      break;
    }

    case 'modinfo': {
      if (args.length === 0) {
        output = 'modinfo: ERROR: missing module name';
      } else {
        const modTarget = args[0].replace(/\.ko$/, '');
        const mod = state.modules.find((m) => m.id === modTarget || m.name === modTarget);
        if (!mod) {
          output = `modinfo: ERROR: Module ${modTarget} not found.`;
        } else {
          const lines = [
            `filename:       /lib/modules/${state.kernelVersion}/extra/${mod.name}.ko`,
            `version:        ${mod.version}`,
            `license:        ${mod.license}`,
            `description:    ${mod.description}`,
            `author:         ${mod.author}`,
            `srcversion:     ${Math.random().toString(16).slice(2, 10).toUpperCase()}`,
            `depends:        ${mod.dependencies.join(',') || ''}`,
            `retpoline:      Y`,
            `intree:         N`,
            `vermagic:       ${state.kernelVersion} SMP preempt mod_unload `,
          ];
          for (const p of mod.params) {
            lines.push(`parm:           ${p.name}:${p.description} (${p.type})`);
          }
          output = lines.join('\n');
        }
      }
      break;
    }

    case 'dmesg': {
      const entries = state.dmesg;
      output = entries
        .map((e) => `[${e.timestamp.toFixed(6).padStart(12, ' ')}] ${e.message}`)
        .join('\n');
      break;
    }

    case 'cat': {
      if (args.length === 0) {
        output = 'cat: missing file operand';
      } else {
        const filePath = args[0];
        if (filePath === '/dev/kcrypto') {
          const { state: ns, result } = readFromCharDevice(updatedState);
          updatedState = ns;
          output = result;
        } else if (filePath === '/proc/sysmon') {
          const monMod = state.modules.find((m) => m.id === 'proc_sysmon');
          if (monMod && monMod.status === 'loaded') {
            output = `=== Kernel System Monitor (/proc/sysmon) ===\nKernel Version : ${state.kernelVersion}\nCurrent Jiffies: ${Math.floor(state.uptimeSeconds * 250)} (HZ=250)\nSystem Uptime  : ${Math.floor(state.uptimeSeconds)} seconds\nModules Loaded : ${state.modules.filter((m) => m.status === 'loaded').length}\nMemory State   : LowMem OK, Ring 0 Monitored\nBuffer State   : ${state.charBuffer.bytesProcessed} bytes processed`;
          } else {
            output = 'cat: /proc/sysmon: No such file or directory. Load proc_sysmon.ko first.';
          }
        } else if (filePath.startsWith('/sys/module/')) {
          // Inspect module param
          const match = filePath.match(/\/sys\/module\/([^/]+)\/parameters\/([^/]+)/);
          if (match) {
            const [, modName, paramName] = match;
            const mod = state.modules.find((m) => m.name === modName);
            if (mod && mod.status === 'loaded') {
              const p = mod.params.find((param) => param.name === paramName);
              output = p ? String(p.value) : `cat: ${filePath}: No such file or directory`;
            } else {
              output = `cat: ${filePath}: No such file or directory`;
            }
          } else {
            output = `cat: ${filePath}: Is a directory`;
          }
        } else {
          output = `cat: ${filePath}: No such file or directory`;
        }
      }
      break;
    }

    case 'echo': {
      // Parse echo "text" > /dev/kcrypto
      const fullCmd = args.join(' ');
      const redirectMatch = fullCmd.match(/^(?:"([^"]*)"|'([^']*)'|(\S+))\s*>\s*(\S+)$/);
      if (redirectMatch) {
        const text = redirectMatch[1] ?? redirectMatch[2] ?? redirectMatch[3] ?? '';
        const target = redirectMatch[4];
        if (target === '/dev/kcrypto') {
          updatedState = writeToCharDevice(updatedState, text);
          output = '';
        } else if (target.startsWith('/sys/module/')) {
          const match = target.match(/\/sys\/module\/([^/]+)\/parameters\/([^/]+)/);
          if (match) {
            const [, modName, paramName] = match;
            updatedState = updateModuleParam(updatedState, modName, paramName, text);
            output = '';
          } else {
            output = `bash: ${target}: Permission denied or invalid sysfs node`;
          }
        } else {
          output = `bash: ${target}: Permission denied`;
        }
      } else {
        output = args.join(' ').replace(/^["']|["']$/g, '');
      }
      break;
    }

    case 'clear':
      output = '__CLEAR__';
      break;

    case 'help':
      output = `Linux Kernel Module Workbench Shell (Emulated bash / ksh):
  insmod <mod>.ko [k=v]  Load kernel module into Ring 0
  rmmod <mod>            Unload module and free memory
  lsmod                  List currently loaded modules
  modinfo <mod>          Show module author, license, params
  dmesg                  Print kernel ring buffer logs
  cat /dev/kcrypto       Read from character device buffer
  echo "msg" > /dev/kcrypto  Write to character device via copy_from_user
  cat /proc/sysmon       Read dynamic procfs statistics
  cat /sys/module/<m>/parameters/<p>  Inspect sysfs parameter
  uname -a               Print kernel release and architecture
  clear                  Clear terminal screen
  help                   Show this help menu`;
      break;

    default:
      output = `${cmd}: command not found. Type 'help' for available kernel commands.`;
  }

  const newCommandHistory = [
    ...updatedState.commandOutputHistory,
    {
      command: trimmed,
      output,
      time: new Date().toTimeString().split(' ')[0],
      status: output.includes('ERROR') || output.includes('not found') ? 1 : 0,
    },
  ].slice(-30);

  return {
    state: {
      ...updatedState,
      terminalHistory: [...updatedState.terminalHistory, trimmed],
      commandOutputHistory: newCommandHistory,
    },
    output,
  };
}
