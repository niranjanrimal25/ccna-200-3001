export default function notesPdfData() {
    return {
        busy: false,
        error: '',

        async download() {
            if (this.busy) return;

            const el = document.getElementById('notes-print');
            if (! el) {
                this.error = 'Notes content not found on this page.';
                console.error('Notes export container not found.');
                return;
            }

            this.busy = true;
            this.error = '';

            // Lazy-load the (heavy) PDF libraries only when the user
            // actually wants a PDF.
            const [{ jsPDF }, { default: html2canvas }] = await Promise.all([
                import('jspdf'),
                import('html2canvas'),
            ]);

            // Temporarily move the sheet into view so html2canvas can rasterize it.
            const prev = {
                position: el.style.position,
                left: el.style.left,
                top: el.style.top,
                zIndex: el.style.zIndex,
                opacity: el.style.opacity,
            };

            try {
                el.style.position = 'fixed';
                el.style.left = '0px';
                el.style.top = '0px';
                el.style.zIndex = '-9999';
                el.style.opacity = '1';

                // Make sure the handwriting webfonts are ready before rasterizing.
                if (document.fonts && document.fonts.ready) {
                    await document.fonts.ready;
                }
                await new Promise((r) => setTimeout(r, 120));

                // Clamp the raster scale so very tall lessons don't produce a
                // canvas that exceeds browser size limits / runs out of memory.
                const scale = Math.min(2, 4096 / Math.max(1, el.scrollWidth), 14000 / Math.max(1, el.scrollHeight));
                const canvas = await html2canvas(el, {
                    scale: Math.max(1, scale),
                    useCORS: true,
                    backgroundColor: '#ffffff',
                    logging: false,
                    windowWidth: el.scrollWidth,
                });

                const imgData = canvas.toDataURL('image/png');

                // A4 in mm.
                const pageWidth = 210;
                const pageHeight = 297;
                const imgWidth = pageWidth;
                const imgHeight = (canvas.height * imgWidth) / canvas.width;

                const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

                let heightLeft = imgHeight;
                let position = 0;

                pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
                heightLeft -= pageHeight;

                while (heightLeft > 0) {
                    position = heightLeft - imgHeight;
                    pdf.addPage();
                    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
                    heightLeft -= pageHeight;
                }

                pdf.save(el.dataset.filename || 'ccna-notes.pdf');
            } catch (error) {
                console.error('PDF export failed:', error);
                this.error = 'PDF export failed: ' + (error && error.message ? error.message : error);
            } finally {
                el.style.position = prev.position;
                el.style.left = prev.left;
                el.style.top = prev.top;
                el.style.zIndex = prev.zIndex;
                el.style.opacity = prev.opacity;
                this.busy = false;
            }
        },
    };
}
