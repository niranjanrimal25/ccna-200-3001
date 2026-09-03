# CCNA Notes — Lesson 5: Ethernet LAN Switching (Part 1)
*(Based on Jeremy's IT Lab video)*

---

## 1. Quick Review: OSI Layers 1 & 2

Before diving into switching, recall two layers from earlier lessons:

| Layer | Name | What it does |
|-------|------|---------------|
| **Layer 1** | Physical | Defines the physical stuff — voltage, cable types, max distances, connectors (e.g., RJ45, UTP cables). Converts bits into electrical/radio signals. |
| **Layer 2** | Data Link | Provides **node-to-node** connectivity (PC↔switch, switch↔router, etc.). Formats data for transmission, detects/corrects Layer 1 errors, uses its own addressing (separate from IP). |

📌 **Switches operate at Layer 2.**
📌 **Ethernet** = combination of Layer 1 (cables, signals) + Layer 2 (frames, MAC addresses).
📌 This lesson focuses on the **Layer 2** side of Ethernet.

---

## 2. What is a LAN (Local Area Network)?

- A network contained in a small area (e.g., an office floor, a home).
- **Routers** are what separate/connect different LANs.
- **Switches do NOT separate LANs** — adding more switches just *expands* an existing LAN.

### Key takeaway from the examples in the video:
- Multiple switches **connected to each other**, feeding into **one** router interface = **still just ONE LAN**.
- Switches connected to **different** router interfaces = **separate LANs**, even if the setup looks identical otherwise.

> 💡 Rule of thumb: **What separates LANs is the router interface, not the switch.**

This lesson only covers traffic *within* a single LAN (e.g., PC to PC through switches). Traffic *between* LANs is covered in a later lesson.

---

## 3. Encapsulation Review (PDUs)

As data moves down the OSI layers to be sent over a network, it gets wrapped in headers at each stage. These stages are called **PDUs (Protocol Data Units)**:

| Layer | Name of PDU | What's added |
|-------|------------|----------------|
| Upper layers | **Data** | (raw data, no networking header yet) |
| Layer 4 | **Segment** | Layer 4 header added |
| Layer 3 | **Packet** | Layer 3 header added |
| Layer 2 | **Frame** | Layer 2 header **and trailer** added |

📌 This lesson is all about **frames** — specifically **Ethernet frames**, since Ethernet is the Layer 2 protocol used in nearly every LAN today.

---

## 4. The Ethernet Frame — Structure

An Ethernet frame = **Header + Encapsulated Packet + Trailer**

### Header Fields (5 total):

| Field | Size | Purpose |
|-------|------|---------|
| **Preamble** | 7 bytes | Series of alternating 1s/0s (`10101010` × 7). Helps the receiver sync its clock to prepare for incoming data. |
| **SFD** (Start Frame Delimiter) | 1 byte | Pattern `10101011`. Signals "preamble is over, real frame starts now." |
| **Destination MAC Address** | 6 bytes | Layer 2 address of where the frame is going |
| **Source MAC Address** | 6 bytes | Layer 2 address of who sent the frame |
| **Type / Length** | 2 bytes | Either the length of the encapsulated packet, OR the type of Layer 3 protocol used (see below) |

### Trailer Field (1 total):

| Field | Size | Purpose |
|-------|------|---------|
| **FCS** (Frame Check Sequence) | 4 bytes | Used to detect transmission errors, via a **CRC (Cyclic Redundancy Check)** algorithm |

### 📏 Total header + trailer size = **26 bytes**
(7+1+6+6+2 header bytes + 4 trailer bytes = 26)

> 💡 Memorize these field sizes — they show up on the exam!

---

## 5. Understanding the Type/Length Field

This one field does **double duty**, depending on its value:

- **Value ≤ 1500** → interpreted as the **LENGTH** of the encapsulated packet (in bytes)
- **Value ≥ 1536** → interpreted as the **TYPE** of encapsulated protocol

### Common Type values (in hexadecimal):

| Hex Value | Decimal Value | Meaning |
|-----------|---------------|---------|
| `0x0800` | 2048 | IPv4 packet |
| `0x86DD` | 34525 | IPv6 packet |

*(The `0x` prefix just means "this number is written in hexadecimal.")*

---

## 6. Frame Check Sequence (FCS) — Detail

- 4 bytes / 32 bits long
- Uses a **CRC (Cyclic Redundancy Check)** to detect corrupted/errored data
- Breaking down the term:
  - **Cyclic** = refers to "cyclic codes" (the math behind it — don't worry about details)
  - **Redundancy** = these bytes add no new *information*, just extra data used for verification
  - **Check** = it checks/verifies the received data for errors

> 💡 For the exam, just remember: **FCS uses CRC to detect errors.**

---

## 7. MAC Addresses — Deep Dive

### What is a MAC Address?
- **MAC** = Media Access Control
- A **6-byte (48-bit)** physical address assigned to a device **when it's manufactured**
- Also called a **BIA (Burned-In Address)** — because it's "burned in" at the factory
- **Different from an IP address** (which you configure manually later; IP = logical address, MAC = physical address)
- **Globally unique** — no two devices in the world should share a MAC address
  *(Exception: "locally-unique" MAC addresses exist, but this is rare — assume globally unique for the CCNA)*

### Structure of a MAC Address:
A MAC address is 12 hexadecimal digits, split into two halves:

| Half | Size | Meaning |
|------|------|---------|
| First half | 3 bytes | **OUI** (Organizationally Unique Identifier) — identifies the manufacturer (e.g., Cisco) |
| Second half | 3 bytes | Unique identifier for that specific device |

**Example format:** `AAAA.AA00.0001` (written in groups of 4 hex digits, separated by dots — this is Cisco's preferred style. You may also see it written every 2 digits, like `AA:AA:AA:00:00:01`)

---

## 8. Hexadecimal Basics (Beginner Explanation)

### Quick Refresher: How Decimal Works
- Decimal (base 10) uses digits **0–9**.
- Once you hit 9, you add a new column (the "10s" column) → 10, 11, 12...
- Once both the 1s and 10s columns max out at 99, you add a "100s" column → 100, 101...

### How Hexadecimal Works
- Hexadecimal (base 16) uses **16 digits**: `0,1,2,3,4,5,6,7,8,9, A,B,C,D,E,F`
- The letters represent numbers **beyond 9**:

| Hex | A | B | C | D | E | F |
|-----|---|---|---|---|---|---|
| Decimal | 10 | 11 | 12 | 13 | 14 | 15 |

### Counting Past F
Once you hit `F` (15 in decimal), the next number isn't "10" in the normal sense — it's **hex 10**, which equals **decimal 16**.

| Hexadecimal | Decimal |
|-------------|---------|
| F | 15 |
| 10 | 16 |
| 11 | 17 |
| 12 | 18 |
| 1A | 26 |

> 💡 You'll use hexadecimal a lot more when studying **IPv6** later — for now, just get comfortable with the *concept* that hex has 16 digits instead of 10.

---

## 9. How Switches Learn & Forward Frames (THE MOST IMPORTANT PART)

This is the core concept of the lesson. Let's walk through it step-by-step.

### Key Terms You Must Know:

| Term | Meaning |
|------|---------|
| **Unicast frame** | A frame sent to a single, specific destination device |
| **Known unicast frame** | Destination MAC address **IS** already in the switch's MAC address table |
| **Unknown unicast frame** | Destination MAC address is **NOT** in the switch's MAC address table |
| **Flooding** | Sending a copy of the frame out of **every interface EXCEPT the one it arrived on** |
| **Dynamic MAC address** | A MAC address the switch learned automatically (not manually configured) |
| **MAC Address Table** | A table the switch keeps, mapping MAC addresses to the interface used to reach them |

### The Process (Step-by-Step Example: PC1 sends data to PC2, through Switch SW1)

**Step 1 — PC1 sends a frame to PC2**
- Frame has: Source MAC = PC1, Destination MAC = PC2

**Step 2 — Switch receives the frame and "learns" the source**
- SW1 looks at the **source MAC address** field
- It adds an entry: *"PC1's MAC address → reachable via interface F0/1"* (the interface the frame came in on)
- This is a **dynamically learned MAC address**

**Step 3 — Switch checks if it knows the destination**
- SW1 looks for PC2's MAC address in its table
- If PC2 is **not found** → this is an **unknown unicast frame**

**Step 4 — Switch floods the frame**
- Since it doesn't know where PC2 is, SW1 **floods** the frame out of **all interfaces except the one it arrived on**
- Other PCs receiving the flood (like PC3) check the destination MAC — if it doesn't match their own, they **drop the frame**
- PC2 receives it, sees the destination MAC matches its own, and **processes the frame**

**Step 5 — PC2 replies (optional, but shows the learning continue)**
- PC2 sends a frame back to PC1 (source/destination MACs now reversed)
- SW1 receives it, and **now learns PC2's MAC address too** (adds it to the table)
- This time, since PC1's MAC is already known, SW1 does **NOT flood** — it sends the frame directly out the correct interface (**known unicast**)

### 🔑 Golden Rule to Remember:
> **Switches use the SOURCE MAC address of incoming frames to build their MAC address table.**
> **Switches use the DESTINATION MAC address to decide where to forward the frame (or whether to flood it).**

---

## 10. Flooding Across Multiple Switches

The video also shows this same process working across **two connected switches** (SW1 and SW2):

- Each switch independently learns MAC addresses **based on frames it personally receives** — they don't automatically share their tables.
- If SW1 floods a frame to SW2, and SW2 also doesn't know the destination, **SW2 floods it too** (out all ports except the one it came in on).
- Important nuance: When a switch logs an interface in its MAC table, it **doesn't necessarily mean the device is directly connected there** — it just means "this is the direction to send frames to reach that MAC address."

---

## 11. Dynamic MAC Address Timeout

- On Cisco switches, **dynamically learned MAC addresses are removed after 5 minutes of inactivity**.
- If the device sends traffic again after being removed, the switch will simply **re-learn** it.

> 💡 This keeps the MAC address table clean and prevents it from filling up with outdated/inactive entries.

---

## 12. Summary Table — Key Concepts from This Lesson

| Concept | Key Fact |
|---------|----------|
| LAN boundary | Defined by router interfaces, NOT switches |
| PDU at Layer 2 | Frame |
| Ethernet frame total size (header+trailer) | 26 bytes |
| Preamble | 7 bytes, syncs receiver clock |
| SFD | 1 byte, marks end of preamble |
| MAC address size | 48 bits / 6 bytes |
| OUI | First 3 bytes of MAC = manufacturer ID |
| FCS | 4 bytes, uses CRC to detect errors |
| Type field values | 0x0800 = IPv4, 0x86DD = IPv6 |
| MAC table built from | Source MAC address of received frames |
| Forwarding decision based on | Destination MAC address |
| Unknown unicast | Destination not in MAC table → frame is flooded |
| Known unicast | Destination in MAC table → frame is forwarded directly |
| Dynamic MAC address timeout | 5 minutes of inactivity |

---

## 13. Practice Quiz (From the Video)

Test yourself before checking the answers below!

1. **Which field of an Ethernet frame provides receiver clock synchronization?**
   A) Preamble  B) SFD  C) Type  D) FCS

