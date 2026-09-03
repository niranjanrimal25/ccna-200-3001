@props(['type' => 'pc', 'class' => 'h-12 w-16'])

<svg viewBox="0 0 64 48" class="{{ $class }}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" role="img" aria-label="{{ $type }}">
    @if ($type === 'router')
        <rect x="6" y="30" width="52" height="13" rx="3" fill="currentColor" fill-opacity="0.15"/>
        <rect x="6" y="30" width="52" height="13" rx="3"/>
        <line x1="12" y1="36" x2="24" y2="36"/>
        <line x1="12" y1="39" x2="24" y2="39"/>
        <circle cx="32" cy="18" r="8"/>
        <path d="M32 11a7 7 0 0 1 5.6 2.8M32 25a7 7 0 0 1-5.6-2.8"/>
        <path d="M27.2 17.6l7 4.8M36.8 18.4l-7-4.8"/>
    @elseif ($type === 'switch')
        <rect x="6" y="16" width="52" height="16" rx="2" fill="currentColor" fill-opacity="0.15"/>
        <rect x="6" y="16" width="52" height="16" rx="2"/>
        <line x1="10" y1="20" x2="14" y2="20"/>
        <line x1="10" y1="24" x2="14" y2="24"/>
        <line x1="10" y1="28" x2="14" y2="28"/>
        <line x1="50" y1="20" x2="54" y2="20"/>
        <line x1="50" y1="24" x2="54" y2="24"/>
        <line x1="50" y1="28" x2="54" y2="28"/>
        <path d="M18 24h28" stroke-dasharray="3 2"/>
        <path d="M20 20l-3 4 3 4" stroke-width="1.6"/>
        <path d="M44 20l3 4-3 4" stroke-width="1.6"/>
    @elseif ($type === 'pc')
        <rect x="10" y="8" width="44" height="28" rx="2" fill="currentColor" fill-opacity="0.15"/>
        <rect x="10" y="8" width="44" height="28" rx="2"/>
        <rect x="16" y="14" width="32" height="16" rx="1"/>
        <rect x="28" y="36" width="8" height="4"/>
        <rect x="22" y="40" width="20" height="2" rx="1"/>
    @elseif ($type === 'server')
        <rect x="10" y="6" width="44" height="36" rx="3" fill="currentColor" fill-opacity="0.15"/>
        <rect x="10" y="6" width="44" height="36" rx="3"/>
        <line x1="17" y1="13" x2="22" y2="13"/>
        <line x1="17" y1="17" x2="22" y2="17"/>
        <line x1="17" y1="24" x2="22" y2="24"/>
        <line x1="17" y1="28" x2="22" y2="28"/>
        <line x1="17" y1="35" x2="22" y2="35"/>
        <line x1="17" y1="39" x2="22" y2="39"/>
        <circle cx="42" cy="14" r="4" fill="currentColor" fill-opacity="0.35"/>
        <circle cx="42" cy="26" r="4"/>
        <circle cx="42" cy="37" r="4"/>
    @elseif ($type === 'firewall')
        <rect x="8" y="8" width="48" height="32" rx="3" fill="currentColor" fill-opacity="0.15"/>
        <rect x="8" y="8" width="48" height="32" rx="3"/>
        <path d="M8 18h48M8 28h48M18 8v10M28 8v10M38 8v10M48 8v10M18 28v10M28 28v10M38 28v10M48 28v10" stroke-width="1.4"/>
        <path d="M32 12l2 2-2 2 2 2-2 2 2 2M32 12l-2 2 2 2-2 2 2 2-2 2" stroke="none" fill="none"/>
    @elseif ($type === 'cloud')
        <path d="M18 38a10 10 0 0 1-1-19.9A14 14 0 0 1 44 20a9 9 0 0 1 4 17z" fill="currentColor" fill-opacity="0.15"/>
        <path d="M18 38a10 10 0 0 1-1-19.9A14 14 0 0 1 44 20a9 9 0 0 1 4 17z"/>
        <line x1="8" y1="40" x2="56" y2="40" stroke-width="1.5"/>
        <path d="M20 40v2M28 40v2M36 40v2M44 40v2" stroke-width="1.5"/>
    @endif
</svg>
