# CCNA 200-301 Study App

A Laravel + Alpine.js study app covering the CCNA 200-301 syllabus: 27 day-by-day
lessons with explanations, interactive topology animations, command references,
quizzes, a printable notebook-style PDF for each lesson, and a 3D practice lab.

## Running it locally

You need **PHP 8.2+**, **Composer** and **Node.js 18+**.

```bash
# 1. Install dependencies
composer install
npm install

# 2. Create the environment file and app key
cp .env.example .env
php artisan key:generate

# 3. Create the SQLite database file
touch database/database.sqlite

# 4. Create the tables AND load all 27 lessons into the database
php artisan migrate:fresh --seed

# 5. Build the front-end assets
npm run build

# 6. Start the server
php artisan serve
```

Then open <http://127.0.0.1:8000>.

### Important: lessons live in JSON, not in the database

The lesson content is stored as JSON files in `storage/content/lessons/`.
Those files are **source data** — nothing appears in the app until the seeder
imports them. Any time you add or edit a lesson JSON, re-run:

```bash
php artisan migrate --force   # only needed if a new migration was added
php artisan db:seed --class=LessonSeeder
```

`LessonSeeder` is idempotent: it reads every `*.json` file in
`storage/content/lessons/`, then updates or creates the matching topic and
lesson and rebuilds that lesson's sections and quiz. Existing lessons are not
duplicated.

To add a brand-new lesson you need three things:

1. the JSON file in `storage/content/lessons/`,
2. an entry in `LessonSeeder::TOPIC_MAP` mapping the lesson slug to a topic slug,
3. that topic slug handled in `topicTitle()` and `topicOrder()`.

### Troubleshooting

| Symptom | Cause and fix |
| --- | --- |
| New lessons are missing from the sidebar | The seeder has not been run. `php artisan db:seed --class=LessonSeeder` |
| Seeder fails on the `type` column | An older database still has the `sections.type` enum. Run `php artisan migrate`, or `php artisan migrate:fresh --seed` |
| Pages render unstyled | Assets not built. `npm run build` |
| Lesson loads but a section is blank | The section `type` has no matching Blade file in `resources/views/components/sections/` |

## Lessons

`yes` in the last column means the lesson ends with a command reference section
listing each command with its mode, syntax, a worked example and an explanation.

| Day | Lesson | URL | Commands |
| --- | --- | --- | --- |
| 1 | Network Devices | `/topics/network-devices/lessons/network-devices` | — |
| 2 | Interfaces and Cables | `/topics/interfaces-and-cables/lessons/interfaces-and-cables` | — |
| 3 | The TCP/IP Model | `/topics/tcp-ip-model/lessons/tcp-ip-model` | — |
| 4 | The Cisco IOS CLI | `/topics/ios-cli/lessons/cisco-ios-cli` | yes |
| 5 | Ethernet LAN Switching (Part 1) | `/topics/ethernet-lan-switching/lessons/ethernet-lan-switching-part-1` | — |
| 6 | Ethernet LAN Switching (Part 2) | `/topics/ethernet-lan-switching/lessons/ethernet-lan-switching-part-2` | yes |
| 7 | IPv4 Addressing | `/topics/ip-addressing/lessons/ipv4-addressing-part-1` | — |
| 8 | IPv4 Addressing: Usable Addresses and Configuration | `/topics/ip-addressing/lessons/ipv4-addressing-part-2` | yes |
| 9 | Switch Interfaces | `/topics/switch-interfaces/lessons/switch-interfaces` | yes |
| 10 | The IPv4 Header | `/topics/ipv4-header/lessons/ipv4-header` | yes |
| 11 | Routing Fundamentals | `/topics/routing/lessons/routing-fundamentals` | yes |
| 12 | Static Routing | `/topics/routing/lessons/static-routing` | yes |
| 13 | Life of a Packet | `/topics/life-of-a-packet/lessons/life-of-a-packet` | — |
| 14 | Subnetting: CIDR and the Basics | `/topics/subnetting/lessons/subnetting-part-1` | — |
| 15 | Subnetting: Class C and B Practice | `/topics/subnetting/lessons/subnetting-part-2` | — |
| 16 | Subnetting: Class A and VLSM | `/topics/subnetting/lessons/subnetting-part-3` | — |
| 17 | VLANs: Broadcast Domains and Access Ports | `/topics/vlans/lessons/vlans-part-1` | yes |
| 18 | VLANs: Trunk Ports, 802.1Q and Router on a Stick | `/topics/vlans/lessons/vlans-part-2` | yes |
| 19 | VLANs: Native VLAN on a Router and Layer 3 Switching | `/topics/vlans/lessons/vlans-part-3` | yes |
| 20 | Lab: Migrating Router on a Stick to Layer 3 Switching | `/topics/vlans/lessons/vlans-lab-inter-vlan-routing` | yes |
| 21 | DTP and VTP | `/topics/dtp-and-vtp/lessons/dtp-and-vtp` | yes |
| 22 | Spanning Tree Protocol: Root Bridge and Port Roles | `/topics/spanning-tree/lessons/spanning-tree-part-1` | yes |
| 23 | Spanning Tree Protocol: States, Timers and Configuration | `/topics/spanning-tree/lessons/spanning-tree-part-2` | yes |
| 24 | STP Toolkit: PortFast | `/topics/stp-toolkit/lessons/stp-toolkit-portfast` | yes |
| 25 | STP Toolkit: BPDU Guard and BPDU Filter | `/topics/stp-toolkit/lessons/stp-toolkit-bpdu-guard-filter` | yes |
| 26 | STP Toolkit: Root Guard | `/topics/stp-toolkit/lessons/stp-toolkit-root-guard` | yes |
| 27 | STP Toolkit: Loop Guard | `/topics/stp-toolkit/lessons/stp-toolkit-loop-guard` | yes |

