<?php

namespace App\Http\Controllers;

use App\Models\Lesson;
use App\Models\Topic;
use Illuminate\Support\Facades\File;
use Illuminate\View\View;

class CommandController extends Controller
{
    /**
     * Topic-wise reference of every Cisco command in the course.
     *
     * Commands come from two places:
     *  1. the `commands` sections of the lessons themselves, so the page can
     *     never drift out of sync with the course content;
     *  2. storage/content/commands-extra.json, a curated set of important
     *     commands for each topic that the lessons do not (yet) cover.
     */
    public function index(): View
    {
        $extras = $this->extras();

        $topics = Topic::with([
            'lessons' => fn ($q) => $q->orderBy('order')->with('sections'),
        ])->orderBy('order')->get();

        $groupsByTopic = [];
        $allHaystacks = [];

        foreach ($topics as $topic) {
            /** @var array<string, array<string, mixed>> $commands keyed by normalised command name */
            $commands = [];

            foreach ($topic->lessons as $lesson) {
                foreach ($lesson->sections as $section) {
                    if ($section->type !== 'commands') {
                        continue;
                    }

                    foreach ($section->content['commands'] ?? [] as $cmd) {
                        $key = mb_strtolower(trim($cmd['command'] ?? ''));

                        if ($key === '') {
                            continue;
                        }

                        // Same command taught in more than one lesson: keep the
                        // first definition and just record the extra day badge.
                        if (isset($commands[$key])) {
                            $commands[$key]['days'][$lesson->order] = $lesson;
                            continue;
                        }

                        $commands[$key] = $cmd + [
                            'group' => 'General',
                            'days' => [$lesson->order => $lesson],
                            'extra' => false,
                        ];
                    }
                }
            }

            foreach ($extras[$topic->slug] ?? [] as $cmd) {
                $key = mb_strtolower(trim($cmd['command'] ?? ''));

                if ($key === '' || isset($commands[$key])) {
                    continue;
                }

                $commands[$key] = $cmd + [
                    'group' => 'General',
                    'days' => [],
                    'extra' => true,
                ];
            }

            if ($commands === []) {
                continue;
            }

            // Group within the topic, preserving first-seen group order.
            $grouped = [];
            $topicHaystack = mb_strtolower($topic->title);

            foreach ($commands as $cmd) {
                ksort($cmd['days']);

                $cmd['haystack'] = mb_strtolower(implode(' ', array_filter([
                    $cmd['command'] ?? null,
                    $cmd['syntax'] ?? null,
                    $cmd['example'] ?? null,
                    $cmd['description'] ?? null,
                    $cmd['mode'] ?? null,
                    $cmd['note'] ?? null,
                    $cmd['group'] ?? null,
                    $topic->title,
                ])));

                $allHaystacks[] = $cmd['haystack'];
                $topicHaystack .= ' ' . $cmd['haystack'];
                $grouped[$cmd['group']][] = $cmd;
            }

            $groupsByTopic[] = [
                'topic' => $topic,
                'groups' => $grouped,
                'haystack' => $topicHaystack,
                'count' => count($commands),
                'extra_count' => count(array_filter($commands, fn ($c) => $c['extra'])),
            ];
        }

        return view('commands.index', [
            'topicBlocks' => $groupsByTopic,
            'allHaystacks' => $allHaystacks,
            'total' => array_sum(array_column($groupsByTopic, 'count')),
            'days' => Lesson::with('topic.domain')->orderBy('order')->get(),
        ]);
    }

    /**
     * @return array<string, array<int, array<string, mixed>>>
     */
    private function extras(): array
    {
        $path = storage_path('content/commands-extra.json');

        if (! File::exists($path)) {
            return [];
        }

        $data = json_decode(File::get($path), true) ?? [];

        // Strip the leading "_comment" key and anything else non-list.
        return array_filter($data, fn ($v) => is_array($v) && array_is_list($v));
    }
}
