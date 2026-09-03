# CCNA Notes — Lesson 10: The IPv4 Header
*(Based on Jeremy's IT Lab video)*

---

## 1. Where This Fits — Quick Recap of Encapsulation

Recall the PDU (Protocol Data Unit) stages from earlier lessons:

| Layer | PDU Name | What's added |
|---|---|---|
| Upper layers | Data | (raw data) |
| Layer 4 (TCP/UDP) | **Segment** | Layer 4 header added |
| Layer 3 (IP) | **Packet** | Layer 3 header added ← **this lesson's focus** |
| Layer 2 (Ethernet) | Frame | Layer 2 header + trailer added |

> 💡 This lesson zooms into the **Layer 3 (IPv4) header** — the part of a packet that contains everything a router needs to get it to the right destination, a process called **routing**.

Since we're deep in Layer 3 territory here, the video (and these notes) will mostly say **"packet"** rather than "frame."

---

## 2. Briefing: Why This Lesson is "Just" the Header

Unlike previous lessons, this one is **purely conceptual** — no CLI commands, no hands-on configuration. It's building the vocabulary and field-by-field understanding you'll need before the *next* lesson, where you'll actually configure routing on a Cisco router.

> 🔑 You likely won't need to memorize the **exact bit-length of every single field** for the real exam — but understanding **what each field is for** is essential, since routing behavior (TTL, fragmentation, protocol numbers, etc.) comes up constantly later in the course.

---

## 3. The IPv4 Header — Full Field Reference Table

The header is read **left to right, top to bottom** (like reading a book) if you look at an official diagram. Here's every field, in order, with its size and purpose:

| # | Field | Size | Purpose |
|---|---|---|---|
| 1 | **Version** | 4 bits | Identifies IP version — always `4` (binary `0100`) for IPv4 |
| 2 | **IHL** (Internet Header Length) | 4 bits | Length of the header itself, in 4-byte units |
| 3 | **DSCP** | 6 bits | Used for QoS (prioritizing delay-sensitive traffic) |
| 4 | **ECN** | 2 bits | Signals network congestion without dropping packets |
| 5 | **Total Length** | 16 bits | Total size of the packet (header + data), in bytes |
| 6 | **Identification** | 16 bits | Groups fragments belonging to the same original packet |
| 7 | **Flags** | 3 bits | Controls/identifies fragmentation (DF bit, MF bit) |
| 8 | **Fragment Offset** | 13 bits | Position of a fragment within the original packet |
| 9 | **TTL** (Time to Live) | 8 bits | Limits how many router hops a packet can take before being dropped |
| 10 | **Protocol** | 8 bits | Identifies the Layer 4 protocol encapsulated inside (TCP, UDP, etc.) |
| 11 | **Header Checksum** | 16 bits | Error-checking for the IPv4 header only |
| 12 | **Source IP Address** | 32 bits | Sender's IP address |
| 13 | **Destination IP Address** | 32 bits | Receiver's IP address |
| 14 | **Options** | 0–320 bits (variable) | Rarely used, optional extra data |

> 💡 Notice fields 12 and 13 (source/destination IP) are the two you already know well from Lessons 7–8. Everything else here is new.

---

## 4. Field-by-Field Deep Dive

### Version (4 bits)
- IPv4 = `0100` (decimal 4)
- IPv6 = `0110` (decimal 6)
- **Fun fact:** There technically was an "IPv5" — an experimental protocol called **Internet Stream Protocol** — but it was never publicly deployed. So version 5 exists on paper but was "skipped" in practice.

### IHL — Internet Header Length (4 bits)
> Tells you **how long the header is**, since the header's length can vary (because of the optional Options field at the end).

🔑 **Key rule: this field counts in 4-byte increments, NOT bytes directly.**

| IHL value | Calculation | Header length |
|---|---|---|
| Minimum: **5** | 5 × 4 bytes | **20 bytes** (no Options field) |
| Maximum: **15** | 15 × 4 bytes | **60 bytes** (maximum Options field = 40 bytes) |

> 💡 So: **minimum IPv4 header = 20 bytes**, **maximum IPv4 header = 60 bytes**. The extra 40 bytes at maximum all come from the Options field.

### DSCP — Differentiated Services Code Point (6 bits)
- Used for **QoS (Quality of Service)** — prioritizing traffic that's sensitive to delay.
- **Example use case:** A slow-loading webpage is annoying but tolerable. A choppy, freezing video call is a much worse experience. DSCP lets network devices identify and prioritize that time-sensitive traffic.
- *(A full, dedicated QoS lesson comes later in the course — this is just the field's introduction.)*

### ECN — Explicit Congestion Notification (2 bits)
- Normally, when a network is congested/overloaded, routers deal with it by **dropping packets**.
- ECN offers an alternative: it lets devices **signal congestion without dropping any packets** — but only works if **both endpoints AND the network in between** all support it. Otherwise it's simply unused.

### Total Length (16 bits)
> The size of the **entire packet** (header + encapsulated Layer 4 segment) in bytes.

- ⚠️ Different from IHL! IHL = header length only, in 4-byte units. Total Length = whole packet, in actual bytes.
- Minimum value: **20** (a bare header with zero data)
- Maximum value: **65,535 bytes** (the largest possible value for a 16-bit field)

**How we get 65,535:** Adding up all 16 binary place values (1+2+4+8+16+32+64+128+256+512+1024+2048+4096+8192+16384+32768) = 65,535. This follows the exact same binary place-value logic from Lesson 7 — just extended from 8 bits to 16 bits.

### Identification (16 bits)
- Used **only when a packet is fragmented** (split into smaller pieces).
- All fragments belonging to the **same original packet** share the **same Identification value**, so the receiving device knows which pieces belong together for reassembly.
- *(Fragmentation is covered in full detail in Section 5 below.)*

### Flags (3 bits)
Three individual bits, each with a specific job:

| Bit | Name | Meaning |
|---|---|---|
| Bit 0 | Reserved | Always `0` — unused |
| Bit 1 | **DF** (Don't Fragment) | `1` = this packet must NOT be fragmented |
| Bit 2 | **MF** (More Fragments) | `1` = more fragments follow; `0` = this is the last (or only) fragment |

### Fragment Offset (13 bits)
- Indicates **where** a given fragment fits within the original, unfragmented packet.
- This lets fragments be **reassembled correctly even if they arrive out of order** — the receiver uses the offset values to figure out the correct sequence.

### TTL — Time to Live (8 bits)
> **Purpose: prevent packets from looping forever around a network.**

- Every time a packet passes through a **router**, the TTL is **decreased by 1**.
- If TTL reaches **0**, the router **drops the packet**.
- **Why this matters:** if a routing misconfiguration causes a packet to loop endlessly, it would otherwise clog up the network forever. TTL guarantees it eventually gets dropped instead.
- **Historical note:** TTL was originally meant to represent the packet's lifetime *in seconds* — but in practice, it's used as a **hop counter** (1 hop = passing through 1 router).
- **Current recommended default: 64**

### Protocol (8 bits)
> Identifies which **Layer 4 protocol** is encapsulated inside this packet.

Memorize these 4 protocol numbers:

| Protocol Number | Protocol |
|---|---|
| **1** | ICMP (used by ping) |
| **6** | TCP |
| **17** | UDP |
| **89** | OSPF (a dynamic routing protocol, covered later in this course) |

> 💡 TCP and UDP will get their own dedicated lesson soon. For now, just remember the **numbers**.

### Header Checksum (16 bits)
- A calculated value used to detect **errors in the IPv4 header** (and ONLY the header — not the data inside).
- **Process:** the receiving router recalculates the checksum itself and compares it to the value in this field.
  - Match → header is intact, packet proceeds normally
  - Mismatch → an error occurred during transmission → **packet is dropped**

> 🔑 **Important distinction:** IP itself does NOT check for errors in the encapsulated *data* — that job is left to the Layer 4 protocol (TCP or UDP), both of which have their own checksum fields for exactly that purpose.

### Source / Destination IP Address (32 bits each)
Already covered in depth in Lessons 7–8. Quick recap:
- **Source IP** = sender's address
- **Destination IP** = intended receiver's address

### Options (0–320 bits / 0–40 bytes, variable)
- **Rarely used** in practice.
- If the **IHL field is greater than 5**, that tells you Options are present (since 5 = the minimum/no-options value).
- For CCNA purposes, you don't need to memorize the internal structure of this field — just know it exists and why the IHL field matters because of it.

---

## 5. Fragmentation — Explained in Full

This concept spans several fields (Identification, Flags, Fragment Offset, and connects to Total Length), so let's walk through it as one complete story.

### The core problem: MTU
> **MTU (Maximum Transmission Unit)** = the largest size a single frame/packet is allowed to be on a given network. Usually **1,500 bytes**.

*(This connects directly back to Lesson 6, where you learned the maximum Ethernet payload size is 1,500 bytes — same number, same underlying limit!)*

### What happens if data is bigger than the MTU?
The packet must be **split into fragments** — smaller pieces, each with its own complete IPv4 header, sent separately, then reassembled by the **receiving device** once all pieces arrive.

### How the receiver knows how to reassemble the fragments
1. **Identification field** — all fragments from the same original packet share the same value, so the receiver knows which pieces go together.
2. **More Fragments (MF) bit** — set to `1` on every fragment except the very last one (which gets `0`), so the receiver knows when it has everything.
3. **Fragment Offset field** — tells the receiver exactly where each fragment belongs in the original sequence, so it can reassemble them correctly **even if they arrive out of order**.

### The Don't Fragment (DF) bit — a special case
- If DF = `1`, the packet is **not allowed to be fragmented at all**, even if it exceeds the MTU.
- What happens then? If a packet with DF set is too large for the network to handle as-is, it simply **fails to be delivered** — it can't be fragmented, and it's too big to send whole.

---

## 6. Wireshark Walkthrough — Seeing the Header in Real Traffic

The video captures a **ping** (ICMP) between two routers to show these fields "live."

### Example 1: A normal, unfragmented 100-byte ping
| Field | Observed Value | What it confirms |
|---|---|---|
| Version | `0100` | IPv4 |
| Header Length (IHL) | `0101` (=5) | 20-byte header (no options) |
| Differentiated Services (DSCP+ECN) | `0` (both) | Not in use |
| Total Length | `100` bytes | Whole packet including ICMP data |
| Identification | `5` | (would matter if fragmented, but it isn't here) |
| DF bit | Not set | Packet was allowed to fragment (didn't need to) |
| MF bit | Not set | This is a complete, unfragmented packet |
| Fragment Offset | `0` | Expected for an unfragmented packet |
| TTL | `255` (maximum) | Plenty of "hops" allowed |
| Protocol | `1` | ICMP (matches — this was a ping!) |
| Header Checksum | (shown in hex) | Used to verify header integrity |

### Example 2: A large 10,000-byte ping (forces fragmentation)
Command used: `ping 192.168.1.2 size 10000`

Since 10,000 bytes >> 1,500-byte MTU, this packet gets **split into multiple fragments**:

| Field | Observed in first fragments |
|---|---|
| Total Length | `1500` bytes each (= the MTU size) |
| Identification | Same value across all fragments of this packet (e.g., `1`) |
| MF bit | Set to `1` on all fragments except the very last |
| Fragment Offset | Different for each fragment (first fragment = `0`) |

> 💡 Wireshark even labels these fragments as "reassembled in [packet #]" — pointing you to which final, reassembled ICMP packet they belong to.

### Example 3: Setting the DF bit and exceeding the MTU
- With a normal-sized ping (default 100 bytes) + DF bit set → no problem, since it's well under the MTU anyway.
- But sending a **large** ping (bigger than MTU) **with DF set** → the ping **fails**, since it's too big to send as one piece, and not allowed to be split into fragments either.

---

## 7. Summary Table — Key Concepts from This Lesson

| Concept | Key Fact |
|---|---|
| IPv4 header minimum length | 20 bytes (IHL = 5) |
| IPv4 header maximum length | 60 bytes (IHL = 15, with 40 bytes of Options) |
| Total Length field max value | 65,535 bytes |
| MTU (typical) | 1,500 bytes |
| TTL default (recommended) | 64 |
| TTL purpose | Prevents infinite routing loops; decremented by 1 per router hop |
| Protocol numbers to memorize | 1 = ICMP, 6 = TCP, 17 = UDP, 89 = OSPF |
| Header Checksum checks | Only the IPv4 header — NOT the encapsulated data |
| Data error-checking done by | The Layer 4 protocol (TCP/UDP), via their own checksums |
| DF bit | Prevents fragmentation — oversized packets with DF set simply fail to send |
| MF bit | Set to 1 on all fragments except the last |
| Fragment Offset | Lets receiver reassemble fragments in correct order, even if out of order |
| Identification field | Groups fragments that belong to the same original packet |

---

## 8. Practice Quiz (From the Video)

Test yourself first!

1. **What is the fixed binary value of the first field of an IPv4 header?**
   A) 0010  B) 0110  C) 0001  D) 0100

2. **Which field will cause the packet to be dropped if it has a value of zero?**
   A) TTL  B) DSCP  C) IHL  D) ECN

