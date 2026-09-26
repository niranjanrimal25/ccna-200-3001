/**
 * Builds the "Cisco Command Reference" PDF from the data embedded in the
 * Commands page.
 *
 * This deliberately does NOT use html2canvas (unlike the per-lesson notebook
 * export). With ~200 commands the rendered element is far taller than the
 * browser's maximum canvas height, which would either fail outright or force
 * a downscale that blurs the text and slices lines across page breaks.
 * Drawing straight into jsPDF instead gives crisp, selectable, searchable
 * text, correct page breaks and a much smaller file, while keeping the
 * ruled-paper study-notes look used elsewhere in the app.
 */

// A4 portrait, millimetres.
const PAGE_W = 210;
const PAGE_H = 297;

const MARGIN_L = 24; // text starts right of the red margin rule
const MARGIN_R = 14;
const MARGIN_T = 20;
const MARGIN_B = 18;
const RULE_X = 19; // red vertical margin rule

const LINE = 5.4; // ruled-line spacing; every row of text is a multiple of this
const TEXT_W = PAGE_W - MARGIN_L - MARGIN_R;

// Colours, matching the notebook CSS.
const INK = [27, 42, 82];
const HEADING = [20, 48, 107];
const COMMAND = [11, 92, 87];
const MUTED = [74, 91, 130];
const RULE = [188, 208, 233];
const RED = [196, 74, 82];
const PAPER = [255, 253, 245];
const CODE_BG = [243, 243, 234];
const AMBER = [150, 95, 10];

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
                // Lazy-load the heavy library only when actually needed.
                const { jsPDF } = await import('jspdf');
                const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
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
    const state = { y: 0, page: 1 };

    // ---- Page 1: title + contents -------------------------------------
    paintPage(pdf);
    state.y = MARGIN_T + LINE;

    pdf.setTextColor(...HEADING);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(20);
    pdf.text('Cisco Command Reference', MARGIN_L, state.y);
    state.y += LINE * 1.6;

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(10.5);
    pdf.setTextColor(...MUTED);

    const total = topics.reduce((n, t) => n + t.count, 0);
    pdf.text(`CCNA 200-301 study notes  ·  ${total} commands  ·  ${topics.length} topics`, MARGIN_L, state.y);
    state.y += LINE;
    pdf.text(
        new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }),
        MARGIN_L,
        state.y
    );
    state.y += LINE * 2;

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(13);
    pdf.setTextColor(...HEADING);
    pdf.text('Contents', MARGIN_L, state.y);
    state.y += LINE * 0.4;
    pdf.setDrawColor(...RULE);
    pdf.setLineWidth(0.4);
    pdf.line(MARGIN_L, state.y, PAGE_W - MARGIN_R, state.y);
    state.y += LINE * 1.2;

    const tocTop = state.y;

    // ---- Body ----------------------------------------------------------
    pdf.addPage();
    paintPage(pdf);
    state.page = 2;
    state.y = MARGIN_T;

    const tocEntries = [];

    // Height consumed by the headings themselves.
    const TOPIC_HEAD_H = LINE * 1.6;
    const GROUP_HEAD_H = LINE * 1.05;

    topics.forEach((topic, topicIndex) => {
        // Never leave a topic heading (and its first group heading) stranded
        // at the foot of a page — keep them with at least one whole command.
        const firstCmd = topic.groups[0]?.commands[0];
        const topicNeed =
            TOPIC_HEAD_H + GROUP_HEAD_H + (firstCmd ? measureCommand(pdf, firstCmd) : 0);

        if (state.y + topicNeed > PAGE_H - MARGIN_B) newPage(pdf, state);

        if (topicIndex > 0) state.y += LINE * 0.8;

        tocEntries.push({ title: topic.topic, count: topic.count, page: state.page });

        // Topic heading
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(14);
        pdf.setTextColor(...HEADING);
        pdf.text(topic.topic, MARGIN_L, state.y);

        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(9);
        pdf.setTextColor(...MUTED);
        pdf.text(`${topic.count} commands`, PAGE_W - MARGIN_R, state.y, { align: 'right' });

        state.y += LINE * 0.45;
        pdf.setDrawColor(...HEADING);
        pdf.setLineWidth(0.5);
        pdf.line(MARGIN_L, state.y, PAGE_W - MARGIN_R, state.y);
        state.y += LINE * 1.15;

        topic.groups.forEach((group) => {
            // Same for a group heading: it must be followed by a command.
            const groupNeed =
                GROUP_HEAD_H + (group.commands[0] ? measureCommand(pdf, group.commands[0]) : 0);

            if (state.y + groupNeed > PAGE_H - MARGIN_B) newPage(pdf, state);

            // Group sub-heading
            pdf.setFont('helvetica', 'bold');
            pdf.setFontSize(10);
            pdf.setTextColor(...COMMAND);
            pdf.text(group.label.toUpperCase(), MARGIN_L, state.y);
            state.y += LINE * 1.05;

            group.commands.forEach((cmd) => drawCommand(pdf, state, cmd));

            state.y += LINE * 0.35;
        });
    });

    // ---- Contents entries, now that page numbers are known --------------
    pdf.setPage(1);
    let ty = tocTop;
    tocEntries.forEach((entry) => {
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(10.5);
        pdf.setTextColor(...INK);

        const label = entry.title;
        const pageLabel = String(entry.page);
        const labelW = pdf.getTextWidth(label);
        const pageW = pdf.getTextWidth(pageLabel);

        pdf.text(label, MARGIN_L, ty);
        pdf.text(pageLabel, PAGE_W - MARGIN_R, ty, { align: 'right' });

        // Dot leader between the title and the page number.
        const dotStart = MARGIN_L + labelW + 2;
        const dotEnd = PAGE_W - MARGIN_R - pageW - 2;
        if (dotEnd > dotStart) {
            pdf.setTextColor(...RULE);
            const dots = '.'.repeat(Math.max(0, Math.floor((dotEnd - dotStart) / pdf.getTextWidth('.'))));
            pdf.text(dots, dotStart, ty);
        }

        pdf.setTextColor(...MUTED);
        pdf.setFontSize(8.5);
        ty += LINE * 1.25;
    });

    // ---- Footers --------------------------------------------------------
    const pageCount = pdf.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        pdf.setPage(i);
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(8);
        pdf.setTextColor(...MUTED);
        pdf.text('CCNA 200-301 · Cisco Command Reference', MARGIN_L, PAGE_H - 9);
        pdf.text(`${i} / ${pageCount}`, PAGE_W - MARGIN_R, PAGE_H - 9, { align: 'right' });
    }
}

