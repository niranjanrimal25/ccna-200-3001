<?php

namespace Database\Seeders;

use App\Models\Domain;
use App\Models\Lesson;
use App\Models\Quiz;
use App\Models\QuizOption;
use App\Models\QuizQuestion;
use App\Models\Section;
use App\Models\Topic;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\File;

class LessonSeeder extends Seeder
{
    private const TOPIC_MAP = [
        'network-devices' => 'network-devices',
        'interfaces-and-cables' => 'interfaces-and-cables',
        'tcp-ip-model' => 'tcp-ip-model',
        'cisco-ios-cli' => 'ios-cli',
        'ethernet-lan-switching-part-1' => 'ethernet-lan-switching',
        'ethernet-lan-switching-part-2' => 'ethernet-lan-switching',
        'ipv4-addressing-part-1' => 'ip-addressing',
        'ipv4-addressing-part-2' => 'ip-addressing',
        'switch-interfaces' => 'switch-interfaces',
        'ipv4-header' => 'ipv4-header',
        'routing-fundamentals' => 'routing',
        'static-routing' => 'routing',
        'life-of-a-packet' => 'life-of-a-packet',
        'subnetting-part-1' => 'subnetting',
        'subnetting-part-2' => 'subnetting',
        'subnetting-part-3' => 'subnetting',
    ];

    public function run(): void
    {
        $domain = Domain::updateOrCreate(
            ['code' => '1.0'],
            ['title' => 'Network Fundamentals', 'order' => 1]
        );

        $files = File::files(storage_path('content/lessons'));

        foreach ($files as $file) {
            if ($file->getExtension() !== 'json') {
                continue;
            }

            $data = json_decode($file->getContents(), true);

            if (! $data || ! isset($data['slug'])) {
                $this->command?->warn("Skipping malformed lesson file: {$file->getFilename()}");
                continue;
            }

            $topicSlug = self::TOPIC_MAP[$data['slug']] ?? $data['slug'];

            $topic = Topic::updateOrCreate(
                ['slug' => $topicSlug],
                [
                    'domain_id' => $domain->id,
                    'title' => $this->topicTitle($topicSlug),
                    'order' => $this->topicOrder($topicSlug),
                ]
            );

            $lesson = Lesson::updateOrCreate(
                ['slug' => $data['slug']],
                [
                    'topic_id' => $topic->id,
                    'title' => $data['title'],
                    'summary' => $data['summary'] ?? null,
                    'source_ref' => $data['source_ref'] ?? null,
                    'order' => $data['order'] ?? 0,
                ]
            );

            $lesson->sections()->delete();

            foreach ($data['sections'] as $section) {
                Section::create([
                    'lesson_id' => $lesson->id,
                    'order' => $section['order'],
                    'type' => $section['type'],
                    'title' => $section['title'] ?? null,
                    'content' => $section['content'],
                ]);
            }

            $this->seedQuiz($lesson, $data['quiz'] ?? null);

            $this->command?->info("Imported lesson: {$data['title']}");
        }
    }

    private function seedQuiz(Lesson $lesson, ?array $quizData): void
    {
        $lesson->quiz()->delete();

        if (! $quizData || empty($quizData['questions'])) {
            return;
        }

        $quiz = Quiz::create(['lesson_id' => $lesson->id]);

        foreach ($quizData['questions'] as $question) {
            $quizQuestion = QuizQuestion::create([
                'quiz_id' => $quiz->id,
                'order' => $question['order'],
                'question' => $question['question'],
                'explanation' => $question['explanation'] ?? null,
            ]);

            foreach ($question['options'] as $option) {
                QuizOption::create([
                    'quiz_question_id' => $quizQuestion->id,
                    'label' => $option['label'],
                    'text' => $option['text'],
                    'is_correct' => $option['is_correct'],
                ]);
            }
        }
    }

    private function topicTitle(string $slug): string
    {
        return match ($slug) {
            'network-devices' => 'Network Devices',
            'interfaces-and-cables' => 'Interfaces and Cables',
            'tcp-ip-model' => 'The TCP/IP Model',
            'ios-cli' => 'The Cisco IOS CLI',
            'ethernet-lan-switching' => 'Ethernet LAN Switching',
            'ip-addressing' => 'IP Addressing',
            'switch-interfaces' => 'Switch Interfaces',
            'ipv4-header' => 'The IPv4 Header',
            'routing' => 'Routing',
            'life-of-a-packet' => 'Life of a Packet',
            'subnetting' => 'Subnetting',
            default => ucwords(str_replace('-', ' ', $slug)),
        };
    }

    private function topicOrder(string $slug): int
    {
        return match ($slug) {
            'network-devices' => 1,
            'interfaces-and-cables' => 2,
            'tcp-ip-model' => 3,
            'ios-cli' => 4,
            'ethernet-lan-switching' => 5,
            'ip-addressing' => 6,
            'switch-interfaces' => 7,
            'ipv4-header' => 8,
            'routing' => 9,
            'life-of-a-packet' => 10,
            'subnetting' => 11,
            default => 99,
        };
    }
}