## Content structure

- `storage/content/lessons/*.json` — all lesson content (sections + quiz)
- `database/seeders/LessonSeeder.php` — imports the JSON into the database
- `resources/views/components/sections/*.blade.php` — one renderer per section
  type: `explanation`, `table`, `callout`, `diagram`, `animation`, `commands`,
  `interactive`
- `resources/views/components/notes/` — the printable notebook PDF layout
- `scripts/` — the raw lesson transcripts the JSON was written from

---

<p align="center"><a href="https://laravel.com" target="_blank"><img src="https://raw.githubusercontent.com/laravel/art/master/logo-lockup/5%20SVG/2%20CMYK/1%20Full%20Color/laravel-logolockup-cmyk-red.svg" width="400" alt="Laravel Logo"></a></p>

<p align="center">
<a href="https://github.com/laravel/framework/actions"><img src="https://github.com/laravel/framework/workflows/tests/badge.svg" alt="Build Status"></a>
<a href="https://packagist.org/packages/laravel/framework"><img src="https://img.shields.io/packagist/dt/laravel/framework" alt="Total Downloads"></a>
<a href="https://packagist.org/packages/laravel/framework"><img src="https://img.shields.io/packagist/v/laravel/framework" alt="Latest Stable Version"></a>
<a href="https://packagist.org/packages/laravel/framework"><img src="https://img.shields.io/packagist/l/laravel/framework" alt="License"></a>
</p>

## About Laravel

Laravel is a web application framework with expressive, elegant syntax. We believe development must be an enjoyable and creative experience to be truly fulfilling. Laravel takes the pain out of development by easing common tasks used in many web projects, such as:

- [Simple, fast routing engine](https://laravel.com/docs/routing).
- [Powerful dependency injection container](https://laravel.com/docs/container).
- Multiple back-ends for [session](https://laravel.com/docs/session) and [cache](https://laravel.com/docs/cache) storage.
- Expressive, intuitive [database ORM](https://laravel.com/docs/eloquent).
- Database agnostic [schema migrations](https://laravel.com/docs/migrations).
- [Robust background job processing](https://laravel.com/docs/queues).
- [Real-time event broadcasting](https://laravel.com/docs/broadcasting).

Laravel is accessible, powerful, and provides tools required for large, robust applications.

## Learning Laravel

Laravel has the most extensive and thorough [documentation](https://laravel.com/docs) and video tutorial library of all modern web application frameworks, making it a breeze to get started with the framework. You can also check out [Laravel Learn](https://laravel.com/learn), where you will be guided through building a modern Laravel application.

If you don't feel like reading, [Laracasts](https://laracasts.com) can help. Laracasts contains thousands of video tutorials on a range of topics including Laravel, modern PHP, unit testing, and JavaScript. Boost your skills by digging into our comprehensive video library.

## Laravel Sponsors

We would like to extend our thanks to the following sponsors for funding Laravel development. If you are interested in becoming a sponsor, please visit the [Laravel Partners program](https://partners.laravel.com).

### Premium Partners

- **[Vehikl](https://vehikl.com)**
- **[Tighten Co.](https://tighten.co)**
- **[Kirschbaum Development Group](https://kirschbaumdevelopment.com)**
- **[64 Robots](https://64robots.com)**
- **[Curotec](https://www.curotec.com/services/technologies/laravel)**
- **[DevSquad](https://devsquad.com/hire-laravel-developers)**
- **[Redberry](https://redberry.international/laravel-development)**
- **[Active Logic](https://activelogic.com)**

## Contributing

Thank you for considering contributing to the Laravel framework! The contribution guide can be found in the [Laravel documentation](https://laravel.com/docs/contributions).

## Code of Conduct

In order to ensure that the Laravel community is welcoming to all, please review and abide by the [Code of Conduct](https://laravel.com/docs/contributions#code-of-conduct).

## Security Vulnerabilities

If you discover a security vulnerability within Laravel, please send an e-mail to Taylor Otwell via [taylor@laravel.com](mailto:taylor@laravel.com). All security vulnerabilities will be promptly addressed.

## License

The Laravel framework is open-sourced software licensed under the [MIT license](https://opensource.org/licenses/MIT).
