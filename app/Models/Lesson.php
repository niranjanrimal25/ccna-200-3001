<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Lesson extends Model
{
    protected $fillable = ['topic_id', 'slug', 'title', 'summary', 'source_ref', 'order'];

    protected $casts = ['order' => 'integer'];

    public function topic(): BelongsTo
    {
        return $this->belongsTo(Topic::class);
    }

    public function sections(): HasMany
    {
        return $this->hasMany(Section::class);
    }

    public function quiz(): HasOne
    {
        return $this->hasOne(Quiz::class);
    }
}
