# CCNA Notes — Lesson 9: Switch Interfaces (Speed, Duplex & Autonegotiation)
*(Based on Jeremy's IT Lab video)*

---

## 1. Quick Reminder: Routers vs. Switches — Physical Design

Before diving in, a quick real-world observation from the video:

| Device | Typical Interfaces |
|---|---|
| **Router** (e.g., Cisco ASR 1000-X) | Mostly a handful of **SFP** (fiber-optic) ports, plus a few RJ45 |
| **Switch** (e.g., Cisco Catalyst 9200) | **48 RJ45 ports** (for end devices) + a few SFP ports (for uplinks) |

> 💡 **Why the difference?** Switches are built to connect lots of **end hosts** (PCs, printers, etc.) via RJ45. Routers mainly connect to *other networks* (often over fiber/SFP), not directly to dozens of individual PCs.

---

## 2. Example Network for This Lesson

- One LAN: `192.168.1.0/24`
- Devices: Router **R1**, two switches **SW1** and **SW2**, four PCs (PC1–PC4)
- Focus device: **SW1**, specifically its interfaces **F0/1 – F0/4** (connected) and the rest (unconnected)

---

## 3. Switch Interfaces vs. Router Interfaces — Key Difference

Recall from Lesson 8: **router interfaces are shut down by default** (administratively down).

**Switch interfaces are different:**

| Interface Type | Default State |
|---|---|
| **Router interface** | Administratively **down** (shutdown applied by default) — must manually `no shutdown` |
| **Switch interface** | **NOT** shut down by default — automatically comes **up** if a cable is connected |

### Checking with `show ip interface brief`
On SW1, with zero configuration done (except hostname):
- Connected interfaces (F0/1–F0/4) → **up/up**
- Unconnected interfaces → **down/down** *(not "administratively down" — just genuinely not connected)*

> 🔑 **Important distinction:**
> - **"administratively down / down"** = someone applied the `shutdown` command
> - **"down / down"** (no "administratively") = the interface is enabled, but there's simply no cable/device connected

### What about the IP Address column?
- Switch interfaces show **IP address: unassigned** — and that's expected!
- Switches are **Layer 2 devices** — their individual ports don't need IP addresses to do their job (forwarding frames by MAC address).
- *(There's an advanced topic called "multilayer switching" where switches DO get IP addresses — that's for a much later lesson. Ignore the IP column for now.)*

---

## 4. A New Command: `show interfaces status`

This gives a different, very useful view of switch interfaces:

| Field | Meaning |
|---|---|
| **Port** | The interface name |
| **Name** | Actually the **description** you've configured (confusingly labeled "Name") |
| **Status** | `connected` (device attached) or `notconnect` (nothing attached) — different wording than `show ip interface brief`! |
| **VLAN** | Which VLAN the port belongs to (default = 1). Covered in a future lesson. |
| **Duplex** | Full or half duplex setting (explained below) |
| **Speed** | The interface's operating speed |
| **Type** | Physical interface type, e.g., `10/100BASE-TX` for RJ45 copper |

### 🔑 Status field naming differs between commands!
| Command | "No cable" status | "Cable, but shutdown" status |
|---|---|---|
| `show ip interface brief` | `down` | `administratively down` |
| `show interfaces status` | `notconnect` | `disabled` |

> 💡 Same underlying meaning, just different wording depending on which command you use — memorize both!

---

## 5. What is Duplex?

> **Duplex** = whether a device can send AND receive data **at the same time**.

| Type | Can send + receive simultaneously? |
|---|---|
| **Half duplex** | ❌ No — must wait if currently receiving before it can send |
| **Full duplex** | ✅ Yes — can do both at once, no waiting |

**Full duplex is always preferred**, and in modern switch-based networks, essentially everything runs full duplex.

---

## 6. Where Does Half-Duplex Even Come From? (Historical Context — the Hub)

This part is mostly conceptual/background — it explains *why* half-duplex and CSMA/CD exist, even though you'll rarely see them in real modern networks.

### The Hub (a predecessor to the switch)
- A **hub** is a very simple **Layer 1** device — basically just a repeater.
- Whatever frame it receives on one port, it blindly **floods out every other port** — no MAC address learning, no intelligence at all (unlike a switch).

### The Collision Problem
If **two devices** connected to the same hub try to send frames **at the same time**:
- The hub can't hold one back and send the other later — it just floods both simultaneously
- This causes a **collision** — the frames interfere with each other, and neither is received correctly

> 🔑 All devices connected to the same hub share what's called a **collision domain** — a group of devices whose transmissions can collide with each other.

### CSMA/CD — How Devices Handle Half-Duplex Collisions

**CSMA/CD** = **Carrier Sense Multiple Access with Collision Detection**

How it works, step by step:
1. Before sending, a device **listens** to check that no one else is currently transmitting.
2. If it detects the channel is clear, it sends its frame.
3. If a **collision** does occur anyway (e.g., due to timing), the device sends a **jamming signal** to alert all other devices.
4. Every device then waits a **random amount of time** before trying again.
5. The process repeats.

> 💡 This is the "traffic management" system needed **specifically because** half-duplex devices can't safely send and receive at once — collisions are a normal (if inconvenient) part of operating on a hub.

### Why Switches Fixed This
- Switches operate at **Layer 2** — they use **MAC addresses** to send frames to the *correct specific device*, not flood blindly like a hub.
- A switch will also never try to send two frames to the same destination port at the same exact instant.
- **Result:** Each switch port becomes its **own separate collision domain**. With no shared collision risk, devices connected to switches can safely use **full duplex**.

### Quick Comparison: Hub vs. Switch
| | Hub | Switch |
|---|---|---|
| OSI Layer | Layer 1 | Layer 2 |
| Forwarding method | Floods to all ports (dumb repeater) | Uses MAC address table (intelligent forwarding) |
| Collision domains | 1 shared domain for all connected devices | Each port = its own separate collision domain |
| Duplex used | Half duplex (with CSMA/CD) | Full duplex |

> 🔑 **In modern networks, you'll almost never encounter a hub or half-duplex** — but understanding *why* full duplex works safely on switches (and why it didn't on hubs) is valuable conceptual knowledge for the exam.

