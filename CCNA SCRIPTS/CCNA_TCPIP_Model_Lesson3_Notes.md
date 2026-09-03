# CCNA Notes — The TCP/IP Model (and the OSI Model)
*(Based on Jeremy's IT Lab video)*

---

## 1. Briefing: Why This Lesson Matters So Much

This is one of the most important lessons in the entire course — it's the **framework** everything else gets slotted into. Once you learn IP addressing, switching, routing, TCP/UDP, etc., you'll constantly refer back to "which layer" a concept belongs to.

> 💡 **Good news:** there isn't much to *memorize* here. It's a big-picture framework. Focus on understanding the *relationships* between layers, not memorizing every detail — you'll revisit this constantly throughout the course.

---

## 2. Why Protocols and Standards Exist

> **Protocol** = a set of rules defining how data should be communicated between devices on a network. Protocols are essentially "languages" computers use to talk to each other.

### The historical problem: proprietary protocols
In early networking, protocols were often built by a single vendor (e.g., IBM) for their own products only. This meant devices from **different vendors couldn't talk to each other** — like two people who only speak different languages.

### The solution: standards
> **Standard** = an agreed-upon specification describing how a protocol/technology should work, so that **any vendor** can implement it and remain compatible with everyone else.

This is why, today, a MacBook can browse a website hosted on a Linux server, or a Windows PC can email an Android phone — because everyone follows the **same open standards**.

---

## 3. A Brief History of TCP/IP

| Year | Event |
|---|---|
| 1960s | Early US networking research begins |
| 1969 | **ARPANET** goes online (funded by the US Department of Defense's ARPA), connecting university/lab mainframes — originally used a protocol called **NCP** (Network Control Program), NOT TCP/IP |
| 1974 | **Vint Cerf** and **Bob Kahn** begin developing **TCP** (Transmission Control *Program*, at the time) |
| — | TCP is later split into two separate protocols: **TCP** (Transmission Control *Protocol*) and **IP** (Internet Protocol) |
| Jan 1, 1983 | ARPANET fully switches over to **TCP/IP** |

> 🔑 **Why TCP/IP won out over other proprietary systems:** it was published as a set of **open standards** any vendor could implement, and it could run over many different types of underlying networks.

---

## 4. Who Actually Creates These Standards?

Two major standards organizations matter for CCNA:

| Organization | Full Name | What they define |
|---|---|---|
| **IEEE** | Institute of Electrical and Electronics Engineers | Local network technologies — **Ethernet (802.3)**, **Wi-Fi (802.11)**. Covers both physical specs (cable types, radio frequencies) and message formatting. |
| **IETF** | Internet Engineering Task Force | Many core internet protocols — **TCP, IP, UDP, HTTP, DNS**, etc. Publishes standards as **RFCs** (Request for Comments) — freely available documents online. |

> 💡 You already met the IEEE in Lesson 2 (802.3 Ethernet cable standards) — now you know the other major player (IETF) too. Vendors like Cisco then **implement** these standards in their actual products.

Since there are *many* different protocols, each solving a different piece of the communication puzzle, it helps to **group them into layers** — which brings us to the main topic of this lesson.

---

## 5. Introducing the Layered Model — Why Layers?

Networks perform many different jobs when moving data: physical signal transmission, local delivery within a LAN, routing between networks, maintaining conversations between applications, and the applications themselves.

> A **layered model** groups these related jobs together. Each layer:
> - Has a specific role
> - **Uses the services of the layer below it**
> - **Provides services to the layer above it**

Protocols generally live at one specific layer (though the lines can occasionally blur). A group of protocols working together across these layers is often called a **network stack** or **protocol stack**.

---

## 6. The Original 4-Layer Model (From RFC 791)

RFC 791 (which defines IP, published in 1981 and still the current standard today!) describes a 4-layer stack:

| Layer | Example Protocols |
|---|---|
| **Application** | Telnet, FTP, TFTP |
| **Transport** | TCP, UDP |
| **Internet** | IP (v4 and v6) |
| **Link** | Ethernet, Wi-Fi |

> 🔑 **Important clarification:** "Internet" here doesn't just mean *the* public Internet you're using to watch this — it refers to an **inter-network**: multiple networks connected together. That's the actual job of this layer.

> 💡 The model is a **description, not a law** — different courses/textbooks use 4-layer, 5-layer, or other variations. This course uses a **5-layer model** built on top of this foundation.

---

## 7. The Mail Analogy — Building Intuition Before the Real Model

*(A useful mental model, not something to memorize by name — it's just scaffolding.)*

Imagine sending a letter to your friend Bob, who lives in another city, via the postal service.

### The journey:
1. You write a **letter** (the actual message content) addressed **to Bob**.
2. You place it in an **envelope** addressed to **Bob's house**.
3. You drive it to **Post Office A** (your car's destination — different from the envelope's destination!).
4. Post Office A puts it on a truck heading to **Post Office B**.
5. Post Office B puts it on another truck heading to **Bob's house**.
6. The envelope arrives, is opened, and Bob reads the letter.

### 🔑 Key insight: Different parts have different destinations at each step
- Your **car's** destination = Post Office A
- The **envelope's** destination = Bob's house
- The **letter's** destination = Bob himself

These destinations **don't change** even as the vehicle carrying them changes multiple times along the route. This is exactly the same principle behind network encapsulation, which we'll get to shortly.

### Turning this into a 5-layer analogy model:
| Analogy Layer | What it represents |
|---|---|
| **Content layer** | The text of the letter itself (what you want to say) |
| **Recipient layer** | The "To: Bob" part — who inside the house should read it |
| **Address layer** | The destination address of the house |
| **Local delivery layer** | Moving the envelope one step at a time (car → truck → truck) |
| **Infrastructure layer** | The roads/paths the vehicles travel on |

### Why layers matter: separation of concerns
- The **content layer** doesn't change throughout the journey (the letter's text stays the same).
- The **recipient** and **address** layers also stay constant the whole trip.
- The **local delivery layer** changes at every stop (car, then truck, then truck).
- The **infrastructure layer** could be roads, could be air routes, could be shipping lanes — it can vary without affecting the letter's content or addressing at all.

> 🔑 **The core lesson:** Each layer focuses on its own job. Changing something in one layer (like the delivery path) doesn't require changing anything in another layer (like the letter's content). This separation is what makes the whole system flexible and modular — and it's exactly how real networks work too.

---

## 8. The Real 5-Layer TCP/IP Model

Mapping the mail analogy onto real networking terms:

| Mail Analogy Layer | → | TCP/IP Layer |
|---|---|---|
| Content layer | → | **Application layer** |
| Recipient layer | → | **Transport layer** |
| Address layer | → | **Internet layer** |
| Local delivery layer | → | **Local Network layer** |
| Infrastructure layer | → | **Physical layer** |

### The 5 layers (top to bottom):
1. **Application** (Layer 5 in this model, though often called Layer 7 — explained later)
2. **Transport** (Layer 4)
3. **Internet** (Layer 3)
4. **Local Network** (Layer 2)
5. **Physical** (Layer 1)

---

## 9. Walking Through a Real Example — PC1 Requesting a Webpage from Server1

### The setup:
```
PC1 --- SW1 --- R1 --- R2 --- SW2 --- Server1
```
- **PC1** = client running a web browser (e.g., Chrome)
- **Server1** = runs both a **web server** process and a **file server** process
- **R1, R2** = routers connecting the two LANs
- **SW1, SW2** = switches connecting PC1/Server1 to their respective routers

PC1's user wants to load a webpage hosted on Server1. Let's trace this request through all 5 layers, bottom-up in terms of **problems solved**, top-down in terms of **actual layer order**.

### Layer 5 — Application Layer
> **Job:** Create and interpret the actual data/message. Handles communication between application *processes*.

Chrome (on PC1) needs to send a request to the web server process (on Server1). This is where the actual HTTP request gets created.

**Problem this layer solves:** *What* message are we sending, and in what format?

---

### Layer 4 — Transport Layer
> **Job:** Provide end-to-end communication between specific application *processes*, using **port numbers**.

**The problem:** Server1 is running multiple processes (a web server AND a file server). How does PC1 make sure its request reaches the *correct* process?

**The solution:** Each process has an associated **port number**:
- Web server → **port 80**
- File server → **port 21**

PC1 addresses its message to **port 80** to reach the web server specifically.

> 🔑 **Don't confuse this "port" with the physical RJ-45 ports from Lesson 2!** A transport-layer port is just a **number** used to identify a specific process/service running on a host — nothing physical about it.

---

### Layer 3 — Internet Layer
> **Job:** Provide end-to-end communication between **hosts** (not processes — whole devices), using **IP addresses** and **routers**.

**The problem:** Even if the message is addressed to the right port, we still need to make sure it actually reaches **Server1** in the first place (out of potentially many devices on the network).

**The solution:** Server1 has an IP address — e.g., `10.1.1.1`. By addressing the message to this IP address, PC1 tells the routers along the path exactly which host the message should ultimately reach.

> 💡 **Memory hook: Internet layer = IP addresses + routers.**

---

### Layer 2 — Local Network Layer
> **Job:** Provide **hop-to-hop** delivery within a local network, using **MAC addresses** and **switches**.

**The problem:** There are multiple devices between PC1 and Server1 (routers, switches). The message needs to be properly handed off between each of them, one local "hop" at a time.

**The solution:** At Layer 2, Ethernet (or Wi-Fi) protocols move the frame from device to device:
- PC1 → R1 (via SW1)
- R1 → R2
- R2 → Server1 (via SW2)

> 💡 **Memory hook: Local Network layer = MAC addresses + switches.**

*(Switches themselves aren't "hops" — more on this in Section 10 below.)*

---

### Layer 1 — Physical Layer
> **Job:** Send bits as actual electrical, optical, or radio **signals** over the physical medium.

This is all the cables (UTP, fiber) and the transceivers/NICs (network interface cards) that transmit and receive raw signals. Electrical signals over copper, optical signals over fiber, radio signals over Wi-Fi.

> 💡 This connects directly back to **Lesson 2** — everything about UTP cables, fiber-optic cables, and connectors lives here at Layer 1.

---

## 10. Layer-by-Layer Deep Dive (Bottom-Up)

### Layer 1 — Physical Layer
- Also just called **"Layer 1"**
- Responsible for sending/receiving **bits** as signals (electrical, optical, radio) over the medium
- Defines: cables, connectors, signal levels, link speeds — all the *physical* aspects
- Examples: UTP cables, fiber-optic cables, Wi-Fi radios/antennas, **NICs** (Network Interface Cards)

> 💡 In some models, Layer 1 and Layer 2 get combined — but this course keeps them separate, since Layer 1 deals with purely *physical* concerns, while Layer 2 deals with *logical* addressing (MAC addresses).

### Layer 2 — Local Network Layer
- Provides **hop-to-hop** delivery on a local network

**🔑 What is a "hop"?**
> A hop = one step along the path, from one router or host to the next router or host.

In the PC1 → Server1 example: PC1→R1 (hop 1), R1→R2 (hop 2), R2→Server1 (hop 3) = **3 hops total**.

> ⚠️ **Switches do NOT count as hops!** A switch simply *extends* the local network, letting multiple devices join the same LAN — it doesn't represent a new network segment the way a router does.

- Uses **MAC addresses** to identify specific interfaces. Every device connected to a LAN has a unique MAC address per interface.
- Example: PC1 sends its message to the MAC address of R1's specific interface (e.g., labeled `G1` for GigabitEthernet1) — that's the exact NIC that will receive it.
- **Key protocols to know for CCNA:** Ethernet and Wi-Fi

### Layer 3 — Internet Layer
- Provides **end-to-end** delivery between hosts, across **multiple networks**
- "End-to-end" means: it focuses on getting the message from the original source **all the way** to the final destination — not worrying about each individual hop along the way (that's Layer 2's job)
- Uses **IP addresses** to identify hosts (like a home address)
- **Routers operate mainly at this layer**, using the destination IP address to decide where to forward the message next
- **Key protocols to know:** IPv4, IPv6, ICMP (Internet Control Message Protocol — the protocol behind `ping`)

### Layer 4 — Transport Layer
- Provides **end-to-end communication between application processes** (also called process-to-process or service-to-service communication)
- **Why needed:** a single host can run multiple services at once (e.g., Server1 runs both a web server and file server) — Layer 4 uses **port numbers** to make sure data reaches the *correct* service
- Example: web request → port 80. File server request → port 21.
- 🔑 **Layer 4 runs mainly on the communicating hosts themselves** (PC1 and Server1) — routers typically operate based on Layer 3 info, NOT Layer 4 (there are exceptions, covered later in the course)
- **Key protocols:** TCP and UDP (each with different features/behaviors, covered in a dedicated future lesson)

### Layer 5 — Application Layer
- Where network communication **meets actual applications**
- ⚠️ **Naming note:** this layer is usually called **"Layer 7"** in other common models — explained in Section 12 below (OSI model comparison)
- Defines how application processes **format, send, and interpret** data
- Example: Chrome uses **HTTP** to format and send its request; that same protocol also tells the web server how to interpret what it receives
- **Key protocols:** HTTP/HTTPS (web browsing), FTP/TFTP (file transfer), email protocols, etc.
- 🔑 **Routers and switches generally don't care about Layer 5 details** — that's "too high level" for them. Only the actual communicating hosts (PC1, Server1) interpret application-layer data.

---

## 11. Encapsulation and Decapsulation

Now let's see how a single message actually carries information from **all 5 layers at once**.

### Encapsulation (sending side)
As data moves **down** the stack, each layer **adds its own header** (containing the info that layer needs — addresses, port numbers, etc.):

| Step | Layer | Action |
|---|---|---|
| 1 | Application | Prepares the raw data (e.g., an HTTP request) |
| 2 | Transport | Adds a Layer 4 header (source/destination **port numbers**) |
| 3 | Internet | Adds a Layer 3 header (source/destination **IP addresses**) |
| 4 | Local Network | Adds a Layer 2 header **AND trailer** (the trailer is used for error-checking — you saw this exact concept as the FCS/CRC in Lesson 5!) |
| 5 | Physical | Transmits the resulting bits as actual signals over the medium |

> 🔑 The Layer 2 header is transmitted first, and the Layer 2 trailer is transmitted last — the whole thing goes out as one continuous stream of bits.

### Decapsulation (receiving side) — the exact reverse process
| Step | Layer | Action |
|---|---|---|
| 1 | Physical | Receives the raw bits, passes them up |
| 2 | Local Network | Examines and **removes** the Layer 2 header/trailer |
| 3 | Internet | Examines and **removes** the Layer 3 header |
| 4 | Transport | Examines and **removes** the Layer 4 header |
| 5 | Application | Final data is delivered and processed by the actual application |

> 💡 If a response is needed, the whole process repeats in reverse — the response goes back **down** the receiving host's stack, across the wire, and back **up** the original host's stack.

**Each device has its own independent network stack.** In a real network, intermediate devices (switches, routers) add more steps to this journey (similar to the multiple post offices in the mail analogy) — but the fundamental flow (down one stack, across the wire, up the other stack) stays the same.

---

## 12. PDU Names — What to Call the Message at Each Stage

> **PDU = Protocol Data Unit** — the name for the message at a specific stage of encapsulation.

| Layer | PDU Name |
|---|---|
| Layer 4 (Transport) | **Segment** (if using TCP) or **Datagram** (if using UDP) |
| Layer 3 (Internet) | **Packet** |
| Layer 2 (Local Network) | **Frame** |

> 🔑 **Critical distinction: TCP creates segments, UDP creates datagrams.** This reflects how the two protocols treat data differently (details come in a dedicated TCP/UDP lesson later).

### Alternative naming convention: "L_ PDU"
| Term | Alternative |
|---|---|
| Segment/Datagram | **L4 PDU** |
| Packet | **L3 PDU** |
| Frame | **L2 PDU** |

> 💡 **Both naming styles are common — know both** for the exam and for real-world conversations with other engineers.

### 🔑 Important: You will NEVER see a "packet," "segment," or "datagram" traveling over the wire by itself
They're always sent **inside a frame**. A frame is what's *actually* transmitted physically — packets/segments/datagrams are just names for the message at earlier stages of encapsulation, before the final Layer 2 wrapping is added.

---

## 13. What is a "Payload"?

> **Payload** = everything encapsulated *inside* a PDU, **NOT including that layer's own header/trailer**.

| At this layer... | ...the payload is: |
|---|---|
| Layer 4 (Segment/Datagram) | The application data itself |
| Layer 3 (Packet) | The segment/datagram, **including** its Layer 4 header |
| Layer 2 (Frame) | The packet, **including** its Layer 3 AND Layer 4 headers |

> 💡 Simple way to remember: **the payload is everything "inside" the current layer's own wrapper** — it includes all the headers added by layers *above* the current one, but never the current layer's own header/trailer.

---

## 14. Adjacent Layer Interaction vs. Same Layer Interaction

Two important concepts describing how layers cooperate:

### Adjacent Layer Interaction (within ONE device)
> Each layer provides a **service** to the layer directly above it, and is serviced by the layer directly below it.

| Layer | Service it provides to the layer above |
|---|---|
| Layer 4 → Layer 5 | Delivers data to the correct **application**, using port numbers |
| Layer 3 → Layer 4 | Delivers segments/datagrams to the correct **destination host**, using IP addresses |
| Layer 2 → Layer 3 | Delivers packets to the **next hop**, using MAC addresses |
| Layer 1 → Layer 2 | Sends/receives the frame's bits as physical signals |

### Same Layer Interaction (BETWEEN two devices)
> Each layer effectively "communicates" with the **same layer** on the other device.

| Layer | What it's addressed to (on the other device) |
|---|---|
| Application layer ↔ Application layer | (conceptually communicating directly) |
| Transport layer ↔ Transport layer | Layer 4 **port number** of the destination |
| Internet layer ↔ Internet layer | Layer 3 **IP address** of the destination |
| Local Network layer ↔ Local Network layer | Layer 2 **MAC address** of the next hop |
| Physical layer ↔ Physical layer | Signals sent out one physical port, received by the port on the connected device |

> 🔑 **This layered cooperation — both within a single device (adjacent layer interaction) and between devices (same layer interaction) — is what actually makes network communication work.**

---

## 15. Why Layering Is Powerful: Modularity

Because each layer is independent and only needs to honor its "contract" with the layers directly above/below it, you can **swap protocols** at one layer without needing to redesign everything else.

### Examples:
- Swap **HTTP + TCP** (loading a webpage) for **TFTP + UDP** (a file transfer) — the lower layers (IP, Ethernet) don't need to change at all.
- Swap a **wired Ethernet connection** for a **wireless Wi-Fi connection** — Layers 1 and 2 change, but the upper layers (Transport, Internet, Application) are completely unaffected.

> 💡 This flexibility — being able to improve or replace protocols at one layer without redesigning the whole system — is one of the biggest benefits of a layered model.

---

## 16. The OSI Model — How It Compares

### A bit of history
- TCP/IP development started in the 1970s (ARPANET).
- In the late 1970s–1980s, the **ISO** (International Organization for Standardization) designed a **7-layer model called OSI** (Open Systems Interconnection), hoping to create a unified, vendor-neutral standard — potentially even *replacing* TCP/IP.
- Many governments (including the US) initially promoted OSI as the preferred approach.

### Why OSI didn't "win"
- OSI protocols were developed **too late** and were considered **too complex**.
- The development approach was very **top-down** (committees designed detailed specs, vendors had to implement exactly as specified) — versus TCP/IP's more **bottom-up**, practical approach.
- **Result: TCP/IP won in the real world.** Nearly all networks today run TCP/IP.

> 💡 However, the **7-layer OSI model survives** as a widely used **reference and teaching model** — even though the actual OSI protocols themselves aren't in common use.

### The 7 Layers of OSI (top to bottom):
1. Application
2. Presentation
3. Session
4. Transport
5. Network
6. Data Link
7. Physical

---

## 17. The "Hybrid" 5-Layer Model (Most Common in Textbooks)

Most networking resources actually use a **5-layer model that borrows names from OSI**, combining ideas from both models. This is subtly different from the 5-layer model taught earlier in this lesson — **only in naming**, not in concept.

| This Course's Layer Name | Common/OSI-borrowed Name |
|---|---|
| Application (Layer 5) | Application (**often called "Layer 7"**, since Application = Layer 7 in the full OSI model) |
| Transport (Layer 4) | Transport (same name) |
| **Internet** (Layer 3) | **Network** (different name!) |
| **Local Network** (Layer 2) | **Data Link** (different name!) |
| Physical (Layer 1) | Physical (same name) |

### 🔑 Key takeaway
> The **only two naming differences** you need to watch for: what this course calls the **"Internet layer"** is commonly called the **"Network layer"** elsewhere, and what this course calls the **"Local Network layer"** is commonly called the **"Data Link layer"** elsewhere.

- In practice, most people just say **"Layer 2"** and **"Layer 3"** rather than spelling out the full name — so this naming difference matters less than it might seem.
- **You will not be quizzed on exact layer names** on the real CCNA exam — but you should recognize both naming conventions when you encounter them in different resources.

---

## 18. Summary Table — Key Concepts from This Lesson

| Concept | Key Fact |
|---|---|
| Protocol | Rules defining how devices communicate |
| Standard | Vendor-neutral agreed specification, enables cross-vendor compatibility |
| IEEE | Defines Ethernet (802.3), Wi-Fi (802.11) |
| IETF | Defines TCP, IP, UDP, HTTP, DNS via RFCs |
| TCP/IP origin | ARPANET (1969) → NCP → TCP (1974) → split into TCP + IP → adopted fully in 1983 |
| 5-layer model (this course) | Application, Transport, Internet, Local Network, Physical |
| Application layer | Format/send/interpret data; protocols: HTTP, FTP, etc. |
| Transport layer | Process-to-process delivery via **port numbers**; protocols: TCP, UDP |
| Internet layer | Host-to-host delivery via **IP addresses** + routers; protocols: IPv4, IPv6, ICMP |
| Local Network layer | Hop-to-hop delivery via **MAC addresses** + switches; protocols: Ethernet, Wi-Fi |
| Physical layer | Sends bits as electrical/optical/radio signals |
| Hop | One step from router/host to the next router/host (switches don't count!) |
| Encapsulation | Adding headers/trailers as data moves DOWN the stack (sending) |
| Decapsulation | Removing headers/trailers as data moves UP the stack (receiving) |
| PDU names | Segment/Datagram (L4), Packet (L3), Frame (L2) |
| TCP vs UDP PDU | TCP = Segment, UDP = Datagram |
| Payload | Everything inside a PDU, excluding that layer's own header/trailer |
| Adjacent layer interaction | How layers cooperate within ONE device (each serves the layer above) |
| Same layer interaction | How the same layer on two different devices effectively "talks" to each other |
| OSI model | 7-layer reference model (Application, Presentation, Session, Transport, Network, Data Link, Physical) — lost to TCP/IP in real-world adoption, but still used for teaching |
| Common 5-layer naming difference | "Internet" layer = "Network" layer; "Local Network" layer = "Data Link" layer |
| Application layer's OSI equivalent | Layer 7 |

---

### 💡 Study Tip
This lesson has **no quiz** in the source material — likely because it's meant to be a conceptual framework you'll apply repeatedly, not something to test in isolation. The best way to "practice" this lesson is to keep asking yourself, as you learn every new topic going forward: *"Which layer does this belong to? What address type does it use? What's the PDU called at this stage?"* By the time you reach later lessons on TCP, UDP, routing protocols, and beyond, this 5-layer framework should feel like second nature — a mental map you're constantly placing new information onto.
