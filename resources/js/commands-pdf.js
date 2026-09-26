/**
 * Builds the "Cisco Command Reference" PDF from the data embedded in the
 * Commands page.
 *
 * This deliberately does NOT use html2canvas (unlike the per-lesson notebook
 * export). With ~200 commands the rendered element is far taller than the
 * browser's maximum canvas height, which would either fail outright or force
 * a downscale that blurs the text and slices lines across page breaks.
 * Drawing straight into jsPDF gives crisp, selectable, searchable text and
 * correct page breaks.
 *
 * The layout is designed to be PRINTED:
 *  - no background fill and no ruled lines, so it does not flood a page with
 *    toner and stays legible in greyscale;
 *  - balanced margins with a little extra on the binding edge;
 *  - every topic starts on a fresh page, so a single chapter can be printed
 *    on its own and double-sided printing stays tidy;
 *  - running heads and page numbers sit well inside the printer's
 *    unprintable edge;
 *  - a serif face for prose (easier on paper) against a sans for headings
 *    and a mono for commands.
 */

// A4 portrait, millimetres.
const PAGE_W = 210;
const PAGE_H = 297;

// Margins: slightly wider on the left for hole punching or binding.
const MARGIN_L = 21;
const MARGIN_R = 16;
const CONTENT_TOP = 26; // first baseline, below the running head
const MARGIN_B = 20; // text must stop here; footer lives below

const HEADER_BASE = 14.5; // running-head baseline
const HEADER_RULE = 17;
const FOOTER_BASE = PAGE_H - 12;

const TEXT_W = PAGE_W - MARGIN_L - MARGIN_R; // 173 mm

// Indented column for the syntax/example blocks.
const LABEL_R = MARGIN_L + 14.5; // right-aligned label edge (clears the box)
const CODE_X = MARGIN_L + 20;
const CODE_W = PAGE_W - MARGIN_R - CODE_X;

// Leading (line heights) in mm.
const LEAD_BODY = 4.5;
const LEAD_CODE = 4.0;
const LEAD_NOTE = 4.1;

// Greyscale-safe colours.
const TEXT = [22, 22, 22];
const HEADING = [16, 38, 74];
const COMMAND = [0, 68, 64];
const MUTED = [98, 98, 98];
const FAINT = [150, 150, 150];
const BORDER = [203, 203, 203];
const HAIRLINE = [228, 228, 228];
const ACCENT = [16, 38, 74];

export default function commandsPdfData() {
    return {
        busy: false,
        error: '',

        async download() {
            if (this.busy) return;

            const node = document.getElementById('commands-pdf-data');
            if (!node) {
                this.error = 'Command data not found on this page.';
                return;
            }

            let topics;
            try {
                topics = JSON.parse(node.textContent);
            } catch (e) {
                this.error = 'Could not read the command data.';
                return;
            }

            if (!topics.length) {
                this.error = 'There are no commands to export.';
                return;
            }

            this.busy = true;
            this.error = '';

            try {
                const { jsPDF } = await import('jspdf');
                const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
                pdf.setProperties({
                    title: 'CCNA 200-301 — Cisco Command Reference',
                    subject: 'Topic-wise Cisco IOS command reference',
                });
                buildDocument(pdf, topics);
                pdf.save('CCNA-Cisco-Command-Reference.pdf');
            } catch (error) {
                console.error('Command reference PDF failed:', error);
                this.error = 'PDF export failed: ' + (error && error.message ? error.message : error);
            } finally {
                this.busy = false;
            }
        },
    };
}

