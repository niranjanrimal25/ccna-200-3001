<?php

namespace App\Http\Controllers;

use App\Models\Domain;
use App\Models\Lesson;
use App\Models\Topic;
use Illuminate\View\View;

class LessonController extends Controller
{
    public function index(): View
    {
        $domains = Domain::with([
            'topics.lessons' => fn ($q) => $q->withCount('sections')->with('quiz'),
        ])->orderBy('order')->get();

        return view('lessons.index', [
            'domains' => $domains,
            'days' => $this->days(),
            'navDomains' => $this->navDomains(),
        ]);
    }

    public function show(Topic $topic, Lesson $lesson): View
    {
        $lesson->load([
            'sections',
            'quiz.questions.options',
            'topic.domain',
        ]);

        $prev = Lesson::with('topic')->where('order', '<', $lesson->order)
            ->orderByDesc('order')
            ->first();

        $next = Lesson::with('topic')->where('order', '>', $lesson->order)
            ->orderBy('order')
            ->first();

        return view('lessons.show', [
            'lesson' => $lesson,
            'day' => $lesson->order,
            'prev' => $prev,
            'next' => $next,
            'days' => $this->days(),
            'navDomains' => $this->navDomains(),
        ]);
    }

    private function navDomains()
    {
        return Domain::with('topics.lessons')->orderBy('order')->get();
    }

    /**
     * All lessons ordered by their `order` (day number), for the
     * day-wise sidebar.
     */
    private function days()
    {
        return Lesson::with('topic.domain')->orderBy('order')->get();
    }
}
