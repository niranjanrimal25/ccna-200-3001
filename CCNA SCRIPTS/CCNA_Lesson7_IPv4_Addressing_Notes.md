# CCNA Notes — Lesson 7: IPv4 Addressing
*(Based on Jeremy's IT Lab video)*

---

## 1. Quick Review: Layer 3 (Network Layer)

| Layer 3 Characteristic | Detail |
|---|---|
| Purpose | Provides connectivity between hosts on **different** networks (beyond the local LAN) |
| Addressing | Uses **logical addresses** — IP addresses (assigned by you when configuring a device) |
| vs. Layer 2 (MAC) | MAC = burned-in/physical, assigned at manufacture. IP = logical, assigned by a human/admin |
| Path selection | Determines the *best route* to a destination across complex networks (like the internet) |
| Devices | **Routers** operate at Layer 3 |

> 💡 Core distinction: **Switches (Layer 2) connect/expand a single LAN. Routers (Layer 3) separate and connect different LANs/networks.**

---

## 2. Switches Don't Separate Networks — Routers Do

Recap of a key experiment from the video:

- A network of PCs connected purely through **switches** (no router) = still **one single LAN**, no matter how many switches you add.
- A **broadcast frame** (`FFFF.FFFF.FFFF`) sent by PC1 in this all-switch setup reaches **every PC** on the network — switches just keep flooding it everywhere.

**Now insert a router (R1) between two switches:**
- The network is now split into **two separate networks**:
  - Switch 1 side → `192.168.1.0/24`
  - Switch 2 side → `192.168.2.0/24`
- If PC1 sends a broadcast now, it only reaches devices on **its own side** (PC2 and R1's interface) — **the broadcast does NOT cross the router** to reach PC3/PC4.

> 🔑 **Routers stop broadcasts from crossing into other networks.** This is one of the most important reasons networks are split up in the first place.

### Routers need an IP address per network they connect to
- R1's `G0/0` interface → `192.168.1.254` (on the PC1/PC2 network)
- R1's `G0/1` interface → `192.168.2.254` (on the PC3/PC4 network)

A router interface gets **one IP address for each separate network it touches** — it's the "gateway" between those networks.

---

## 3. Where IP Addresses Live in a Packet

- The **IPv4 header** contains many fields (covered in more detail in a later lesson).
- This lesson focuses on just two of them:
  - **Source IP address** — 32 bits
  - **Destination IP address** — 32 bits

> 📏 **IPv4 addresses are 32 bits (4 bytes) long.**

---

## 4. Binary, Decimal, and Dotted Decimal — Why We Need All Three

### The core problem
Computers store and process IP addresses as **binary** (32 ones and zeros) — but that's very hard for humans to read or remember.

### The solution: Dotted Decimal Notation
An IP address like `192.168.1.254` is really just **32 binary bits**, split into **4 groups of 8 bits each** (called **octets**), with each 8-bit group converted to a decimal number (0–255) and separated by dots.

```
192      .   168      .   1        .   254
11000000     10101000      00000001      11111110
```

> 💡 **Octet** = a group of 8 bits. An IPv4 address = 4 octets = 32 bits total.

---

## 5. Warm-Up: How Decimal and Hexadecimal Place Values Work

Before jumping into binary, it helps to see that **every** number system follows the same basic logic:
> Each column represents a power of the base. Multiply the digit by that column's value, then add all the columns together.

### Decimal example: the number `3,294`

Decimal place values increase by **×10** each column:

| Column | Thousands (×1000) | Hundreds (×100) | Tens (×10) | Ones (×1) |
|---|---|---|---|---|
| Digit | 3 | 2 | 9 | 4 |
| Value | 3×1000=3000 | 2×100=200 | 9×10=90 | 4×1=4 |

**Total: 3000 + 200 + 90 + 4 = 3,294** ✅

Nothing new here — just the everyday decimal system, laid out column by column.

### The same number in hexadecimal: `CDE`

Hexadecimal place values increase by **×16** each column instead of ×10:

| Column | ×256 | ×16 | ×1 |
|---|---|---|---|
| Digit | C | D | E |

**Rightmost digit — `E` (×1 column)**
- Hex `E` = decimal 14
- 14 × 1 = **14**

**Middle digit — `D` (×16 column)**
- Hex `D` = decimal 13
- 13 × 16 = **208**

**Leftmost digit — `C` (×256 column)**
- Hex `C` = decimal 12
- Why 256? Each column is 16× the previous one: 1 → 16 → 16×16 = 256
- 12 × 256 = **3072**

**Adding it all up:**
```
3072 (from C)
+ 208 (from D)
+  14 (from E)
-------
3,294 ✅
```

### Why this warm-up matters

| System | Base | Column values (right to left) |
|---|---|---|
| Decimal | 10 | 1, 10, 100, 1000... |
| Hexadecimal | 16 | 1, 16, 256, 4096... |
| **Binary** | **2** | **1, 2, 4, 8, 16, 32, 64, 128...** |

Once you see hex following the *exact same column logic* as decimal (just a different multiplier per column, plus extra "digits" A–F to represent 10–15), it's much easier to accept that **binary works identically** — just with a base of 2. That's exactly what the video does next: it applies this same column-by-column approach to convert IP address octets (like `192`) into binary.

---

## 6. Understanding Binary (Base 2)

### Quick comparison of number systems:
| System | Base | Digits used | Each column multiplies by |
|---|---|---|---|
| Decimal | 10 | 0–9 | ×10 |
| Hexadecimal | 16 | 0–9, A–F | ×16 |
| **Binary** | **2** | **0, 1** | **×2** |

### Binary place values (within one octet, left to right):
```
128   64   32   16   8   4   2   1
```
Each position is either **on (1)** or **off (0)**. To convert binary → decimal, just **add up the place values where there's a 1**.

### Worked Example 1: Binary `10011111` → Decimal
```
128   64   32   16   8   4   2   1
 1     0    0    1   1   1   1   1
```
128 + 16 + 8 + 4 + 2 + 1 = **159**

### Worked Example 2: Binary `01101110` → Decimal
```
128   64   32   16   8   4   2   1
 0     1    1    0   1   1   1   0
```
64 + 32 + 8 + 4 + 2 = **110**

---

## 7. Converting Decimal → Binary (Subtraction Method)

**Steps:**
1. Write out the 8 place values: `128 64 32 16 8 4 2 1`
2. Starting from 128, ask: *"Can I subtract this value from my number without going negative?"*
   - If **yes** → write `1`, subtract that value, and continue with the remainder
   - If **no** → write `0`, and move to the next (smaller) value

### Worked Example: Decimal `221` → Binary
| Value | 128 | 64 | 32 | 16 | 8 | 4 | 2 | 1 |
|---|---|---|---|---|---|---|---|---|
| Subtract? | 221-128=93 ✅ | 93-64=29 ✅ | 29-32 ❌ | 29-16=13 ✅ | 13-8=5 ✅ | 5-4=1 ✅ | 1-2 ❌ | 1-1=0 ✅ |
| Bit | 1 | 1 | 0 | 1 | 1 | 1 | 0 | 1 |

**Answer: `221` = `11011101`**

### Worked Example: Decimal `127` → Binary
| Value | 128 | 64 | 32 | 16 | 8 | 4 | 2 | 1 |
|---|---|---|---|---|---|---|---|---|
| Subtract? | ❌ (127<128) | ✅ (63 left) | ✅ (31 left) | ✅ (15 left) | ✅ (7 left) | ✅ (3 left) | ✅ (1 left) | ✅ (0 left) |
| Bit | 0 | 1 | 1 | 1 | 1 | 1 | 1 | 1 |

**Answer: `127` = `01111111`**

### Worked Example: Decimal `207` → Binary
| Value | 128 | 64 | 32 | 16 | 8 | 4 | 2 | 1 |
|---|---|---|---|---|---|---|---|---|
| Subtract? | ✅ (79 left) | ✅ (15 left) | ❌ | ❌ | ✅ (7 left) | ✅ (3 left) | ✅ (1 left) | ✅ (0 left) |
| Bit | 1 | 1 | 0 | 0 | 1 | 1 | 1 | 1 |

**Answer: `207` = `11001111`**

> 💡 **Key fact to memorize:** With 8 bits, the possible decimal range per octet is **0 to 255** (since 128+64+32+16+8+4+2+1 = 255).

---

## 8. Network Portion vs. Host Portion

Every IP address is split into two parts:

| Part | Meaning |
|---|---|
| **Network portion** | Identifies *which network* the device belongs to — same for every device on that network |
| **Host portion** | Identifies *which specific device* on that network — unique to each device |

### What does `/24` mean?
- The **prefix length** (`/24`, `/16`, `/8`, etc.) tells you **how many of the 32 bits** belong to the network portion.
- `/24` = the first **24 bits** (i.e., the first **3 octets**) are the network portion; the remaining 8 bits (last octet) is the host portion.

### Example: `192.168.1.254/24`
```
192   .   168   .    1    .   254
└──────── network ────────┘ └ host ┘
```
- Network portion: `192.168.1`
- Host portion: `254`

### More prefix length examples:
| Prefix | Network bits | Which octets = network? | Which octets = host? |
|---|---|---|---|
| `/24` | First 24 bits | First 3 octets | Last 1 octet |
| `/16` | First 16 bits | First 2 octets | Last 2 octets |
| `/8` | First 8 bits | First 1 octet | Last 3 octets |

### Applied example: `154.78.111.32/16`
- `/16` → first 2 octets = network → `154.78`
- Last 2 octets = host → `111.32`

### Applied example: `12.128.251.23/8`
- `/8` → first 1 octet = network → `12`
- Last 3 octets = host → `128.251.23`

> 🔑 **Devices on the same network share the exact same network portion — only their host portion differs.**

Back to our earlier diagram:
- PC1 = `192.168.1.1/24`, PC2 = `192.168.1.2/24`, R1's G0/0 = `192.168.1.254/24` → all share network portion `192.168.1`
- PC3 = `192.168.2.1/24`, PC4 = `192.168.2.2/24`, R1's G0/1 = `192.168.2.254/24` → all share network portion `192.168.2`

---

## 9. IPv4 Address Classes

The **class** of an address is determined by the pattern of the **first few bits of the first octet**.

| Class | First octet binary pattern | First octet decimal range | Default prefix |
|---|---|---|---|
| **A** | Starts with `0` | 0 – 127 | `/8` |
| **B** | Starts with `10` | 128 – 191 | `/16` |
| **C** | Starts with `110` | 192 – 223 | `/24` |
| D | Starts with `1110` | 224 – 239 | *(Multicast — covered later)* |
| E | Starts with `1111` | 240 – 255 | *(Experimental — not covered in CCNA)* |

> 💡 For the CCNA, **focus on Classes A, B, and C**. Class D = multicast addresses (a topic for later). Class E = experimental, not used in this course.

### ⚠️ Special exception: the 127.x.x.x range
- Technically part of Class A's range, but **reserved for loopback addresses**.
- Practical Class A range is usually considered **0–126** (not 127).
- **Loopback** (`127.0.0.0` – `127.255.255.255`) is used to test a device's own network stack.
  - Pinging `127.0.0.1` (or any address in this range) makes your PC respond **to itself** — traffic never actually leaves the device.
  - Round-trip time for these pings = **0 ms**, since nothing is actually transmitted over the network.

---

## 10. Class Sizes — How Many Networks & Hosts?

| Class | Network bits | Host bits | Approx. # of networks | Approx. # of hosts per network |
|---|---|---|---|---|
| A | 8 | 24 | 128 | ~16.7 million |
| B | 16 | 16 | ~16,000 | ~65,000 |
| C | 24 | 8 | ~2 million | 256 |

### 🔑 The trade-off:
- **Class A** = few networks, but each network can hold a *huge* number of hosts
- **Class C** = many networks, but each is *small* (few hosts)
- **Class B** = a middle ground between the two

### Why the "usable hosts" number is 2 less than the total
Every network reserves **2 special addresses** that can't be assigned to any device:
1. The **network address** (all-zero host portion) — identifies the network itself
2. The **broadcast address** (all-one host portion) — used to reach every host on the network

So for Class C (256 total addresses), only **254** are actually usable by real devices.

---

## 11. Two Ways to Write Prefix Length

| Method | Example | Used by |
|---|---|---|
| **Slash notation** (prefix length) | `/24` | Newer, simpler. Common on Juniper devices. |
| **Subnet mask (dotted decimal)** | `255.255.255.0` | Older, still used on Cisco devices |

A subnet mask represents the network portion as all **1s**, and the host portion as all **0s**, written in dotted decimal (just like an IP address).

### Subnet mask by class:
| Class | Prefix | Subnet Mask |
|---|---|---|
| A | /8 | `255.0.0.0` |
| B | /16 | `255.255.0.0` |
| C | /24 | `255.255.255.0` |

> 💡 Prefix length and subnet mask are **two different ways of writing the exact same thing.**

---

## 12. Network Address & Broadcast Address

### Network Address
- The IP address where the **host portion is all zeros**.
- Identifies the **network itself** — it is NOT assigned to any device.
- **First address** in the network range.

**Example:** `192.168.1.0/24`
- Host portion (`.0`) = all zeros → this IS the network address
- The **first usable address** is one above it: `192.168.1.1` (assigned to PC1)

### Broadcast Address
- The IP address where the **host portion is all ones**.
- Used to send traffic to **every host** on that local network.
- Also NOT assignable to any device.
- **Last address** in the network range.

**Example:** In `192.168.1.0/24`, the broadcast address is `192.168.1.255`
- The **last usable address** is one below it: `192.168.1.254` (assigned to R1's interface)

### 🔑 What happens if you ping the broadcast address?
If PC1 pings `192.168.1.255`:
- The frame's destination **MAC address** = `FFFF.FFFF.FFFF` (broadcast MAC — same concept from the switching lessons!)
- It's received by **every device on that local network** (in this example: PC2 and R1's interface)

> 💡 This connects directly back to Layer 2 broadcast concepts you already learned — a Layer 3 broadcast IP address always maps to the Layer 2 broadcast MAC address.

---

## 13. Summary Table — Key Concepts from This Lesson

| Concept | Key Fact |
|---|---|
| IPv4 address length | 32 bits (4 bytes) |
| Octet | One group of 8 bits |
| Dotted decimal | 4 decimal numbers (0–255 each) separated by dots |
| Network portion | Same for all devices on the same network |
| Host portion | Unique to each device |
| /24 meaning | First 24 bits = network portion |
| Class A range | 0–127 (usable: 0–126), default /8 |
| Class B range | 128–191, default /16 |
| Class C range | 192–223, default /24 |
| Class D | 224–239, reserved for multicast |
| Class E | 240–255, experimental |
| Loopback range | 127.0.0.0 – 127.255.255.255 |
| Subnet mask (Class A/B/C) | 255.0.0.0 / 255.255.0.0 / 255.255.255.0 |
| Network address | Host portion = all 0s, not assignable |
| Broadcast address | Host portion = all 1s, not assignable |
| Usable hosts formula | Total addresses − 2 (network + broadcast) |

---

## 14. Binary ⇄ Decimal Conversion — Practice Method Reference

The video's quiz showed binary numbers visually (as images), which can't be reproduced in text form here. Use this **method reference** to practice with any numbers you like:

### Binary → Decimal:
1. Write the 8 place values above each bit: `128 64 32 16 8 4 2 1`
2. Add up the place values wherever there's a `1`

### Decimal → Binary:
1. Write the 8 place values: `128 64 32 16 8 4 2 1`
2. Starting from 128, subtract each value from your number if possible (write `1`); if not possible, write `0` and move to the next value
3. Continue until you reach 0

### Quick self-check reference table:
| Binary | Decimal |
|---|---|
| `00000000` | 0 |
| `00000001` | 1 |
| `00001111` | 15 |
| `00010000` | 16 |
| `01111111` | 127 |
| `10000000` | 128 |
| `11111111` | 255 |

> 💡 **Practice tip:** Pick any random number between 0–255, convert it to binary using the subtraction method, then convert your binary answer back to decimal to check yourself. Repeat until it feels fast and natural — this skill is used constantly throughout the rest of the CCNA (especially subnetting, which is coming up soon!).

---

### 💡 Study Tip
This lesson is the **foundation for subnetting**, one of the most heavily tested topics on the real CCNA exam. Make sure binary-to-decimal and decimal-to-binary conversion feels comfortable and fast before moving to the next lesson — everything about IP addressing builds on this skill.
