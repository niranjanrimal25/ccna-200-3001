# CCNA Notes — Lesson 6: Ethernet LAN Switching (Part 2)
*(Based on Jeremy's IT Lab video)*

---

## 1. Ethernet Frame — A Few More Details

Building on Lesson 5, there are some extra details about the Ethernet frame worth knowing:

### Header definition (stricter version)
- The **Preamble + SFD** are technically **NOT** counted as part of the "Ethernet header" — even though they're sent with every frame.
- The "true" Ethernet header = just **3 fields**: **Destination, Source, Type**

### Updated size numbers:
| Item | Size |
|------|------|
| Ethernet header (Destination + Source + Type only) + Trailer (FCS) | **18 bytes** |
| Minimum total frame size (header + payload + trailer) | **64 bytes** |
| Minimum payload size | **46 bytes** (64 − 18 = 46) |

### What if the payload is smaller than 46 bytes?
- **Padding** (extra filler bytes, all **0s**) gets added to reach the 46-byte minimum.
- Example: if you send a **34-byte** packet → **12 bytes of padding** are added (46 − 34 = 12).

> 💡 Remember: minimum frame = 64 bytes, minimum payload = 46 bytes, padding = all zeros.

---

## 2. Updated Example Network (Setup for This Lesson)

The video reuses a similar small network, with some updates:

- Interfaces are now **Gigabit Ethernet** (G0/0, G0/1, G0/2) instead of FastEthernet.
- More **realistic MAC addresses** are used, e.g. `0C2F.B011.9D00`
  - OUI (first half) = `0C2F.B0` → same manufacturer for all PCs
  - Second half = unique per device (video shortens references to just the last 4 digits, e.g. "PC1 = 9D00")
- **IP addresses** are added to the topology for the first time:
  - Network: `192.168.1.0/24`
  - PC1 = `192.168.1.1`, PC2 = `192.168.1.2`, PC3 = `192.168.1.3`, PC4 = `192.168.1.4`

*(Full IP addressing details are saved for a future lesson — here it's just used to explain ARP.)*

---

## 3. The Problem: PC1 Knows PC3's IP, But Not Its MAC

When you send data to another device, **you (the user) enter an IP address**, not a MAC address.

But remember: **switches operate at Layer 2** — they only understand MAC addresses, not IP addresses. So before PC1 can build a proper Ethernet frame to send to PC3, it needs to discover **PC3's MAC address**.

This is where **ARP** comes in.

---

## 4. ARP — Address Resolution Protocol

### What is ARP?
> ARP is used to discover the **Layer 2 address (MAC address)** of a device, when you already know its **Layer 3 address (IP address)**.

### ARP uses 2 messages:

| Message | Sent by | Type | Purpose |
|---------|---------|------|---------|
| **ARP Request** | The device that wants to know a MAC address | **Broadcast** (sent to everyone) | "Who has this IP address? Tell me your MAC." |
| **ARP Reply** | The device that owns that IP address | **Unicast** (sent to one device only) | "I have that IP — here's my MAC address." |

### Key detail: the broadcast MAC address
- ARP Requests use the special destination MAC: **`FFFF.FFFF.FFFF`**
- This is the **broadcast MAC address** — meaning "send this frame to every device on the local network."

---

## 5. Step-by-Step: How ARP Works (PC1 → PC3 Example)

**Step 1 — PC1 prepares an ARP Request**
- Source MAC = PC1's MAC
- Destination MAC = `FFFF.FFFF.FFFF` (broadcast)
- Message content (in plain English): *"Who has 192.168.1.3? Tell 192.168.1.1."*

**Step 2 — Switch(es) learn and flood the broadcast**
- SW1 receives the frame, learns PC1's MAC address (adds to MAC table, same as before)
- Since the destination is the broadcast address, SW1 **floods** it out all interfaces except the one it arrived on
- This behaves just like flooding an **unknown unicast** frame

**Step 3 — Devices check if the request is for them**
- PC2 and PC4 receive the broadcast, check the **destination IP** inside — it doesn't match their own IP, so they **ignore/drop** the frame
- PC3 recognizes the destination IP **does** match its own → it does NOT ignore it

**Step 4 — PC3 sends the ARP Reply**
- Since PC3 now knows PC1's MAC (it was included as the source MAC in the request), PC3 can send its reply **directly** to PC1 — no need to broadcast
- Source MAC = PC3, Destination MAC = PC1
- Message content: *"192.168.1.3 is at [PC3's MAC address]."*

**Step 5 — Reply travels back as a known unicast**
- Switches along the path already have PC1's MAC learned, so this reply is forwarded directly (not flooded) — a **known unicast frame**

**Step 6 — PC1 saves the result**
- PC1 stores this IP-to-MAC mapping in its own **ARP table**, so it doesn't need to repeat ARP for future frames to PC3 (until the entry expires or is cleared)

---

## 6. Viewing the ARP Table

The **ARP table** stores IP-to-MAC address mappings a device has learned.

| Platform | Command |
|----------|---------|
| Windows / macOS / Linux | `arp -a` |
| Cisco IOS (Privileged EXEC mode) | `show arp` |

### Columns in a typical ARP table:
| Column | Meaning |
|--------|---------|
| Internet Address | The IP address |
| Physical Address | The corresponding MAC address |
| Type | **Static** = manually configured/default entry (not learned via ARP) <br> **Dynamic** = learned automatically via an ARP request/reply |

---

## 7. Ping & ICMP

### What is Ping?
> A network utility used to **test reachability** between two devices, and measure round-trip time.

### Ping uses 2 messages (via ICMP — Internet Control Message Protocol):

| Message | Purpose |
|---------|---------|
| **ICMP Echo Request** | Sent to a specific host, asking "are you reachable?" |
| **ICMP Echo Reply** | Sent back by that host, confirming "yes, I'm here" |

### Key difference from ARP:
- Ping (ICMP) is **always unicast** — sent directly to one specific host.
- This means the sender must **already know the destination's MAC address** before pinging — which is exactly why **ARP runs first**, automatically, behind the scenes.

### The `ping` command:
```
ping 192.168.1.3
```

### Cisco IOS default ping behavior:
- Sends **5** ICMP Echo Requests by default
- Each one is **100 bytes** by default
- **`.`** (period) = failed ping
- **`!`** (exclamation mark) = successful ping

### 🔑 Why does the FIRST ping often fail?
Because the device doesn't yet know the destination's MAC address — it has to pause and run ARP first. That delay causes the first Echo Request to time out/fail. Once ARP completes, subsequent pings succeed normally.

> Example from the video: 4 out of 5 pings succeeded = 80% success rate, with the 1st one failing due to the ARP delay.

---

## 8. Wireshark — Watching the Traffic

**Wireshark** is a tool used to capture and analyze real network traffic packet-by-packet. In the video's example capture, you can see this exact sequence happen in order:

1. **ARP Request** — source = PC1's MAC, destination = broadcast (`FFFF.FFFF.FFFF`), message: *"Who has 192.168.1.3? Tell 192.168.1.1."*
2. **ARP Reply** — source = PC3's MAC, destination = PC1's MAC, message: *"192.168.1.3 is at [PC3's MAC]."*
3. **4x ICMP Echo Request** — source = PC1, destination = PC3
4. **4x ICMP Echo Reply** — source = PC3, destination = PC1

### Ethernet Type field values (recap + new one):
| Hex Value | Protocol |
|-----------|----------|
| `0x0800` | IPv4 |
| `0x86DD` | IPv6 |
| `0x0806` | **ARP** *(new in this lesson)* |

### Padding, seen in Wireshark:
- A **36-byte ping** was sent → since minimum payload is 46 bytes, **10 bytes of padding** were added
- Padding appears as a string of hex zeros (`00`) — each pair of hex digits = 1 byte, so 20 zero-digits = 10 bytes

---

## 9. GNS3 vs Packet Tracer (Just Awareness — Not Heavily Tested)

| Tool | What it is | Cost |
|------|-----------|------|
| **Packet Tracer** | A network *simulator* — imitates how Cisco devices behave | Free |
| **GNS3** | Runs *actual* Cisco IOS software virtually (real, not simulated) | GNS3 itself is free, but you must legally obtain your own copy of Cisco IOS separately (not free) |

> 💡 For the CCNA, **Packet Tracer is sufficient** and what this course primarily uses. GNS3 is more relevant later in your networking career.

---

## 10. The MAC Address Table — Full Breakdown

Command to view it:
```
show mac address-table
```
*(Note: older IOS versions used `show mac-address-table` with an extra hyphen — newer versions dropped it.)*

### Columns in the MAC Address Table:

| Column | Meaning |
|--------|---------|
| **VLAN** | Virtual LAN ID (default = 1). VLANs are covered in a later lesson. |
| **MAC Address** | The learned MAC address |
| **Type** | Usually "dynamic" (learned automatically) — not manually configured |
| **Ports** | Another word for **interface** — which port the MAC address is reachable through |

---

## 11. Clearing the MAC Address Table

Dynamic MAC addresses are normally removed automatically after **5 minutes of inactivity** — this process is called **aging**.

But you can also **manually clear** entries using these commands (all from Privileged EXEC mode):

| Command | Effect |
|---------|--------|
| `clear mac address-table dynamic` | Clears **ALL** dynamic MAC address entries |
| `clear mac address-table dynamic address <mac-address>` | Clears only the entry for **one specific MAC address** |
| `clear mac address-table dynamic interface <interface-id>` | Clears all dynamic entries learned on **one specific interface** |

> ⚠️ Exam tip: Pay close attention to exact command wording and hyphen placement — this was directly tested in the quiz!

---

## 12. Summary Table — New Concepts in This Lesson

| Concept | Key Fact |
|---------|----------|
| Ethernet header (strict definition) | Destination + Source + Type only = 18 bytes (with trailer) |
| Minimum frame size | 64 bytes |
| Minimum payload size | 46 bytes |
| Padding | Added (as zeros) if payload < 46 bytes |
| ARP purpose | Discover MAC address from a known IP address |
| ARP Request | Broadcast (`FFFF.FFFF.FFFF`) |
| ARP Reply | Unicast |
| Ping / ICMP purpose | Test reachability between hosts |
| ICMP Echo Request/Reply | Both unicast |
| Why first ping often fails | ARP resolution delay |
| ARP table view command (Windows/macOS/Linux) | `arp -a` |
| ARP table view command (Cisco IOS) | `show arp` |
| MAC address table view command | `show mac address-table` |
| MAC table columns | VLAN, MAC Address, Type, Ports |
| MAC address aging time | 5 minutes of inactivity |
| Ethernet Type for ARP | `0x0806` |

---

## 13. Practice Quiz (From the Video)

Test yourself first!

1. **You send a 36-byte ping and capture the traffic. You see a series of `00000000` bytes at the end of the Ethernet payload. What are these?**
   A) Pings are naturally a series of zeroes  B) Padding bytes  C) The Ethernet FCS

