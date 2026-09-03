# CCNA Notes — Lesson 1: Network Devices
*(Based on Jeremy's IT Lab video)*

---

## 1. Briefing: About This Course & Lesson

This is the **very first lesson** in the series, so it's purely foundational — no CLI, no configuration, just core concepts and vocabulary you'll build on for the rest of the course. No prior networking knowledge is assumed.

> 💡 The goal of this lesson: by the end, you should be able to look at a network diagram and understand what each symbol (router, switch, firewall, server, client) actually does.

---

## 2. What is a Network?

Wikipedia's definition:
> *"A computer network is a digital communications network which allows nodes to share resources."*

This sounds abstract at first, so let's break it into two key ideas:
1. A network is made of **nodes** (devices)
2. Those nodes can **share resources** (data, files, services) with each other

### The simplest possible network
Even just **two PCs connected by a single cable** counts as a network! As soon as they're connected and able to exchange data, the definition is satisfied.

---

## 3. Types of Network Nodes (Overview)

| Node Type | Quick Description |
|---|---|
| **Router** | Connects separate networks together (including to the Internet) |
| **Switch** | Connects many end devices together *within* one local network |
| **Firewall** | Monitors/controls traffic entering and exiting a network for security |
| **Server** | A device that *provides* a service or resource |
| **Client** | A device that *requests/uses* a service or resource |

> 💡 Servers and clients are also both commonly called **end hosts** or **endpoints** — meaning they're the actual devices *using* the network, as opposed to routers/switches/firewalls, which exist to *move* the traffic around.

The rest of this lesson goes through each of these in more detail.

---

## 4. Client vs. Server

### Definitions
> **Client** = a device that **accesses** a service made available by a server.
> **Server** = a device that **provides** functions or services for clients.

### 🔑 Key insight: it's about ROLE, not device type
Almost **any** device can act as a client or a server — a laptop, desktop, phone, tablet, etc. It's not about what kind of hardware it is, but **what role it's playing in a specific interaction**.

### Example 1: Two PCs sharing a file
- PC1 asks PC2 for a file called `image.jpg`
- PC2 sends the file back
- **PC1 = client** (it requested the service)
- **PC2 = server** (it provided the service)

### Example 2: Watching this YouTube video
- Your device sends a request to YouTube's server
- YouTube's server streams the video data back to you (not all at once — as a continuous stream)
- **Your device = client**
- **YouTube's server = server**

*(The video also introduces the "cloud" symbol here — in network diagrams, a cloud commonly represents **the Internet**, or generally "a complex network whose internal details don't matter for this diagram.")*

### Example 3: AirDropping a video between two iPhones
- Your phone requests the video from your friend's phone
- Your friend's phone sends it
- **Your phone = client**
- **Your friend's phone = server**

> 🔑 **Same device, different roles.** A single PC could be a server in one interaction and a client in another — it all depends on which side of the request it's on at that moment.

---

## 5. Switches — Connecting Devices Within a LAN

### The problem switches solve
You normally **don't** connect end hosts (PCs, servers, printers) directly to each other one by one. Instead, you connect them all to a central device with many ports — a **switch**.

### What is a LAN?
> **LAN = Local Area Network** — a group of end hosts within the same local area (e.g., one floor of an office, a small office, or your home network).

Devices connected to the **same switch** (or group of switches) are considered part of the same LAN, and can freely send data to each other.

### Key characteristics of switches:
| Characteristic | Detail |
|---|---|
| Number of ports | Usually **24 or more** — designed to connect many end hosts |
| Scope | Provides connectivity **within** a single LAN |
| Limitation | Switches **cannot** connect separate LANs together, and cannot connect to the Internet directly |

**Example device:** Cisco Catalyst switches (e.g., Catalyst 9200, Catalyst 3650) — common enterprise-grade switches.

> 💡 Since switches can't connect different LANs or reach the Internet on their own, we need a different device for that job — the **router**.

---

## 6. Routers — Connecting Different Networks

### What routers do
> Routers provide connectivity **between** different LANs/networks — and because of that, routers are also what connect a network to **the Internet**.

### Key characteristics of routers:
| Characteristic | Detail |
|---|---|
| Number of interfaces | **Fewer** than switches (routers aren't meant to connect dozens of end hosts directly) |
| Scope | Connects **separate** networks together |
| Role | Forwards data *between* LANs, and to/from the Internet |

**Example devices:** Cisco ISR 900, ISR 1000, ISR 4000 series routers.

### 🔑 Switch vs. Router — the core distinction
| | Switch | Router |
|---|---|---|
| Connects | End hosts **within** one LAN | **Separate** LANs/networks together |
| Typical port count | Many (24+) | Few |
| Can reach the Internet? | ❌ No, not directly | ✅ Yes |

### Example flow — connecting two branch offices
Imagine an enterprise with a **New York branch** and a **Tokyo branch**, each with their own LAN (PCs + servers connected via a local switch). If PC1 in New York wants a file from a server (SRV1) in Tokyo:

```
PC1 → SW1 (New York switch) → R1 (New York router) → Internet → R2 (Tokyo router) → SW2 (Tokyo switch) → SRV1
```

The reply then follows the **same path in reverse** back to PC1.

> 💡 This is the fundamental pattern for how data travels across the Internet: **switches handle local delivery within a LAN, routers handle delivery between LANs.**

---

## 7. Firewalls — Network Security

### What firewalls do
> Firewalls are specialized devices that **monitor and control network traffic** entering and exiting a network, based on configured security rules.

### Why they're needed
Once your network connects to the Internet (via a router), it becomes exposed to potential attackers. Firewalls act as a security checkpoint — deciding what traffic is allowed in/out and what gets blocked.

### Example scenario
- PC1 (New York) legitimately tries to reach SRV1 (Tokyo) → firewall should **allow** this traffic (and its return reply)
- An attacker somewhere on the Internet tries to access internal resources → firewall should **block** this

### Where firewalls can be placed
Firewalls can sit:
- **"Outside"** the router (filtering traffic before it even reaches your internal network)
- **"Inside"** the network (filtering traffic after it's passed the router, closer to the end hosts)
- Sometimes **both** — for layered/defense-in-depth security

### Key characteristics of firewalls:
| Characteristic | Detail |
|---|---|
| Function | Monitors/controls traffic based on **configured rules** |
| Placement | Can be inside, outside, or both, relative to the router |
| "Next-generation" firewalls | Firewalls with more advanced/modern filtering features (beyond traditional basic rule-based filtering) |

**Example devices:** Cisco ASA 5500-X series (Cisco's classic firewall, now including modern features like **IPS** — Intrusion Prevention System), and the Cisco Firepower 2100 series (a purpose-built next-generation firewall).

> 💡 **IPS (Intrusion Prevention System)** is mentioned briefly here — it's a more advanced security feature that will be covered in more depth in the security section later in the course. For now, just know it's one of the "modern" capabilities that makes a firewall "next-generation."

---

## 8. Network Firewalls vs. Host-Based Firewalls

This is an important distinction the video makes near the end:

| Type | What it is | Example |
|---|---|---|
| **Network Firewall** | A dedicated **hardware device** that filters traffic *between networks* | Cisco ASA, Cisco Firepower (the devices discussed above) |
| **Host-Based Firewall** | **Software** installed directly on an individual device (like a PC), filtering traffic entering/exiting *that specific machine* | The firewall built into your Windows PC or Mac |

> 🔑 **Best practice: use both layers of defense.** Even in a network protected by a hardware firewall, each individual PC should *also* have its own software firewall running — this is often called "defense in depth," having multiple layers of security rather than relying on just one.

> 💡 This course focuses primarily on **network firewalls** (the hardware kind), since it's a networking-focused curriculum — but it's worth knowing both types exist and serve complementary purposes.

---

## 9. Putting It All Together — Full Network Picture

By combining everything from this lesson, a realistic enterprise network looks something like this:

```
[PC1, PC2] → SW1 → R1 → FW1 → 🌐 Internet 🌐 ← FW2 ← R2 ← SW2 ← [SRV1, SRV2]
   (New York LAN)                                              (Tokyo LAN)
```

- **PCs/Servers** = end hosts (clients and/or servers depending on the interaction)
- **Switches (SW1, SW2)** = connect end hosts together within each local LAN
- **Routers (R1, R2)** = connect each LAN to the wider Internet / to each other
- **Firewalls (FW1, FW2)** = protect the network by filtering traffic in and out

---

## 10. Summary Table — Key Concepts from This Lesson

| Concept | Key Fact |
|---|---|
| Network (basic definition) | Nodes connected together, able to share resources |
| Client | Device that requests/accesses a service |
| Server | Device that provides a service |
| Same device can be both | Yes — role depends on the specific interaction, not the hardware itself |
| End host / endpoint | General term for clients and servers (the "actual" devices using the network) |
| Switch | Connects many end hosts within one LAN; many ports; cannot connect separate LANs or reach the Internet |
| Router | Connects separate networks/LANs together, including to the Internet; fewer ports than switches |
| Firewall | Monitors and controls traffic based on security rules; can sit inside/outside the network |
| Next-generation firewall | A firewall with more advanced/modern filtering capabilities (e.g., IPS) |
| Network firewall | Hardware device filtering traffic between networks |
| Host-based firewall | Software firewall running on an individual device (like your PC) |
| LAN | Local Area Network — end hosts within the same local area |

---

## 11. Practice Quiz (From the Video)

Test yourself first! *(Note: Cisco exam questions often have multiple "possible" answers, but always one BEST answer — these practice questions reflect that style.)*

1. **Your company wants to purchase network hardware to connect 30 PCs in your department. What device is appropriate?**
   A) A router  B) A firewall  C) A switch  D) A server

