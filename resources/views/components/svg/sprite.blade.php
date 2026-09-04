<svg class="hidden" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
    <defs>

        {{-- ── Gradients ──────────────────────────────────────────────── --}}
        <linearGradient id="grad-switch" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#0f766e"/>
            <stop offset="100%" stop-color="#0b3a38"/>
        </linearGradient>
        <linearGradient id="grad-pc" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#0f766e"/>
            <stop offset="100%" stop-color="#0b3a38"/>
        </linearGradient>
        <linearGradient id="grad-server" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#0f766e"/>
            <stop offset="100%" stop-color="#0b3a38"/>
        </linearGradient>
        <linearGradient id="grad-firewall" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#4a4a4a"/>
            <stop offset="100%" stop-color="#262626"/>
        </linearGradient>
        <linearGradient id="grad-cloud" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#2a5f64"/>
            <stop offset="100%" stop-color="#163a3e"/>
        </linearGradient>

        {{-- ── ROUTER — Isometric 3D Cisco chassis ────────────────────── --}}
        <symbol id="dev-router" viewBox="0 0 64 48" fill="none" xmlns="http://www.w3.org/2000/svg">
            <ellipse cx="32" cy="42" rx="23" ry="3.4" fill="#000000" opacity="0.18"/>
            {{-- Right side face (darkest — depth) --}}
            <polygon points="46,18 56,11 56,29 46,36" fill="#0d3b3d"/>
            {{-- Top face --}}
            <polygon points="10,18 46,18 56,11 20,11" fill="#2dd4bf"/>
            {{-- Front face --}}
            <rect x="10" y="18" width="36" height="18" fill="#0e7a80"/>
            {{-- Edge highlights --}}
            <line x1="10" y1="18" x2="46" y2="18" stroke="#5eead4" stroke-width="0.7"/>
            <polyline points="10,18 20,11 56,11 46,18" stroke="#5eead4" stroke-width="0.7" fill="none"/>
            <polyline points="46,18 56,11 56,29 46,36" stroke="#0f766e" stroke-width="0.7" fill="none"/>
            {{-- Ports --}}
            <rect x="14" y="22" width="4.5" height="3" rx="0.6" fill="#042f2e"/>
            <rect x="21" y="22" width="4.5" height="3" rx="0.6" fill="#042f2e"/>
            <rect x="28" y="22" width="4.5" height="3" rx="0.6" fill="#042f2e"/>
            <rect x="35" y="22" width="4.5" height="3" rx="0.6" fill="#042f2e"/>
            {{-- Status LEDs --}}
            <circle cx="14" cy="31" r="1.5" fill="#22c55e"/>
            <circle cx="18" cy="31" r="1.5" fill="#22c55e"/>
            <circle cx="22" cy="31" r="1.5" fill="#f59e0b"/>
            {{-- Cisco branding --}}
            <line x1="39" y1="23" x2="44" y2="23" stroke="#5eead4" stroke-width="0.9"/>
            <line x1="39" y1="25" x2="44" y2="25" stroke="#5eead4" stroke-width="0.9"/>
            <line x1="39" y1="27" x2="44" y2="27" stroke="#5eead4" stroke-width="0.9"/>
            {{-- Vents on right face --}}
            <line x1="48" y1="15" x2="54" y2="15" stroke="#0f766e" stroke-width="0.7"/>
            <line x1="48" y1="18" x2="54" y2="18" stroke="#0f766e" stroke-width="0.7"/>
            <line x1="48" y1="21" x2="54" y2="21" stroke="#0f766e" stroke-width="0.7"/>
        </symbol>

        {{-- ── SWITCH — Isometric chassis, 2×6 port rows ──────────────── --}}
        <symbol id="dev-switch" viewBox="0 0 64 48" fill="none" xmlns="http://www.w3.org/2000/svg">
            <ellipse cx="32" cy="41" rx="24" ry="3.2" fill="#000000" opacity="0.18"/>
            {{-- Right face --}}
            <polygon points="52,14 62,8 62,26 52,32" fill="#16262c"/>
            {{-- Top face --}}
            <polygon points="4,14 52,14 62,8 14,8" fill="#14b8a6"/>
            {{-- Front face --}}
            <rect x="4" y="14" width="48" height="18" rx="1.5" fill="url(#grad-switch)"/>
            {{-- Top sheen --}}
            <rect x="4" y="14" width="48" height="2.2" rx="1" fill="#2dd4bf" fill-opacity="0.35"/>
            {{-- Port row 1 --}}
            <rect x="8"  y="18" width="4.5" height="3.5" rx="0.5" fill="#042f2e" stroke="#0f766e" stroke-width="0.4"/>
            <rect x="15" y="18" width="4.5" height="3.5" rx="0.5" fill="#042f2e" stroke="#0f766e" stroke-width="0.4"/>
            <rect x="22" y="18" width="4.5" height="3.5" rx="0.5" fill="#042f2e" stroke="#0f766e" stroke-width="0.4"/>
            <rect x="29" y="18" width="4.5" height="3.5" rx="0.5" fill="#042f2e" stroke="#0f766e" stroke-width="0.4"/>
            <rect x="36" y="18" width="4.5" height="3.5" rx="0.5" fill="#042f2e" stroke="#0f766e" stroke-width="0.4"/>
            <rect x="43" y="18" width="4.5" height="3.5" rx="0.5" fill="#042f2e" stroke="#0f766e" stroke-width="0.4"/>
            {{-- Port row 2 --}}
            <rect x="8"  y="23.5" width="4.5" height="3.5" rx="0.5" fill="#042f2e" stroke="#0f766e" stroke-width="0.4"/>
            <rect x="15" y="23.5" width="4.5" height="3.5" rx="0.5" fill="#042f2e" stroke="#0f766e" stroke-width="0.4"/>
            <rect x="22" y="23.5" width="4.5" height="3.5" rx="0.5" fill="#042f2e" stroke="#0f766e" stroke-width="0.4"/>
            <rect x="29" y="23.5" width="4.5" height="3.5" rx="0.5" fill="#042f2e" stroke="#0f766e" stroke-width="0.4"/>
            <rect x="36" y="23.5" width="4.5" height="3.5" rx="0.5" fill="#042f2e" stroke="#0f766e" stroke-width="0.4"/>
            <rect x="43" y="23.5" width="4.5" height="3.5" rx="0.5" fill="#042f2e" stroke="#0f766e" stroke-width="0.4"/>
            {{-- Status LEDs --}}
            <circle cx="49" cy="19" r="1.3" fill="#22c55e"/>
            <circle cx="49" cy="22.5" r="1.3" fill="#22c55e" fill-opacity="0.55"/>
            <circle cx="49" cy="26" r="1.3" fill="#f59e0b"/>
            {{-- Bottom vents --}}
            <rect x="4" y="27" width="48" height="4.4" rx="1" fill="#042f2e" fill-opacity="0.45"/>
        </symbol>

        {{-- ── PC — Isometric monitor + stand + base ──────────────────── --}}
        <symbol id="dev-pc" viewBox="0 0 64 48" fill="none" xmlns="http://www.w3.org/2000/svg">
            <ellipse cx="32" cy="43" rx="22" ry="2.8" fill="#000000" opacity="0.18"/>
            {{-- Monitor top face --}}
            <polygon points="8,7 48,7 54,3 14,3" fill="#0d9488"/>
            {{-- Monitor right face --}}
            <polygon points="48,7 54,3 54,25 48,29" fill="#115e59"/>
            {{-- Monitor front --}}
            <rect x="8" y="7" width="40" height="22" rx="1.5" fill="url(#grad-pc)"/>
            {{-- Screen --}}
            <rect x="12" y="10" width="32" height="16" rx="1" fill="#042f2e"/>
            <rect x="14" y="12" width="28" height="12" fill="#134e4a" fill-opacity="0.9"/>
            <line x1="16" y1="15" x2="36" y2="15" stroke="#5eead4" stroke-width="0.9" stroke-opacity="0.6"/>
            <line x1="16" y1="18" x2="40" y2="18" stroke="#5eead4" stroke-width="0.9" stroke-opacity="0.35"/>
            <line x1="16" y1="21" x2="38" y2="21" stroke="#5eead4" stroke-width="0.9" stroke-opacity="0.3"/>
            {{-- Power LED --}}
            <circle cx="45" cy="25" r="1.3" fill="#22c55e"/>
            {{-- Stand neck --}}
            <rect x="26" y="29" width="4" height="7" fill="#0b3a38"/>
            {{-- Base (isometric) --}}
            <polygon points="18,36 46,36 50,33 22,33" fill="#0f766e"/>
            <polygon points="22,33 50,33 50,38 22,38" fill="#115e59"/>
            <rect x="18" y="36" width="28" height="4" rx="1.5" fill="#0f766e"/>
        </symbol>

        {{-- ── SERVER — Isometric 1U rack slab, drive bays ─────────────── --}}
        <symbol id="dev-server" viewBox="0 0 64 48" fill="none" xmlns="http://www.w3.org/2000/svg">
            <ellipse cx="32" cy="41" rx="24" ry="3.2" fill="#000000" opacity="0.18"/>
            {{-- Right face --}}
            <polygon points="52,12 62,6 62,28 52,34" fill="#0b3a38"/>
            {{-- Top face --}}
            <polygon points="4,12 52,12 62,6 14,6" fill="#0d9488"/>
            {{-- Front face --}}
            <rect x="4" y="12" width="48" height="22" rx="1.5" fill="url(#grad-server)"/>
            <rect x="4" y="12" width="48" height="2.2" rx="1" fill="#0d9488" fill-opacity="0.4"/>
            {{-- Drive bays --}}
            <rect x="8"  y="17" width="16" height="6" rx="1" fill="#042f2e" stroke="#0f766e" stroke-width="0.4"/>
            <rect x="27" y="17" width="16" height="6" rx="1" fill="#042f2e" stroke="#0f766e" stroke-width="0.4"/>
            <circle cx="12" cy="20" r="1" fill="#22c55e"/>
            <circle cx="31" cy="20" r="1" fill="#22c55e"/>
            <rect x="8"  y="26" width="16" height="5" rx="1" fill="#042f2e" stroke="#0f766e" stroke-width="0.4"/>
            <rect x="27" y="26" width="16" height="5" rx="1" fill="#042f2e" stroke="#0f766e" stroke-width="0.4"/>
            {{-- Status LEDs (right panel) --}}
            <circle cx="48" cy="18" r="1.4" fill="#22c55e"/>
            <circle cx="48" cy="21.5" r="1.4" fill="#22c55e" fill-opacity="0.45"/>
            <circle cx="48" cy="25" r="1.4" fill="#f59e0b"/>
            <rect x="46" y="28" width="4.5" height="3" rx="0.6" fill="#042f2e" stroke="#0f766e" stroke-width="0.4"/>
        </symbol>

        {{-- ── FIREWALL — Isometric chassis, grille + port panel ───────── --}}
        <symbol id="dev-firewall" viewBox="0 0 64 48" fill="none" xmlns="http://www.w3.org/2000/svg">
            <ellipse cx="32" cy="41" rx="24" ry="3.2" fill="#000000" opacity="0.18"/>
            {{-- Right face --}}
            <polygon points="52,12 62,6 62,26 52,32" fill="#161616"/>
            {{-- Top face --}}
            <polygon points="4,12 52,12 62,6 14,6" fill="#4a4a4a"/>
            {{-- Front face --}}
            <rect x="4" y="12" width="48" height="20" rx="1.5" fill="url(#grad-firewall)"/>
            <rect x="4" y="12" width="48" height="2.2" rx="1" fill="#6a6a6a" fill-opacity="0.3"/>
            {{-- Grille grid --}}
            <rect x="8" y="16" width="30" height="13" rx="1" fill="#141414" fill-opacity="0.6"/>
            <line x1="8"  y1="19" x2="38" y2="19" stroke="#3a3a3a" stroke-width="0.6"/>
            <line x1="8"  y1="22" x2="38" y2="22" stroke="#3a3a3a" stroke-width="0.6"/>
            <line x1="8"  y1="25" x2="38" y2="25" stroke="#3a3a3a" stroke-width="0.6"/>
            <line x1="13" y1="16" x2="13" y2="29" stroke="#3a3a3a" stroke-width="0.6"/>
            <line x1="18" y1="16" x2="18" y2="29" stroke="#3a3a3a" stroke-width="0.6"/>
            <line x1="23" y1="16" x2="23" y2="29" stroke="#3a3a3a" stroke-width="0.6"/>
            <line x1="28" y1="16" x2="28" y2="29" stroke="#3a3a3a" stroke-width="0.6"/>
            <line x1="33" y1="16" x2="33" y2="29" stroke="#3a3a3a" stroke-width="0.6"/>
            {{-- Port panel --}}
            <rect x="41" y="16" width="9" height="13" rx="1" fill="#141414" fill-opacity="0.4"/>
            <rect x="43" y="18" width="5" height="3.5" rx="0.5" fill="#0a0a0a" stroke="#3a3a3a" stroke-width="0.4"/>
            <rect x="43" y="23" width="5" height="3.5" rx="0.5" fill="#0a0a0a" stroke="#3a3a3a" stroke-width="0.4"/>
            <circle cx="45" cy="28.5" r="1.2" fill="#f59e0b"/>
            <circle cx="48.5" cy="28.5" r="1.2" fill="#22c55e"/>
        </symbol>

        {{-- ── CLOUD — Filled gradient cloud, dashed ground, soft shadow ─ --}}
        <symbol id="dev-cloud" viewBox="0 0 64 48" fill="none" xmlns="http://www.w3.org/2000/svg">
            <ellipse cx="32" cy="40" rx="22" ry="3" fill="#000000" opacity="0.15"/>
            <path d="M20 36a10 10 0 0 1-2-19.8A13 13 0 0 1 43 18a9 9 0 0 1 4 17z"
                  fill="url(#grad-cloud)" stroke="#2a5f64" stroke-width="0.6"/>
            <path d="M22 30a7 7 0 0 1-1-13.8A10 10 0 0 1 39 18a6 6 0 0 1 3 12z"
                  fill="#265558" fill-opacity="0.35"/>
            <circle cx="20" cy="27" r="1.2" fill="#4a9a9e" fill-opacity="0.5"/>
            <circle cx="28" cy="23" r="1.4" fill="#4a9a9e" fill-opacity="0.4"/>
            <circle cx="38" cy="24" r="1.3" fill="#4a9a9e" fill-opacity="0.4"/>
            <line x1="6" y1="38" x2="58" y2="38" stroke="#2a5f64" stroke-width="1.5" stroke-dasharray="4 3"/>
            <line x1="18" y1="36" x2="18" y2="38" stroke="#2a5f64" stroke-width="1"/>
            <line x1="28" y1="36" x2="28" y2="38" stroke="#2a5f64" stroke-width="1"/>
            <line x1="38" y1="36" x2="38" y2="38" stroke="#2a5f64" stroke-width="1"/>
            <line x1="46" y1="35" x2="46" y2="38" stroke="#2a5f64" stroke-width="1"/>
        </symbol>

    </defs>
</svg>
