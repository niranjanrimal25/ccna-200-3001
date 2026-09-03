<svg class="hidden" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
    <defs>

        {{-- ── Gradients ──────────────────────────────────────────────── --}}
        <linearGradient id="grad-switch" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#3b5270"/>
            <stop offset="100%" stop-color="#2a3d56"/>
        </linearGradient>
        <linearGradient id="grad-pc" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#2e4a6e"/>
            <stop offset="100%" stop-color="#1e3352"/>
        </linearGradient>
        <linearGradient id="grad-server" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#2d3a4a"/>
            <stop offset="100%" stop-color="#1e2a38"/>
        </linearGradient>
        <linearGradient id="grad-firewall" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#4a3d2a"/>
            <stop offset="100%" stop-color="#332b1e"/>
        </linearGradient>
        <linearGradient id="grad-cloud" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#3d3a5c"/>
            <stop offset="100%" stop-color="#2a2840"/>
        </linearGradient>

        {{-- ── ROUTER — Isometric 3D Cisco chassis ────────────────────── --}}
        <symbol id="dev-router" viewBox="0 0 64 48" fill="none" xmlns="http://www.w3.org/2000/svg">
            {{-- Right side face (darkest — gives depth) --}}
            <polygon points="48,28 56,20 56,33 48,41" fill="#0a4a82"/>
            {{-- Top face --}}
            <polygon points="8,28 48,28 56,20 16,20" fill="#1a7bc4"/>
            {{-- Front face --}}
            <rect x="8" y="28" width="40" height="13" fill="#0d5fa6"/>
            {{-- Edge highlights --}}
            <line x1="8" y1="28" x2="48" y2="28" stroke="#2a8ad4" stroke-width="0.6"/>
            <polyline points="8,28 16,20 56,20 48,28" stroke="#2a8ad4" stroke-width="0.6" fill="none"/>
            <polyline points="48,28 56,20 56,33 48,41" stroke="#0d6aaf" stroke-width="0.6" fill="none"/>
            {{-- Port openings on front face --}}
            <rect x="11" y="30" width="5" height="3" rx="0.5" fill="#041e3d"/>
            <rect x="18" y="30" width="5" height="3" rx="0.5" fill="#041e3d"/>
            <rect x="25" y="30" width="5" height="3" rx="0.5" fill="#041e3d"/>
            <rect x="32" y="30" width="5" height="3" rx="0.5" fill="#041e3d"/>
            {{-- Status LEDs --}}
            <circle cx="11" cy="37" r="1.5" fill="#22c55e"/>
            <circle cx="15" cy="37" r="1.5" fill="#22c55e"/>
            <circle cx="19" cy="37" r="1.5" fill="#f59e0b"/>
            {{-- Cisco branding lines --}}
            <line x1="39" y1="30" x2="46" y2="30" stroke="#1a7bc4" stroke-width="0.8"/>
            <line x1="39" y1="32" x2="46" y2="32" stroke="#1a7bc4" stroke-width="0.8"/>
            <line x1="39" y1="34" x2="46" y2="34" stroke="#1a7bc4" stroke-width="0.8"/>
            {{-- Ventilation slots on right face --}}
            <line x1="49" y1="23" x2="55" y2="23" stroke="#0d6aaf" stroke-width="0.6"/>
            <line x1="49" y1="26" x2="55" y2="26" stroke="#0d6aaf" stroke-width="0.6"/>
            <line x1="49" y1="29" x2="55" y2="29" stroke="#0d6aaf" stroke-width="0.6"/>
        </symbol>

        {{-- ── SWITCH — PT flat chassis with 2×8 port rows ────────────── --}}
        <symbol id="dev-switch" viewBox="0 0 64 48" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="4" y="15" width="56" height="20" rx="2" fill="url(#grad-switch)" stroke="#4a6a8a" stroke-width="0.5"/>
            <rect x="4" y="15" width="56" height="2.5" rx="1" fill="#4a7aa0" fill-opacity="0.35"/>
            <rect x="7"  y="19" width="4" height="3.5" rx="0.4" fill="#071526" stroke="#1e3a5f" stroke-width="0.3"/>
            <rect x="13" y="19" width="4" height="3.5" rx="0.4" fill="#071526" stroke="#1e3a5f" stroke-width="0.3"/>
            <rect x="19" y="19" width="4" height="3.5" rx="0.4" fill="#071526" stroke="#1e3a5f" stroke-width="0.3"/>
            <rect x="25" y="19" width="4" height="3.5" rx="0.4" fill="#071526" stroke="#1e3a5f" stroke-width="0.3"/>
            <rect x="31" y="19" width="4" height="3.5" rx="0.4" fill="#071526" stroke="#1e3a5f" stroke-width="0.3"/>
            <rect x="37" y="19" width="4" height="3.5" rx="0.4" fill="#071526" stroke="#1e3a5f" stroke-width="0.3"/>
            <rect x="43" y="19" width="4" height="3.5" rx="0.4" fill="#071526" stroke="#1e3a5f" stroke-width="0.3"/>
            <rect x="49" y="19" width="4" height="3.5" rx="0.4" fill="#071526" stroke="#1e3a5f" stroke-width="0.3"/>
            <rect x="7"  y="24" width="4" height="3.5" rx="0.4" fill="#071526" stroke="#1e3a5f" stroke-width="0.3"/>
            <rect x="13" y="24" width="4" height="3.5" rx="0.4" fill="#071526" stroke="#1e3a5f" stroke-width="0.3"/>
            <rect x="19" y="24" width="4" height="3.5" rx="0.4" fill="#071526" stroke="#1e3a5f" stroke-width="0.3"/>
            <rect x="25" y="24" width="4" height="3.5" rx="0.4" fill="#071526" stroke="#1e3a5f" stroke-width="0.3"/>
            <rect x="31" y="24" width="4" height="3.5" rx="0.4" fill="#071526" stroke="#1e3a5f" stroke-width="0.3"/>
            <rect x="37" y="24" width="4" height="3.5" rx="0.4" fill="#071526" stroke="#1e3a5f" stroke-width="0.3"/>
            <rect x="43" y="24" width="4" height="3.5" rx="0.4" fill="#071526" stroke="#1e3a5f" stroke-width="0.3"/>
            <rect x="49" y="24" width="4" height="3.5" rx="0.4" fill="#071526" stroke="#1e3a5f" stroke-width="0.3"/>
            <circle cx="57" cy="19" r="1.2" fill="#22c55e"/>
            <circle cx="57" cy="22.5" r="1.2" fill="#22c55e" fill-opacity="0.5"/>
            <rect x="54" y="27" width="5" height="4" rx="0.4" fill="#071526" stroke="#1e3a5f" stroke-width="0.3"/>
            <rect x="4" y="36" width="56" height="5" rx="1" fill="#071526" fill-opacity="0.5"/>
        </symbol>

        {{-- ── PC — Monitor + stand + base ────────────────────────────── --}}
        <symbol id="dev-pc" viewBox="0 0 64 48" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="8" y="4" width="48" height="30" rx="3" fill="url(#grad-pc)" stroke="#3a5a8a" stroke-width="0.5"/>
            <rect x="12" y="8" width="40" height="22" rx="1" fill="#0a1628"/>
            <rect x="14" y="10" width="36" height="18" rx="0.5" fill="#0d2040" fill-opacity="0.8"/>
            <line x1="16" y1="13" x2="35" y2="13" stroke="#38bdf8" stroke-width="0.8" stroke-opacity="0.5"/>
            <line x1="16" y1="16" x2="42" y2="16" stroke="#38bdf8" stroke-width="0.8" stroke-opacity="0.3"/>
            <line x1="16" y1="19" x2="38" y2="19" stroke="#38bdf8" stroke-width="0.8" stroke-opacity="0.3"/>
            <line x1="16" y1="22" x2="40" y2="22" stroke="#38bdf8" stroke-width="0.8" stroke-opacity="0.2"/>
            <circle cx="32" cy="32" r="1.2" fill="#22c55e"/>
            <rect x="28" y="34" width="8" height="5" rx="1" fill="#1e3352"/>
            <rect x="20" y="39" width="24" height="4" rx="2" fill="#1e3352" stroke="#3a5a8a" stroke-width="0.3"/>
        </symbol>

        {{-- ── SERVER — 1U rack slab with drive bays ───────────────────── --}}
        <symbol id="dev-server" viewBox="0 0 64 48" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="4" y="8" width="56" height="32" rx="2" fill="url(#grad-server)" stroke="#3a4a5a" stroke-width="0.5"/>
            <rect x="4" y="8" width="56" height="2" rx="1" fill="#3a4a5a" fill-opacity="0.5"/>
            <rect x="8" y="12" width="38" height="6" rx="1" fill="#0f1a24" stroke="#2a3a4a" stroke-width="0.3"/>
            <line x1="14" y1="12" x2="14" y2="18" stroke="#2a3a4a" stroke-width="0.3"/>
            <line x1="20" y1="12" x2="20" y2="18" stroke="#2a3a4a" stroke-width="0.3"/>
            <line x1="26" y1="12" x2="26" y2="18" stroke="#2a3a4a" stroke-width="0.3"/>
            <line x1="32" y1="12" x2="32" y2="18" stroke="#2a3a4a" stroke-width="0.3"/>
            <rect x="8" y="20" width="38" height="6" rx="1" fill="#0f1a24" stroke="#2a3a4a" stroke-width="0.3"/>
            <line x1="14" y1="20" x2="14" y2="26" stroke="#2a3a4a" stroke-width="0.3"/>
            <line x1="20" y1="20" x2="20" y2="26" stroke="#2a3a4a" stroke-width="0.3"/>
            <line x1="26" y1="20" x2="26" y2="26" stroke="#2a3a4a" stroke-width="0.3"/>
            <line x1="32" y1="20" x2="32" y2="26" stroke="#2a3a4a" stroke-width="0.3"/>
            <rect x="8" y="28" width="38" height="6" rx="1" fill="#0f1a24" stroke="#2a3a4a" stroke-width="0.3"/>
            <line x1="14" y1="28" x2="14" y2="34" stroke="#2a3a4a" stroke-width="0.3"/>
            <line x1="20" y1="28" x2="20" y2="34" stroke="#2a3a4a" stroke-width="0.3"/>
            <line x1="26" y1="28" x2="26" y2="34" stroke="#2a3a4a" stroke-width="0.3"/>
            <circle cx="52" cy="14" r="1.5" fill="#22c55e"/>
            <circle cx="56" cy="14" r="1.5" fill="#22c55e" fill-opacity="0.4"/>
            <circle cx="52" cy="22" r="1.5" fill="#22c55e"/>
            <circle cx="52" cy="30" r="1.5" fill="#f59e0b"/>
            <circle cx="54" cy="34" r="2.5" fill="#0f1a24" stroke="#3a4a5a" stroke-width="0.5"/>
            <circle cx="54" cy="34" r="1" fill="#22c55e"/>
        </symbol>

        {{-- ── FIREWALL — Chassis with grid grille + port panel ────────── --}}
        <symbol id="dev-firewall" viewBox="0 0 64 48" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="4" y="10" width="56" height="28" rx="2" fill="url(#grad-firewall)" stroke="#6a5a3a" stroke-width="0.5"/>
            <rect x="4" y="10" width="56" height="2.5" rx="1" fill="#7a6a4a" fill-opacity="0.3"/>
            <rect x="8" y="14" width="34" height="18" rx="1" fill="#1a1208" fill-opacity="0.6"/>
            <line x1="8"  y1="17" x2="42" y2="17" stroke="#6a5030" stroke-width="0.5"/>
            <line x1="8"  y1="20" x2="42" y2="20" stroke="#6a5030" stroke-width="0.5"/>
            <line x1="8"  y1="23" x2="42" y2="23" stroke="#6a5030" stroke-width="0.5"/>
            <line x1="8"  y1="26" x2="42" y2="26" stroke="#6a5030" stroke-width="0.5"/>
            <line x1="8"  y1="29" x2="42" y2="29" stroke="#6a5030" stroke-width="0.5"/>
            <line x1="12" y1="14" x2="12" y2="32" stroke="#6a5030" stroke-width="0.5"/>
            <line x1="16" y1="14" x2="16" y2="32" stroke="#6a5030" stroke-width="0.5"/>
            <line x1="20" y1="14" x2="20" y2="32" stroke="#6a5030" stroke-width="0.5"/>
            <line x1="24" y1="14" x2="24" y2="32" stroke="#6a5030" stroke-width="0.5"/>
            <line x1="28" y1="14" x2="28" y2="32" stroke="#6a5030" stroke-width="0.5"/>
            <line x1="32" y1="14" x2="32" y2="32" stroke="#6a5030" stroke-width="0.5"/>
            <line x1="36" y1="14" x2="36" y2="32" stroke="#6a5030" stroke-width="0.5"/>
            <line x1="40" y1="14" x2="40" y2="32" stroke="#6a5030" stroke-width="0.5"/>
            <rect x="44" y="14" width="14" height="18" rx="1" fill="#1a1208" fill-opacity="0.4"/>
            <rect x="46" y="16" width="10" height="4" rx="0.5" fill="#0a0804" stroke="#6a5030" stroke-width="0.3"/>
            <rect x="46" y="22" width="10" height="4" rx="0.5" fill="#0a0804" stroke="#6a5030" stroke-width="0.3"/>
            <circle cx="52" cy="28" r="1.2" fill="#f59e0b"/>
            <circle cx="56" cy="28" r="1.2" fill="#22c55e"/>
        </symbol>

        {{-- ── CLOUD — Filled gradient cloud with dashed ground line ───── --}}
        <symbol id="dev-cloud" viewBox="0 0 64 48" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M20 36a10 10 0 0 1-2-19.8A13 13 0 0 1 43 18a9 9 0 0 1 4 17z"
                  fill="url(#grad-cloud)" stroke="#5a5880" stroke-width="0.5"/>
            <path d="M22 30a7 7 0 0 1-1-13.8A10 10 0 0 1 39 18a6 6 0 0 1 3 12z"
                  fill="#4a4870" fill-opacity="0.3"/>
            <line x1="6" y1="38" x2="58" y2="38" stroke="#5a5880" stroke-width="1.5" stroke-dasharray="4 3"/>
            <line x1="18" y1="36" x2="18" y2="38" stroke="#5a5880" stroke-width="1"/>
            <line x1="28" y1="36" x2="28" y2="38" stroke="#5a5880" stroke-width="1"/>
            <line x1="38" y1="36" x2="38" y2="38" stroke="#5a5880" stroke-width="1"/>
            <line x1="46" y1="35" x2="46" y2="38" stroke="#5a5880" stroke-width="1"/>
        </symbol>

    </defs>
</svg>