2. **Which message is sent to ALL hosts on the local network?**
   A) ARP Request  B) ARP Reply  C) ICMP Echo Request  D) ICMP Echo Reply

3. **Which fields appear in the output of `show mac address-table` on a Cisco switch?**
   A) MAC address, ports  B) VLAN, MAC address, ports  C) VLAN, MAC address, type, ports  D) Internet address, physical address, type

4. **Which frame types does a switch send out ALL interfaces except the one it was received on?**
   A) Broadcast and unknown unicast  B) Broadcast and known unicast  C) Known unicast and unknown unicast  D) Broadcast, unknown unicast, and known unicast

5. **Which command clears all dynamic MAC addresses on a specific interface?**
   A) `clear mac address-table interface, interface-id`
   B) `clear mac-address-table dynamic interface, interface-id`
   C) `clear mac-address table dynamic interface, interface-id`
   D) `clear mac address-table dynamic interface, interface-id`

<br>

### ✅ Answers & Explanations

1. **B — Padding bytes.** The minimum Ethernet payload is 46 bytes; a 36-byte ping needs 10 extra padding bytes (all zeros) to meet that minimum.

2. **A — ARP Request.** It must be broadcast because the sender doesn't yet know the destination's Layer 2 (MAC) address. ARP Reply, ICMP Echo Request, and ICMP Echo Reply are all unicast.

3. **C — VLAN, MAC address, type, ports.** (Option D describes the *ARP table* on a Windows PC, not the switch's MAC address table — easy mix-up to watch for!)

4. **A — Broadcast and unknown unicast.** Known unicast frames are never flooded, since the switch already knows exactly which port to use.

5. **D — `clear mac address-table dynamic interface, interface-id`.** Note the correct hyphenation: "mac address-table" (hyphen only between "address" and "table"), not "mac-address-table" or "mac address table."

---

### 💡 Study Tip
The ARP process (Section 5) is essentially "how a device finds a MAC address before it can actually use Layer 2 switching." Try explaining out loud, without looking at your notes, why the ARP Request must be broadcast but the ARP Reply doesn't need to be — that's the core logic tested repeatedly in this section of the CCNA.