2. **How long is the physical address (MAC address) of a network device?**
   A) 32 bytes  B) 32 bits  C) 48 bytes  D) 48 bits

3. **What is the OUI of this MAC address: `E8BA.7011.2874`?**
   A) E8BA  B) E8BA.70  C) 7011  D) E8BA.7011

4. **Which field does a switch use to populate its MAC address table?**
   A) Preamble  B) Length  C) Source MAC Address  D) Destination MAC Address

5. **What kind of frame does a switch flood out of all interfaces except the one it was received on?**
   A) Unknown unicast  B) Known unicast  C) Allcast

<br>

### ✅ Answers & Explanations

1. **A — Preamble.** It's the alternating 1s/0s pattern that lets the receiver sync its clock. (SFD marks the end of the preamble; Type indicates protocol; FCS detects errors — none of these do clock sync.)

2. **D — 48 bits.** Not bytes! (48 bytes would be 384 bits — way too big.) Fun fact: an IP address is 32 bits, for comparison.

3. **B — E8BA.70.** The OUI is the **first 24 bits (3 bytes)** of the MAC address — here, that's `E8BA.70`.

4. **C — Source MAC Address.** The switch uses the source address to learn "this device can be reached via this interface." (Destination MAC is used for forwarding decisions, not learning.)

5. **A — Unknown unicast.** Since the switch doesn't know where to send it, its only option is to flood it everywhere except where it came from. Known unicast frames go directly to the correct port. "Allcast" isn't a real term.

---

### 💡 Study Tip
The switch learning/flooding process (Section 9) is the heart of this lesson and will come up again and again in later topics (like STP, VLANs, etc.). Make sure you can explain, in your own words, the difference between how a switch **learns** (via source MAC) versus how it **forwards** (via destination MAC) — that distinction is tested constantly on the real exam.