export function buildDocument(pdf, topics) {
    const total = topics.reduce((n, t) => n + t.count, 0);

    // page number -> running-head text
    const pageTopic = {};
    const state = { y: 0, page: 1, topic: '' };

    // ---------------------------------------------------------------- cover
    let y = 52;

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(26);
    pdf.setTextColor(...HEADING);
    pdf.text('Cisco Command', MARGIN_L, y);
    y += 11;
    pdf.text('Reference', MARGIN_L, y);

    y += 6;
    pdf.setDrawColor(...ACCENT);
    pdf.setLineWidth(0.8);
    pdf.line(MARGIN_L, y, MARGIN_L + 62, y);

    y += 11;
    pdf.setFont('times', 'normal');
    pdf.setFontSize(12);
    pdf.setTextColor(...TEXT);
    pdf.text('CCNA 200-301 study notes', MARGIN_L, y);

    y += 6.5;
    pdf.setFontSize(10.5);
    pdf.setTextColor(...MUTED);
    pdf.text(`${total} commands across ${topics.length} topics`, MARGIN_L, y);
    y += 5.5;
    pdf.text(
        new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }),
        MARGIN_L,
        y
    );

    // ------------------------------------------------------------- contents
    pdf.addPage();
    state.page = 2;
    y = CONTENT_TOP + 4;

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(15);
    pdf.setTextColor(...HEADING);
    pdf.text('Contents', MARGIN_L, y);

    y += 3;
    pdf.setDrawColor(...ACCENT);
    pdf.setLineWidth(0.5);
    pdf.line(MARGIN_L, y, PAGE_W - MARGIN_R, y);
    y += 8;

    const tocTop = y;

    // ----------------------------------------------------------------- body
    const tocEntries = [];

    topics.forEach((topic, topicIndex) => {
        // Each topic opens a fresh page: cleaner in print, and a single
        // chapter can be printed on its own.
        pdf.addPage();
        state.page = pdf.getNumberOfPages();
        state.topic = topic.topic;
        pageTopic[state.page] = state.topic;
        state.y = CONTENT_TOP;

        tocEntries.push({
            number: topicIndex + 1,
            title: topic.topic,
            count: topic.count,
            page: state.page,
        });

        // Chapter heading
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(9);
        pdf.setTextColor(...FAINT);
        pdf.text(String(topicIndex + 1).padStart(2, '0'), MARGIN_L, state.y);

        state.y += 7.5;
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(17);
        pdf.setTextColor(...HEADING);
        pdf.text(topic.topic, MARGIN_L, state.y);

        pdf.setFont('times', 'italic');
        pdf.setFontSize(9.5);
        pdf.setTextColor(...MUTED);
        pdf.text(`${topic.count} commands`, PAGE_W - MARGIN_R, state.y, { align: 'right' });

        state.y += 2.8;
        pdf.setDrawColor(...ACCENT);
        pdf.setLineWidth(0.6);
        pdf.line(MARGIN_L, state.y, PAGE_W - MARGIN_R, state.y);
        state.y += 9;

        topic.groups.forEach((group, groupIndex) => {
            const groupNeed =
                8 + (group.commands[0] ? measureCommand(pdf, group.commands[0]) : 0);

            if (state.y + groupNeed > PAGE_H - MARGIN_B) newPage(pdf, state, pageTopic);
            else if (groupIndex > 0) state.y += 3.5;

            // Section heading
            pdf.setFont('helvetica', 'bold');
            pdf.setFontSize(9.5);
            pdf.setTextColor(...COMMAND);
            pdf.text(group.label.toUpperCase(), MARGIN_L, state.y);
            state.y += 2.2;
            pdf.setDrawColor(...BORDER);
            pdf.setLineWidth(0.25);
            pdf.line(MARGIN_L, state.y, PAGE_W - MARGIN_R, state.y);
            state.y += 6;

            group.commands.forEach((cmd, cmdIndex) => {
                drawCommand(pdf, state, cmd, pageTopic, cmdIndex > 0);
            });
        });
    });

    // ------------------------------------------- contents, with real numbers
    pdf.setPage(2);
    let ty = tocTop;

    const countColR = PAGE_W - MARGIN_R - 13;

    // Column headers, so the two right-hand numbers are unambiguous.
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(6.8);
    pdf.setTextColor(...FAINT);
    pdf.text('COMMANDS', countColR, ty - 4.5, { align: 'right' });
    pdf.text('PAGE', PAGE_W - MARGIN_R, ty - 4.5, { align: 'right' });

    tocEntries.forEach((entry) => {
        const label = entry.title;
        const pageLabel = String(entry.page);

        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(9);
        pdf.setTextColor(...FAINT);
        pdf.text(String(entry.number).padStart(2, '0'), MARGIN_L, ty);

        pdf.setFont('times', 'normal');
        pdf.setFontSize(11.5);
        pdf.setTextColor(...TEXT);
        const labelX = MARGIN_L + 9;
        pdf.text(label, labelX, ty);

        pdf.setFont('times', 'normal');
        pdf.setFontSize(11.5);
        const labelW = pdf.getTextWidth(label);

        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(10);
        pdf.setTextColor(...TEXT);
        pdf.text(pageLabel, PAGE_W - MARGIN_R, ty, { align: 'right' });

        pdf.setFont('times', 'italic');
        pdf.setFontSize(9);
        pdf.setTextColor(...MUTED);
        const countLabel = String(entry.count);
        const countW = pdf.getTextWidth(countLabel);
        pdf.text(countLabel, countColR, ty, { align: 'right' });

        // Dot leader, stopping short of the count so it never strikes through.
        const dotStart = labelX + labelW + 2.5;
        const dotEnd = countColR - countW - 3;
        if (dotEnd > dotStart) {
            pdf.setDrawColor(...FAINT);
            pdf.setLineWidth(0.2);
            pdf.setLineDashPattern([0.4, 1.4], 0);
            pdf.line(dotStart, ty - 0.8, dotEnd, ty - 0.8);
            pdf.setLineDashPattern([], 0);
        }

        ty += 7.4;
    });

    // --------------------------------------------- running heads and footers
    const pageCount = pdf.getNumberOfPages();

    for (let i = 1; i <= pageCount; i++) {
        pdf.setPage(i);

        if (i > 1) {
            pdf.setFont('helvetica', 'normal');
            pdf.setFontSize(8);
            pdf.setTextColor(...MUTED);
            pdf.text('Cisco Command Reference', MARGIN_L, HEADER_BASE);

            if (pageTopic[i]) {
                pdf.setFont('helvetica', 'bold');
                pdf.text(pageTopic[i], PAGE_W - MARGIN_R, HEADER_BASE, { align: 'right' });
            }

            pdf.setDrawColor(...BORDER);
            pdf.setLineWidth(0.25);
            pdf.line(MARGIN_L, HEADER_RULE, PAGE_W - MARGIN_R, HEADER_RULE);
        }

        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(8.5);
        pdf.setTextColor(...MUTED);
        pdf.text(String(i), PAGE_W / 2, FOOTER_BASE, { align: 'center' });

        if (i === 1) {
            pdf.setFontSize(8);
            pdf.setTextColor(...FAINT);
            pdf.text('CCNA 200-301', MARGIN_L, FOOTER_BASE);
        }
    }
}