---

## 7. Autonegotiation — Speed & Duplex

By default, most Cisco interfaces are set to:
- **Speed: auto**
- **Duplex: auto**

This means the two connected devices **automatically negotiate** the best speed and duplex settings they both support — no manual configuration needed.

### Scenario 1: Autonegotiation works on both sides (ideal case)

| Interface | Connected device type | Negotiated Speed | Negotiated Duplex |
|---|---|---|---|
| G0/1 | Regular Ethernet PC | 10 Mbps | Full |
| G0/2 | FastEthernet PC | 100 Mbps | Full |
| G0/3 | Gigabit Ethernet PC | 1000 Mbps | Full |

> 💡 Each side simply uses the **fastest speed both devices support**, and in an all-switch/all-modern-device network, **full duplex is always chosen** since there's no reason to use half.

### Scenario 2: Autonegotiation disabled on the OTHER device

If the connected device has autonegotiation **turned off** (fixed/manual settings), here's what a switch with autonegotiation **enabled** will do:

**For Speed:**
- The switch tries to **sense** the speed the other device is using.
- If it **can't** sense the speed → falls back to the **slowest supported speed** (e.g., 10 Mbps on a 10/100/1000 port).

**For Duplex:**
- The switch **cannot reliably sense duplex** the same way it senses speed.
- Cisco's rule:
  - If the sensed/used speed is **10 or 100 Mbps** → switch defaults to **HALF duplex**
  - If the speed is **1000 Mbps or higher** → switch defaults to **FULL duplex**

### Worked Example (from the video):
Three PCs, manually configured (autonegotiation OFF), connected to a switch with autonegotiation ON:

| Interface | PC's actual speed | PC's actual duplex | Switch senses speed? | Switch's resulting duplex | Match? |
|---|---|---|---|---|---|
| G0/1 (Green PC) | 10 Mbps | (n/a — 10Mbps always half in this scenario) | ✅ Yes → 10 Mbps | Half (since speed ≤ 100) | ✅ Matches |
| G0/2 (Red PC) | 1000 Mbps | Full | ✅ Yes → 1000 Mbps | Full (since speed ≥ 1000) | ✅ Matches |
| G0/3 (Blue PC) | 100 Mbps | **Full** | ✅ Yes → 100 Mbps | **Half** (since speed ≤ 100) | ❌ **MISMATCH!** |

