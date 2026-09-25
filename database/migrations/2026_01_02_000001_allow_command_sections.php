<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * The `sections.type` column was an enum, which meant every new section
     * renderer needed a schema change. Widen it to a plain string so section
     * types are driven purely by the lesson JSON and the Blade component that
     * renders them.
     */
    public function up(): void
    {
        Schema::table('sections', function (Blueprint $table) {
            $table->string('type')->change();
        });
    }

    public function down(): void
    {
        Schema::table('sections', function (Blueprint $table) {
            $table->enum('type', ['explanation', 'diagram', 'animation', 'interactive', 'table', 'callout'])->change();
        });
    }
};