2. **You received a video file from your friend's iPhone via AirDrop. What was his iPhone functioning as in that transaction?**
   A) A server  B) A client  C) A local area network

3. **What is your computer or smartphone functioning as while you watch this video?**
   A) A server  B) An end host  C) A client

4. **Your company wants to connect its separate networks together. What kind of device is appropriate?**
   A) A firewall  B) A host  C) A LAN  D) A router

5. **Your company wants to upgrade its old firewall to one with more advanced functions. What kind of firewall should they purchase?**
   A) A host-based firewall  B) A next-level firewall  C) A next-generation firewall  D) A top-layer firewall

<br>

### ✅ Answers & Explanations

1. **C — A switch.** A router doesn't typically have enough interfaces for 30 hosts and isn't designed for that purpose (A is incorrect). A firewall filters traffic, it doesn't connect end hosts directly and also lacks enough interfaces (B is incorrect). A server is itself an end host, not a device you connect *other* hosts to (D is incorrect). A switch is specifically designed with many ports to connect numerous end hosts within a LAN.

2. **A — A server.** His iPhone *provided* the file (a service) to your iPhone, which makes his the server. A client *accesses* a service rather than providing one (ruling out B). A single device isn't a LAN by itself, though it can be *part of* one (ruling out C).

3. **C — A client.** Your device is *receiving* a service (the video) from YouTube's servers, making it a client, not a server (ruling out A). While your device technically is an "end host," that term doesn't describe its specific *function* in this interaction — both clients and servers are end hosts, so it's not the most precise answer (ruling out B).

4. **D — A router.** While a firewall *can* technically connect multiple networks, its primary purpose is traffic filtering/security, not general connectivity (ruling out A as "not the best answer"). "Host" refers to any network node in general, not a specific connecting device (ruling out B). A LAN is a *type of network*, not a physical device you purchase (ruling out C). Routers are specifically designed to forward traffic between separate networks.

5. **C — A next-generation firewall.** A host-based firewall is software running on an individual machine, not a network-level device (ruling out A). "Next-level" and "top-layer" aren't real firewall terminology (ruling out B and D). A next-generation firewall combines traditional firewall rule-filtering with more advanced, modern security capabilities.

---

### 💡 Study Tip
This first lesson is all about **building a mental map** of "what device does what job." Whenever you see a new scenario later in the course (or on the real exam), try asking: *"Is this about connecting things within one LAN (switch), connecting different networks (router), securing traffic (firewall), or is this just an end host doing normal client/server stuff?"* Getting this instinct solid now will make everything that follows in the course much easier to slot into place.