### 🔑 Duplex Mismatch — Why It's Bad
- G0/3's switch port ends up in **half duplex**, but the Blue PC is actually using **full duplex**.
- The full-duplex side (PC) will send data **whenever it wants**, without waiting.
- The half-duplex side (switch) expects the "listen before sending" behavior (CSMA/CD) — but the PC doesn't follow that rule.
- **Result:** Collisions occur → **poor network performance** on that link.

> 💡 **Golden rule: Always use autonegotiation on both sides** whenever possible, to avoid duplex mismatches entirely. Only manually configure speed/duplex when autonegotiation genuinely isn't working (e.g., troubleshooting a stubborn legacy device).

---

## 8. Manually Configuring Speed & Duplex

Even though autonegotiation is usually best, here's how to configure it manually (useful for troubleshooting):

```
SW1(config)# interface f0/1
SW1(config-if)# speed 100
SW1(config-if)# duplex full
SW1(config-if)# description Connected to R1
```

### Speed options:
```
SW1(config-if)# speed ?
  10    Force 10 Mbps operation
  100   Force 100 Mbps operation
  auto  Enable AUTO speed configuration
```

### Duplex options:
```
SW1(config-if)# duplex ?
  auto  Enable AUTO duplex configuration
  full  Force full duplex operation
  half  Force half-duplex operation
```

### Verifying manual configuration:
When you check `show interfaces status` afterward:
- **Autonegotiated** values show with an **"a-" prefix** → e.g., `a-full`, `a-100`
- **Manually configured** values show **without** the prefix → just `full`, `100`

> 💡 This is a handy visual cue: if you see the "a-" prefix, you know that setting was auto-negotiated, not manually forced.

---

## 9. Configuring Multiple Interfaces at Once: `interface range`

Configuring each unused interface one-by-one is tedious. Instead, use:

```
SW1(config)# interface range f0/5 - 12
SW1(config-if-range)# description Unused
SW1(config-if-range)# shutdown
```

Notice the new prompt: **`(config-if-range)#`** — you're now configuring **multiple interfaces simultaneously**.

### 🔑 Why disable unused ports?
Even though it's *convenient* that switch ports come up automatically, it's also a **security risk** — anyone could walk up and plug into an open port and gain network access. Best practice: **shut down unused interfaces**.

### Non-consecutive interface ranges are also supported!
You can combine multiple ranges with commas:

```
SW1(config)# interface range f0/5 - 6, f0/9 - 12
```

This selects F0/5, F0/6, F0/9, F0/10, F0/11, and F0/12 — **skipping F0/7 and F0/8** entirely. Very useful when you need to configure a scattered set of ports without doing them individually.

---

## 10. Interface Counters & Errors

Use the `show interfaces <interface-name>` command to view detailed traffic statistics, including error counters, at the bottom of the output.

### Key counters to know:

| Counter | Meaning |
|---|---|
| **Packets / Bytes received** | Simple traffic totals (not an error) |
| **Runts** | Frames **smaller** than the Ethernet minimum size (64 bytes) |
| **Giants** | Frames **larger** than the Ethernet maximum size (1518 bytes) |
| **CRC** | Frames that **failed** the Cyclic Redundancy Check (via the FCS field in the Ethernet trailer — covered in Lesson 5!) |
| **Frame** | Frames with an incorrect/illegal format |
| **Input errors** | A combined total including runts, giants, CRC, frame errors, and others |
| **Output errors** | Frames the device **tried to send** but failed to, due to an error |

> 💡 This directly connects back to what you learned about the **Ethernet frame trailer (FCS)** in Lesson 5 — the CRC counter here is literally counting how many times that error-check failed.

> 🔑 **Note:** These counters/commands work the same way on **both routers and switches** — nothing switch-specific about them.

---

## 11. Summary Table — Key Commands from This Lesson

| Command | Mode | Purpose |
|---|---|---|
| `show ip interface brief` | Privileged EXEC | Quick Layer 1/2 status + IP address per interface |
| `show interfaces status` | Privileged EXEC | Port, description, connection status, VLAN, duplex, speed, type |
| `speed <10\|100\|auto>` | Interface Config | Manually set interface speed |
| `duplex <full\|half\|auto>` | Interface Config | Manually set interface duplex |
| `description <text>` | Interface Config | Label an interface for documentation |
| `interface range <range>` | Global Config | Enter config mode for multiple interfaces at once |
| `shutdown` / `no shutdown` | Interface (or range) Config | Disable / enable an interface |
| `show interfaces <name>` | Privileged EXEC | Detailed stats including error counters (runts, giants, CRC, etc.) |