/** One command entry: name, meta, description, syntax, example, note. */
function drawCommand(pdf, state, cmd, pageTopic, separator = false) {
    const needed = measureCommand(pdf, cmd);
    const available = PAGE_H - MARGIN_B - state.y;

    // Move the whole entry to the next page rather than split it badly —
    // unless it is so long it cannot fit on any page.
    if (needed > available && needed < PAGE_H - CONTENT_TOP - MARGIN_B) {
        newPage(pdf, state, pageTopic);
    } else if (separator) {
        // Only rule between entries that share a page.
        pdf.setDrawColor(...HAIRLINE);
        pdf.setLineWidth(0.2);
        pdf.line(MARGIN_L, state.y - 6.6, PAGE_W - MARGIN_R, state.y - 6.6);
    }

    // Meta (mode · days · extra) first, so the command name can overrun it
    // only if it is genuinely long.
    const bits = [];
    if (cmd.mode) bits.push(cmd.mode);
    if (cmd.days && cmd.days.length) bits.push(cmd.days.map((d) => `Day ${d}`).join(', '));
    if (cmd.extra) bits.push('extra');

    if (bits.length) {
        pdf.setFont('times', 'italic');
        pdf.setFontSize(8.5);
        pdf.setTextColor(...MUTED);
        pdf.text(bits.join('  ·  '), PAGE_W - MARGIN_R, state.y, { align: 'right' });
    }

    // Command name
    pdf.setFont('courier', 'bold');
    pdf.setFontSize(10.5);
    pdf.setTextColor(...COMMAND);
    pdf.text(cmd.command, MARGIN_L, state.y);

    state.y += 5.4;

    // Description
    if (cmd.description) {
        pdf.setFont('times', 'normal');
        pdf.setFontSize(10);
        pdf.setTextColor(...TEXT);
        state.y = flow(pdf, cmd.description, MARGIN_L, state, TEXT_W, LEAD_BODY, pageTopic);
        state.y += 1.6;
    }

    if (cmd.syntax) state.y = codeBlock(pdf, state, 'Syntax', cmd.syntax, pageTopic);
    if (cmd.example) state.y = codeBlock(pdf, state, 'Example', cmd.example, pageTopic);

    // Note
    if (cmd.note) {
        state.y += 0.8;
        pdf.setFont('times', 'italic');
        pdf.setFontSize(9);
        pdf.setTextColor(...MUTED);
        state.y = flow(pdf, cmd.note, CODE_X, state, PAGE_W - MARGIN_R - CODE_X, LEAD_NOTE, pageTopic);
    }

    state.y += 6.2;
}

