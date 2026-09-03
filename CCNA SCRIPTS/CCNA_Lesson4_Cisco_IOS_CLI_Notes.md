# CCNA Notes — Lesson 4: Cisco IOS CLI Basics
*(Based on Jeremy's IT Lab video)*

---

## 1. What is Cisco IOS?

- **Cisco IOS** = the operating system that runs on Cisco devices (routers, switches, firewalls).
- Think of it like **Windows on a PC** or **macOS on a Mac** — just for Cisco hardware.
- ⚠️ **Not related** to Apple's iOS (iPhone operating system) — just a naming coincidence.

---

## 2. CLI vs GUI

| Term | Meaning | Used in this course? |
|------|---------|----------------------|
| **CLI** | Command-Line Interface — you type text commands | ✅ Yes (main focus) |
| **GUI** | Graphical User Interface — you click buttons/menus (e.g., Cisco ASDM for firewalls) | ❌ Not covered |

- Most network engineers **prefer CLI** over GUI — it's faster and more powerful once you know it.

---

## 3. How to Physically Connect to a Cisco Device

To configure a device for the **first time**, you connect via the **console port**.

### Steps:
1. Bring your laptop physically next to the device.
2. Plug into the **console port** (Cisco switches usually have two options):
   - **RJ45 port** (same shape as a network port)
   - **USB Mini-B port**
3. Use a **rollover cable**:
   - One end = RJ45 connector
   - Other end = DB9 connector
   - Since most modern laptops don't have a serial (DB9) port, you'll need a **USB adapter**.

### 🔑 Key Term: Rollover Cable
- Similar name to a "crossover" cable, but **different** — don't confuse them!
- Wiring is *reversed end-to-end*:
  - Pin 1 → Pin 8
  - Pin 2 → Pin 7
  - Pin 3 → Pin 6
  - Pin 4 → Pin 5 (and so on, mirrored)

---

## 4. Connecting via Terminal Emulator (Software)

- You need a **terminal emulator** program to actually access the CLI once cabled in.
- Popular choice: **PuTTY** (free, download at putty.org)
- In PuTTY: select **"Serial"** connection type → click **Open**

### Default Serial Settings (Memorize for the exam!)
| Setting | Value |
|---------|-------|
| Speed (baud rate) | **9600 bits per second** |
| Data bits | **8** |
| Stop bits | **1** |
| Parity | **None** |
| Flow control | **None** |

> 💡 You almost never need to change these — Cisco devices use these as defaults.

---

## 5. The Three Main CLI Modes

This is one of the **most important concepts** in this lesson.

| Mode | Prompt Symbol | What you can do |
|------|---------------|------------------|
| **User EXEC Mode** | `>` | View limited info only. Can't change anything. (Default mode when you first connect) |
| **Privileged EXEC Mode** | `#` | Full view access, restart device, save configs — but still can't *edit* the configuration |
| **Global Configuration Mode** | `(config)#` | Where you actually **make changes** to the device |

### How to move between modes:
```
Router>                      ← User EXEC mode (default)
Router> enable                ← type "enable" to move up
Router#                      ← Privileged EXEC mode
Router# configure terminal    ← type this to move up again
Router(config)#              ← Global Configuration mode
```

📌 Default hostname for a Cisco router = **"Router"**

---

## 6. Handy CLI Shortcuts & Tricks

### a) The `?` (Question Mark)
- Type `?` to see **available commands**.
- Type a partial word + `?` (no space) → shows possible word completions.
  - Example: `pass?` → shows commands starting with "pass"
- Type a full word + space + `?` → shows what you can type **next** in the command.
- `<cr>` in the output means "just press Enter, nothing more needed."

### b) The `Tab` Key
- Auto-completes a command you've started typing.
- Example: typing `en` + Tab → completes to `enable`

### c) You Don't Need to Type Full Commands
- You can type the **shortest unique abbreviation** of a command.
- Example: `en` = `enable` (only command starting with "en" in that mode)
- ⚠️ If a shortcut is used by **more than one command**, you'll get an **"ambiguous command"** error.
  - Example: typing just `e` fails, because both `enable` and `exit` start with "e"
  - Solution: type `en` (for enable) or `ex` (for exit)

### d) The `do` Command
- Lets you run **Privileged EXEC commands** (like `show running-config`) *while inside* Global Config mode, without leaving it.
- Example: `do show running-config`

### e) The `no` Command
- Placed in front of a command to **undo/remove** it.
- Example: `no service password-encryption` turns off password encryption.

---

## 7. Setting a Password to Protect Privileged EXEC Mode

Why? So random users can't just type `enable` and get full access.

### Command (entered in Global Config mode):
```
Router(config)# enable password CCNA
```
- ⚠️ Passwords are **case-sensitive** (`CCNA` ≠ `ccna`)
- Password does **not display** on screen when typed (for security)
- 3 wrong attempts = you're locked out with a **"bad secrets"** error message

### Testing it:
```
Router(config)# exit        ← back to Privileged EXEC
Router# exit                ← logged out, back to start screen
Router> enable               ← now it asks for the password
Password: ****
Router#                      ← success!
```

---

## 8. Two Configuration Files (Very Important Concept!)

| File | What it is |
|------|-----------|
| **running-config** | The *currently active* configuration. Any command you type updates this immediately. |
| **startup-config** | The configuration that loads when the device **restarts**. |

- View them with:
  - `show running-config`
  - `show startup-config`

> ⚠️ If you never save, your changes will be **lost on reboot** because the startup-config never gets updated!

### Saving running-config → startup-config (3 equivalent ways):
```
Router# write
Router# write memory
Router# copy running-config startup-config
```
All three do the **same thing** — just different commands for the same result.

---

## 9. Password Security — 3 Levels

### Level 1: Plain enable password (Not secure ❌)
```
Router(config)# enable password CCNA
```
Password shows up in plain text in `show running-config`. Anyone who sees it can log in.

### Level 2: Encrypted password (Weak encryption ⚠️)
```
Router(config)# service password-encryption
```
- Encrypts the password into a jumble of letters/numbers (e.g., `08026F6028`)
- You'll see a **"7"** before the encrypted text = Cisco's own (weak) encryption type
- ⚠️ Easily cracked — Type 7 password crackers exist freely online.

### Level 3: Enable Secret (Best & Recommended ✅)
```
Router(config)# enable secret Cisco
```
- Uses **MD5 encryption** — shown as a **"5"** before the encrypted password
- Much stronger than Type 7 (though technically nothing is 100% uncrackable)
- **Best practice: always use `enable secret` instead of `enable password`**

### Important Rules to Remember:
- If **both** `enable password` and `enable secret` are set → **only `enable secret` is used** (password is ignored)
- `service password-encryption` has **NO effect** on `enable secret` — it's *always* encrypted regardless
- Disabling `service password-encryption` (`no service password-encryption`):
  - Already-encrypted passwords **stay encrypted** (won't reverse back to plain text)
  - **New/future** passwords will be stored in **plain text**
  - `enable secret` is **never affected** either way — always stays encrypted

---

## 10. Summary Table — All Commands from This Lesson

| Command | Mode Used In | Purpose |
|---------|-------------|---------|
| `enable` | User EXEC | Enter Privileged EXEC mode |
| `configure terminal` (or `conf t`) | Privileged EXEC | Enter Global Config mode |
| `enable password <word>` | Global Config | Set a basic (weak) password for Privileged EXEC |
| `service password-encryption` | Global Config | Weakly encrypt all passwords (Type 7) |
| `enable secret <word>` | Global Config | Set a strong (MD5, Type 5) password — overrides enable password |
| `do <command>` | Global Config | Run a Privileged EXEC command without leaving Global Config |
| `no <command>` | Any config mode | Remove/undo a previously entered command |
| `show running-config` | Privileged EXEC | View current active configuration |
| `show startup-config` | Privileged EXEC | View saved configuration (loads on restart) |
| `write` / `write memory` / `copy running-config startup-config` | Privileged EXEC | Save running-config as startup-config |

---

## 11. Quick Recap (Beginner Cheat-Sheet)

1. **IOS** = Cisco's operating system (not Apple's iOS!)
2. **CLI** = text commands; **GUI** = clicking buttons (CLI is preferred in networking)
3. Connect physically via **console port** + **rollover cable** + **USB adapter**
4. Use **PuTTY** with Serial settings: 9600 baud, 8 data bits, 1 stop bit, no parity, no flow control
5. Three modes: **User EXEC (`>`) → Privileged EXEC (`#`) → Global Config (`(config)#`)**
6. Use `?` and `Tab` to explore and save typing
7. Set passwords with `enable password`, but **always prefer `enable secret`** (more secure)
8. Remember: **running-config** = active now; **startup-config** = loads on reboot — **save your work!**

---

### 💡 Study Tip
Try physically typing these commands yourself in **Cisco Packet Tracer** (free simulator recommended in the video) — hands-on practice is what makes this stick, especially the mode transitions and password commands.