3. **How are errors in an IPv4 packet's encapsulated data detected?**
   A) The IPv4 header checksum field checks for errors  B) The encapsulated protocol (e.g., TCP or UDP) checks for errors  C) Errors in the encapsulated data cannot be detected

4. **Which field of an IPv4 header is variable in length?**
   A) Options  B) Header Checksum  C) Total Length  D) IHL

5. **Which bit will be set to one on all IPv4 packet fragments except the last fragment?**
   A) Fragment offset bit  B) More fragments bit  C) Don't fragment bit  D) Packet fragment bit

<br>

### ✅ Answers & Explanations

1. **D — `0100`.** This is the Version field, and since we're specifically talking about an IPv4 header, it's always 4 in decimal (`0100` in binary).

2. **A — TTL.** Time to Live is decremented by 1 at every router hop; once it hits 0, the packet is dropped — this is what prevents infinite routing loops.

3. **B — The encapsulated protocol checks for errors.** The IPv4 header checksum ONLY verifies the header itself. Data integrity checking is handled by the Layer 4 protocol (TCP or UDP), which has its own separate checksum for that purpose.

4. **A — Options.** This is the only field that varies from 0 to 320 bits. Total Length and IHL *represent* variable lengths (of the packet/header), but the fields themselves are always a fixed size (16 bits and 4 bits respectively).

5. **B — More Fragments bit.** Set to 1 on every fragment except the final one, which is set to 0 to signal "reassembly complete." Fragment offset (A) is a 13-bit positional field, not a single flag bit. Don't Fragment (C) does something different — it prevents fragmentation altogether. "Packet fragment bit" (D) isn't a real field.

---

### 💡 Study Tip
This lesson is dense with field names and bit-lengths, which can feel overwhelming at first. Rather than trying to memorize every single bit count, focus on being able to answer: **"What problem does this field solve?"** for each one — TTL solves infinite loops, fragmentation fields solve oversized packets, checksum solves header corruption, protocol field solves "what's inside this packet," etc. The Anki flashcards mentioned in the video are genuinely useful here for locking in the smaller factual details once you understand the *why* behind each field.