/**
 * A labelled monospace block: small right-aligned label in the gutter, and an
 * outlined box (no fill — kinder to a printer) holding the code.
 */
function codeBlock(pdf, state, label, text, pageTopic) {
    pdf.setFont('courier', 'normal');
    pdf.setFontSize(8.6);

    const lines = [];
    text.split('\n').forEach((raw) => {
        pdf.splitTextToSize(raw, CODE_W - 6).forEach((l) => lines.push(l));
    });

    const boxH = lines.length * LEAD_CODE + 3.4;

    if (state.y + boxH > PAGE_H - MARGIN_B) newPage(pdf, state, pageTopic);

    const boxTop = state.y - 3.4;

    // Label in the gutter, aligned with the first line of code.
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(7);
    pdf.setTextColor(...MUTED);
    pdf.text(label.toUpperCase(), LABEL_R, state.y, { align: 'right' });

    // Outline
    pdf.setDrawColor(...BORDER);
    pdf.setLineWidth(0.25);
    pdf.roundedRect(CODE_X - 3, boxTop, CODE_W + 3, boxH, 0.8, 0.8, 'S');

    pdf.setFont('courier', 'normal');
    pdf.setFontSize(8.6);
    pdf.setTextColor(...TEXT);

    let y = state.y;
    lines.forEach((l) => {
        pdf.text(l, CODE_X, y);
        y += LEAD_CODE;
    });

    return boxTop + boxH + 2.4;
}

/** Draw wrapped text, paginating if it runs past the bottom margin. */
function flow(pdf, text, x, state, width, leading, pageTopic) {
    const lines = pdf.splitTextToSize(text, width);
    let y = state.y;

    lines.forEach((line) => {
        if (y > PAGE_H - MARGIN_B) {
            state.y = y;
            newPage(pdf, state, pageTopic);
            y = state.y;
        }
        pdf.text(line, x, y);
        y += leading;
    });

    // `y` is now the baseline the *next* line would use, which is exactly
    // where the following element should start.
    return y;
}

function newPage(pdf, state, pageTopic) {
    pdf.addPage();
    state.page = pdf.getNumberOfPages();
    if (pageTopic && state.topic) pageTopic[state.page] = state.topic;
    state.y = CONTENT_TOP;
}

/** Rough height of a command entry, used to avoid bad page breaks. */
function measureCommand(pdf, cmd) {
    let h = 5.4;

    if (cmd.description) {
        pdf.setFont('times', 'normal');
        pdf.setFontSize(10);
        h += pdf.splitTextToSize(cmd.description, TEXT_W).length * LEAD_BODY + 1.6;
    }

    ['syntax', 'example'].forEach((key) => {
        if (!cmd[key]) return;
        pdf.setFont('courier', 'normal');
        pdf.setFontSize(8.6);
        let n = 0;
        cmd[key].split('\n').forEach((raw) => {
            n += pdf.splitTextToSize(raw, CODE_W - 6).length;
        });
        h += n * LEAD_CODE + 3.4 + 2.4;
    });

    if (cmd.note) {
        pdf.setFont('times', 'italic');
        pdf.setFontSize(9);
        h += pdf.splitTextToSize(cmd.note, PAGE_W - MARGIN_R - CODE_X).length * LEAD_NOTE + 0.8;
    }

    // Deliberately excludes the trailing gap after the entry: that whitespace
    // can spill past the bottom margin without hurting anything, and counting
    // it would push entries onto a new page unnecessarily.
    return h;
}
