# CCNA Notes — Lesson 8: IPv4 Addressing (Part 2) & Configuring IP Addresses on Cisco Devices
*(Based on Jeremy's IT Lab video)*

---

## 1. Clarification on the Class A Range

A small but important correction from the last lesson:

- Class A is generally written as **0–127**.
- However, **both ends are actually reserved**:
  - `0.x.x.x` → reserved
  - `127.x.x.x` → reserved for **loopback** addresses (covered in Lesson 7)
- So the **truly usable** Class A range is really **1–126**.

> 💡 **Exam tip:** Different sources phrase this differently. Safest approach: remember Class A as "0–127," but keep in mind that 0 and 127 are both reserved, so real/usable Class A networks start at 1.

---

## 2. Recap: The Wikipedia IPv4 Class Chart

| Class | Leading bits | Prefix length (network bits) | Host bits | 
|---|---|---|---|
| A | `0` | 8 | 24 |
| B | `10` | 16 | 16 |
| C | `110` | 24 | 8 |

The chart also shows a **"number of addresses per network"** column — this is the **maximum total addresses** (including the 2 reserved ones), calculated as:

```
2^(number of host bits)
```

But what we actually care about is the **maximum number of USABLE addresses** — the ones that can be assigned to real devices. That's the focus of this section.

---

## 3. The Formula for Maximum Usable Hosts

> **Maximum usable hosts = 2ⁿ − 2**
> *(where n = number of host bits)*

Why subtract 2? Because — as covered in Lesson 7 — every network reserves:
1. The **network address** (host portion = all 0s)
2. The **broadcast address** (host portion = all 1s)

Neither of these can be assigned to an actual device.

### Worked Example 1 — Class C: `192.168.1.0/24`
- `/24` → 8 host bits (last octet)
- Total addresses = 2⁸ = 256
- Usable hosts = 256 − 2 = **254**

### Worked Example 2 — Class B: `172.16.0.0/16`
- `/16` → 16 host bits (last 2 octets)
- Total addresses = 2¹⁶ = 65,536
- Usable hosts = 65,536 − 2 = **65,534**

### Worked Example 3 — Class A: `10.0.0.0/8`
- `/8` → 24 host bits (last 3 octets)
- Total addresses = 2²⁴ = 16,777,216
- Usable hosts = 16,777,216 − 2 = **16,777,214**

### Quick Reference Table
| Class | Prefix | Host bits | Total addresses | Usable hosts |
|---|---|---|---|---|
| A | /8 | 24 | 16,777,216 | **16,777,214** |
| B | /16 | 16 | 65,536 | **65,534** |
| C | /24 | 8 | 256 | **254** |

---

## 4. Finding the First and Last Usable Address

Once you know the **network address** and **broadcast address** of a network, finding the first/last usable address is simple:

> **First usable address = Network address + 1**
> **Last usable address = Broadcast address − 1**

### Worked Example 1 — `192.168.1.0/24`
| Address | Value | How |
|---|---|---|
| Network address | `192.168.1.0` | Host portion = all 0s |
| **First usable** | `192.168.1.1` | Network address + 1 |
| **Last usable** | `192.168.1.254` | Broadcast address − 1 |
| Broadcast address | `192.168.1.255` | Host portion = all 1s |

### Worked Example 2 — `172.16.0.0/16`
| Address | Value | How |
|---|---|---|
| Network address | `172.16.0.0` | Host portion = all 0s |
| **First usable** | `172.16.0.1` | Network address + 1 |
| **Last usable** | `172.16.255.254` | Broadcast address − 1 |
| Broadcast address | `172.16.255.255` | Host portion = all 1s |

### Worked Example 3 — `10.0.0.0/8`
| Address | Value | How |
|---|---|---|
| Network address | `10.0.0.0` | Host portion = all 0s |
| **First usable** | `10.0.0.1` | Network address + 1 |
| **Last usable** | `10.255.255.254` | Broadcast address − 1 |
| Broadcast address | `10.255.255.255` | Host portion = all 1s |

> 🔑 **The pattern:** Only the very last bit of the host portion changes — flip the last 0 to a 1 to get the first usable address, or flip the last 1 to a 0 to get the last usable address.

---

## 5. Example Network Setup for This Lesson

The video sets up a router (**R1**) connected to **3 separate networks**, one per interface — a great practical example combining everything above:

| Network | Class | PC's IP (first usable) | R1 Interface | R1's IP (last usable) |
|---|---|---|---|---|
| `10.0.0.0/8` | A | PC1 = `10.0.0.1` | G0/0 | `10.255.255.254` |
| `172.16.0.0/16` | B | PC2 = `172.16.0.1` | G0/1 | `172.16.255.254` |
| `192.168.0.0/24` | C | PC3 = `192.168.0.1` | G0/2 | `192.168.0.254` |

> 💡 Notice the pattern: **PCs get the first usable address, the router gets the last usable address.** This is just a common convention, not a strict rule — but you'll see it often.

---

## 6. Configuring IP Addresses on a Cisco Router — Step by Step

### Step 1: Enter Privileged EXEC Mode
```
Router> en
Router#
```

### Step 2: Check current interface status (before configuring anything)
```
Router# show ip interface brief
```

This is an extremely useful command — memorize it! Here's what each column means:

| Column | Meaning |
|---|---|
| **Interface** | The name of each physical interface (e.g., GigabitEthernet0/0) |
| **IP-Address** | Currently assigned IP (shows "unassigned" if none) |
| **OK?** | Legacy field — not really relevant anymore, should always say "YES" |
| **Method** | How the IP was assigned (`unset` = nothing configured yet, `manual` = configured via CLI) |
| **Status** | The **Layer 1** status of the interface |
| **Protocol** | The **Layer 2** status of the interface |

### 🔑 Key fact: Router interfaces are "administratively down" by default
- Every Cisco **router** interface has the `shutdown` command applied **by default** — even if a cable is properly connected.
- This is different from **switches**: switch interfaces are **NOT** shut down by default — they'll show "up" automatically if a cable is connected.
- You must manually run `no shutdown` to enable a router interface.

### Understanding Status vs. Protocol columns
| Column | OSI Layer | What it checks |
|---|---|---|
| **Status** | Layer 1 | Is the interface enabled? Is a cable connected properly? |
| **Protocol** | Layer 2 | Is Layer 2 communication (e.g., Ethernet) working properly with the connected device? |

> 💡 **Important rule:** You will **never** see Status = "down" and Protocol = "up" — if Layer 1 is down, Layer 2 can't function either. But the reverse (Status "up", Protocol "down") IS possible.

---

### Step 3: Enter Interface Configuration Mode

```
Router(config)# interface GigabitEthernet0/0
Router(config-if)#
```

Note the new prompt: `(config-if)#` — this means you're now inside a *specific interface's* configuration.

#### Shortcuts and flexibility for this command:
- You don't need a space: `interface GigabitEthernet0/0` works the same as `interface GigabitEthernet 0/0`
- Command shortcut: `int` (or even `in`, since it's the only global-config command starting with those two letters — though `int` is more common/readable)
- Interface name shortcut: Typing just `G0/0` works (even though many commands start with "G", adding the `0/0` makes it unambiguous)

**You can jump directly between interfaces** without typing `exit` first:
```
Router(config-if)# interface g0/1
Router(config-if)#    ← now configuring a different interface
```

---

### Step 4: Assign an IP Address

```
Router(config-if)# ip address <ip-address> <subnet-mask>
```

⚠️ **Important:** On Cisco devices, you must type the **subnet mask in dotted decimal** — NOT the slash prefix notation (`/24`).

### Prefix ↔ Subnet Mask conversion (memorize these!):
| Prefix | Subnet Mask |
|---|---|
| /8 | `255.0.0.0` |
| /16 | `255.255.0.0` |
| /24 | `255.255.255.0` |

### Example commands used in the video:
```
Router(config-if)# int g0/0
Router(config-if)# ip address 10.255.255.254 255.0.0.0
Router(config-if)# no shutdown

Router(config-if)# int g0/1
Router(config-if)# ip address 172.16.255.254 255.255.0.0
Router(config-if)# no shutdown

Router(config-if)# int g0/2
Router(config-if)# ip address 192.168.0.254 255.255.255.0
Router(config-if)# no shutdown
```

### Step 5: Enable the Interface with `no shutdown`
```
Router(config-if)# no shutdown
```
- Shortcut: `no shut`
- This cancels the default `shutdown` command, bringing the interface **up**

When you run this, you should see two confirmation messages:
```
%LINK-3-UPDOWN: Interface GigabitEthernet0/0, changed state to up
%LINEPROTO-5-UPDOWN: Line protocol on Interface GigabitEthernet0/0, changed state to up
```
- **First message** = Layer 1 status (matches the "Status" column)
- **Second message** = Layer 2 status (matches the "Protocol" column)

### Verifying your work
```
Router(config-if)# do show ip interface brief
```
*(Remember `do` lets you run privileged EXEC commands while still inside another config mode — no need to exit first!)*

After proper configuration, you should see:
- IP address displayed correctly
- Method = `manual`
- Status = `up`
- Protocol = `up`

---

## 7. Two More Useful "Show" Commands

### `show interfaces <interface-name>`
Shows **detailed** Layer 1, Layer 2, and some Layer 3 info about one specific interface. Recommended to specify the interface, since running it without one dumps info for *every* interface at once.

Key info shown:
| Field | Meaning |
|---|---|
| `GigabitEthernet0/0 is up` | Layer 1 status |
| `line protocol is up` | Layer 2 status |
| `Hardware is 1GbE` | Type of physical interface |
| `address is <MAC>` | The interface's MAC address |
| `BIA <MAC>` | "Burned-In Address" — the MAC address physically assigned at manufacture |
| `Internet address is <IP>/<prefix>` | The configured IP address |

> 💡 Why does the MAC address appear **twice** (once as "address," once as "BIA")? Because you *can* manually override an interface's MAC address in the CLI — but the **BIA** always shows the original, factory-assigned MAC, even if you've changed it. In practice, you'll rarely ever need to change a MAC address manually.

### `show interfaces description`
Shows a simple table view of: **Interface | Status | Protocol | Description**

To set a description on an interface:
```
Router(config-if)# description <your text here>
```
- Shortcut: `desc`
- There's no required format — purely for your own documentation/reference (e.g., noting what device is connected to that interface)
- Example from the video: `description #Connected to PC1#` (using `#` symbols just to make it stand out — totally optional styling)

---

## 8. Summary Table — Key Commands from This Lesson

| Command | Mode | Purpose |
|---|---|---|
| `show ip interface brief` | Privileged EXEC | Quick overview of all interfaces: IP, status, protocol |
| `interface <name>` | Global Config | Enter interface configuration mode for a specific interface |
| `ip address <ip> <subnet-mask>` | Interface Config | Assign an IP address (subnet mask in dotted decimal, NOT slash notation) |
| `no shutdown` | Interface Config | Enable the interface (cancels default `shutdown`) |
| `shutdown` | Interface Config | Disable the interface |
| `do <command>` | Any config mode | Run a privileged EXEC command without leaving your current mode |
| `show interfaces <name>` | Privileged EXEC | Detailed Layer 1/2/3 info about one interface, including MAC address |
| `show interfaces description` | Privileged EXEC | Table showing status, protocol, and description of each interface |
| `description <text>` | Interface Config | Add a custom label/note to an interface |

---

## 9. Summary Table — Key Concepts from This Lesson

| Concept | Key Fact |
|---|---|
| Class A usable range | 1–126 (0 and 127 both reserved) |
| Usable hosts formula | 2ⁿ − 2 (n = host bits) |
| First usable address | Network address + 1 |
| Last usable address | Broadcast address − 1 |
| Subnet mask on Cisco devices | Must be written in dotted decimal, not `/prefix` |
| Router interfaces default state | Administratively DOWN (shutdown applied by default) |
| Switch interfaces default state | NOT shut down by default |
| Status column | Layer 1 (physical) |
| Protocol column | Layer 2 (data link) |
| BIA | Burned-In Address — the original factory MAC address |

---

## 10. Practice Quiz (From the Video)

For each IP address, find: **network address, max usable hosts, broadcast address, first usable address, last usable address.**

1. **PC1: `43.109.23.12/8`**
2. **PC4: `129.221.23.13/16`**
3. **PC8: `209.211.3.22/24`**
4. **PC5: `2.71.209.233/8`**
5. **PC6: `155.200.201.141/16`**

<br>

### ✅ Answers & Explanations

**1. `43.109.23.12/8`** (Class A → first octet = network portion)
| Value | Answer |
|---|---|
| Network address | `43.0.0.0` |
| Max usable hosts | 2²⁴ − 2 = **16,777,214** |
| Broadcast address | `43.255.255.255` |
| First usable | `43.0.0.1` |
| Last usable | `43.255.255.254` |

**2. `129.221.23.13/16`** (first 2 octets = network portion)
| Value | Answer |
|---|---|
| Network address | `129.221.0.0` |
| Max usable hosts | 2¹⁶ − 2 = **65,534** |
| Broadcast address | `129.221.255.255` |
| First usable | `129.221.0.1` |
| Last usable | `129.221.255.254` |

**3. `209.211.3.22/24`** (first 3 octets = network portion)
| Value | Answer |
|---|---|
| Network address | `209.211.3.0` |
| Max usable hosts | 2⁸ − 2 = **254** |
| Broadcast address | `209.211.3.255` |
| First usable | `209.211.3.1` |
| Last usable | `209.211.3.254` |

**4. `2.71.209.233/8`** (first octet = network portion)
| Value | Answer |
|---|---|
| Network address | `2.0.0.0` |
| Max usable hosts | 2²⁴ − 2 = **16,777,214** |
| Broadcast address | `2.255.255.255` |
| First usable | `2.0.0.1` |
| Last usable | `2.255.255.254` |

**5. `155.200.201.141/16`** (first 2 octets = network portion)
| Value | Answer |
|---|---|
| Network address | `155.200.0.0` |
| Max usable hosts | 2¹⁶ − 2 = **65,534** |
| Broadcast address | `155.200.255.255` |
| First usable | `155.200.0.1` |
| Last usable | `155.200.255.254` |

---

### 💡 Study Tip
Notice the pattern across every single question: **only the octets in the host portion change**; the network-portion octets stay locked in place from the original address. Once you can instantly identify which octets are "network" vs. "host" based on the prefix (`/8`, `/16`, `/24`), the rest is just filling in zeros, ones, or ±1 — practice this until it's automatic, since it's a foundational skill for the subnetting lessons coming up next.