---

## 12. Summary Table — Key Concepts from This Lesson

| Concept | Key Fact |
|---|---|
| Router interfaces default state | Administratively down (shutdown applied) |
| Switch interfaces default state | NOT shut down — up if connected, down if not |
| "down/down" vs "admin down/down" | down/down = no cable; admin down = shutdown command applied |
| Half duplex | Can't send + receive simultaneously — needs CSMA/CD |
| Full duplex | Can send + receive simultaneously — no collision risk |
| Hub | Layer 1 device, floods everything, creates 1 shared collision domain |
| Switch | Layer 2 device, forwards intelligently, each port = own collision domain |
| CSMA/CD | Used only in half-duplex — listen, send, detect collision, jam signal, random wait, retry |
| Autonegotiation default | Speed = auto, Duplex = auto |
| If neighbor's autonegotiation is off | Switch senses speed (or falls back to slowest); duplex defaults to half if speed ≤100Mbps, full if ≥1000Mbps |
| Duplex mismatch | Happens when one side is full and the other half → causes collisions/poor performance |
| "a-" prefix in show interfaces status | Indicates the setting was auto-negotiated (not manually forced) |
| Interface range syntax | `interface range f0/5 - 12` or with commas for non-consecutive: `f0/5 - 6, f0/9 - 12` |
| Runts | Frames smaller than 64 bytes |
| Giants | Frames larger than 1518 bytes |
| CRC errors | Frames that failed the FCS/CRC check |

---

## 13. Practice Quiz (From the Video)

Test yourself first!

1. **There's a duplex mismatch between SW1's F0/1 and SW2's F0/1 (connected together). Autonegotiation is disabled. What happens?**
   A) Improved performance  B) Collisions will occur  C) SW1 will sense SW2's duplex and adjust to match

2. **What mechanism is used on half-duplex interfaces to detect and avoid collisions?**
   A) CSMA/CD  B) CSMA/CA  C) Autonegotiation  D) Duplex Auto

3. **Which command shows various error counters detected on an interface?**
   A) show interfaces  B) show ip interface brief  C) show interfaces status  D) show interfaces errors

4. **Which of these are examples of real interface errors?**
   A) runts, giants, broadcasts  B) shorts, longs, oversizes  C) packets, bytes, inputs, outputs  D) runts, giants, CRC

5. **SW1 is autonegotiating with SW2, but SW2 has autonegotiation disabled and is manually set to 100 Mbps, full duplex. What will SW1 use?**
   A) Speed 100, duplex full  B) Speed 100, duplex half  C) Speed 10, duplex full  D) Speed 10, duplex half

<br>

### ✅ Answers & Explanations

1. **B — Collisions will occur.** The full-duplex side sends data whenever it wants, without checking if the half-duplex side is ready to receive — causing collisions. Performance will get *worse*, not better (ruling out A), and without autonegotiation, SW1 has no way to sense SW2's duplex setting (ruling out C).

2. **A — CSMA/CD** (Carrier Sense Multiple Access with Collision Detection). This describes how half-duplex devices listen before sending and react if a collision occurs. CSMA/CA (B) is a related-but-different concept covered later in the course.

3. **A — show interfaces.** `show ip interface brief` and `show interfaces status` both give basic status/config info but no error counters. `show interfaces errors` isn't a real command.

4. **D — runts, giants, CRC.** These are genuine error types. Broadcasts (in option A) are a normal part of network operation, not an error. Options B and C aren't real error category names.

5. **B — Speed 100 Mbps, duplex half.** SW1 can successfully *sense* SW2's speed (100 Mbps) since speed-sensing works even without autonegotiation on the other side — but it **cannot sense duplex**. Since the sensed speed is 100 Mbps (≤100), SW1 defaults to **half duplex** — creating a mismatch with SW2's actual full-duplex setting.

---

### 💡 Study Tip
The duplex mismatch scenario (Section 7, Scenario 2) is one of the most commonly tested concepts from this lesson — make sure you can explain, without looking at your notes, exactly *why* a switch defaults to half duplex when it can't sense the neighbor's duplex setting, and why that specific combination (full + half) causes real network problems. This also shows up frequently in real-world troubleshooting, not just the exam!