/** One command entry: name, mode, description, syntax, example, note. */
function drawCommand(pdf, state, cmd) {
    // Estimate the height so an entry is not split awkwardly across pages.
    const needed = measureCommand(pdf, cmd);
    const available = PAGE_H - MARGIN_B - state.y;
    if (needed > available && needed < PAGE_H - MARGIN_T - MARGIN_B) {
        newPage(pdf, state);
    }

    // Command name
    pdf.setFont('courier', 'bold');
    pdf.setFontSize(11);
    pdf.setTextColor(...COMMAND);
    pdf.text(cmd.command, MARGIN_L, state.y);

    // Badges on the right: mode, day numbers, EXTRA
    const bits = [];
    if (cmd.mode) bits.push(cmd.mode);
    if (cmd.days && cmd.days.length) bits.push(cmd.days.map((d) => `Day ${d}`).join(', '));
    if (cmd.extra) bits.push('extra');

    if (bits.length) {
        pdf.setFont('helvetica', 'italic');
        pdf.setFontSize(8);
        pdf.setTextColor(...(cmd.extra ? AMBER : MUTED));
        pdf.text(bits.join('  ·  '), PAGE_W - MARGIN_R, state.y, { align: 'right' });
    }

    state.y += LINE;

    // Description
    if (cmd.description) {
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(9.5);
        pdf.setTextColor(...INK);
        state.y = wrapped(pdf, cmd.description, MARGIN_L + 2, state, TEXT_W - 2);
    }

    // Syntax and example as labelled monospace blocks
    if (cmd.syntax) state.y = codeBlock(pdf, state, 'Syntax', cmd.syntax);
    if (cmd.example) state.y = codeBlock(pdf, state, 'Example', cmd.example);

    // Note
    if (cmd.note) {
        pdf.setFont('helvetica', 'italic');
        pdf.setFontSize(8.5);
        pdf.setTextColor(...MUTED);
        state.y = wrapped(pdf, cmd.note, MARGIN_L + 5, state, TEXT_W - 5);
    }

    state.y += LINE * 0.55;
}

/** A labelled monospace block with a tinted background. */
function codeBlock(pdf, state, label, text) {
    const x = MARGIN_L + 2;
    const innerW = TEXT_W - 16;

    pdf.setFont('courier', 'normal');
    pdf.setFontSize(8.8);
    const lines = [];
    text.split('\n').forEach((raw) => {
        pdf.splitTextToSize(raw, innerW).forEach((l) => lines.push(l));
    });

    const blockH = lines.length * (LINE * 0.82) + 2.4;

    if (state.y + blockH > PAGE_H - MARGIN_B) newPage(pdf, state);

    // Label
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(7.5);
    pdf.setTextColor(...MUTED);
    pdf.text(label.toUpperCase(), x, state.y);

    // Background
    pdf.setFillColor(...CODE_BG);
    pdf.rect(x + 14, state.y - 3.2, innerW + 2, blockH, 'F');
    pdf.setDrawColor(...RULE);
    pdf.setLineWidth(0.2);
    pdf.line(x + 14, state.y - 3.2, x + 14, state.y - 3.2 + blockH);

    pdf.setFont('courier', 'normal');
    pdf.setFontSize(8.8);
    pdf.setTextColor(...INK);

    let y = state.y;
    lines.forEach((l) => {
        pdf.text(l, x + 16, y);
        y += LINE * 0.82;
    });

    return y + 1.2;
}

/** Draw wrapped text, paginating if it runs off the bottom. */
function wrapped(pdf, text, x, state, width) {
    const lines = pdf.splitTextToSize(text, width);
    let y = state.y;

    lines.forEach((line) => {
        if (y > PAGE_H - MARGIN_B) {
            state.y = y;
            newPage(pdf, state);
            y = state.y;
        }
        pdf.text(line, x, y);
        y += LINE * 0.85;
    });

    return y + 0.8;
}

function newPage(pdf, state) {
    pdf.addPage();
    paintPage(pdf);
    state.page = pdf.getNumberOfPages();
    state.y = MARGIN_T;
}

/** Cream paper, blue ruled lines and the red margin rule. */
function paintPage(pdf) {
    pdf.setFillColor(...PAPER);
    pdf.rect(0, 0, PAGE_W, PAGE_H, 'F');

    pdf.setDrawColor(...RULE);
    pdf.setLineWidth(0.15);
    for (let y = MARGIN_T; y <= PAGE_H - MARGIN_B + LINE; y += LINE) {
        pdf.line(MARGIN_L - 4, y + 1.4, PAGE_W - MARGIN_R, y + 1.4);
    }

    pdf.setDrawColor(...RED);
    pdf.setLineWidth(0.5);
    pdf.line(RULE_X, 10, RULE_X, PAGE_H - 10);
}

/** Rough height of a command entry, used to avoid bad page breaks. */
function measureCommand(pdf, cmd) {
    let h = LINE;

    if (cmd.description) {
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(9.5);
        h += pdf.splitTextToSize(cmd.description, TEXT_W - 2).length * (LINE * 0.85) + 0.8;
    }

    ['syntax', 'example'].forEach((key) => {
        if (!cmd[key]) return;
        pdf.setFont('courier', 'normal');
        pdf.setFontSize(8.8);
        let n = 0;
        cmd[key].split('\n').forEach((raw) => {
            n += pdf.splitTextToSize(raw, TEXT_W - 16).length;
        });
        h += n * (LINE * 0.82) + 3.6;
    });

    if (cmd.note) {
        pdf.setFont('helvetica', 'italic');
        pdf.setFontSize(8.5);
        h += pdf.splitTextToSize(cmd.note, TEXT_W - 5).length * (LINE * 0.85) + 0.8;
    }

    return h + LINE * 0.55;
}
