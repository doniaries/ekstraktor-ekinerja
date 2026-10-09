chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'fillAksi') {
        let success = false;
        let msg = '';
        
        try {
            // Logika Heuristik untuk mencari input yang terlihat di modal
            // Modal pada e-kinerja biasanya menggunakan bootstrap modal atau sweetalert
            const visibleModals = Array.from(document.querySelectorAll('.modal.show, .modal[style*="display: block"], .swal2-popup')).filter(el => {
                const style = window.getComputedStyle(el);
                return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
            });

            const container = visibleModals.length > 0 ? visibleModals[visibleModals.length - 1] : document;

            // Cari semua input teks (termasuk tanpa atribut type) dan textarea yang terlihat
            const inputs = Array.from(container.querySelectorAll('input:not([type="hidden"]):not([type="radio"]):not([type="checkbox"]):not([type="submit"]):not([type="button"]):not([disabled]):not([readonly]), textarea:not([disabled]):not([readonly])')).filter(el => {
                const style = window.getComputedStyle(el);
                return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
            });

            let aksiInput = null;
            let targetInput = null;

            if (inputs.length >= 2) {
                // Biasanya input pertama adalah Rencana Aksi, yang kedua adalah Target
                aksiInput = inputs[0];
                targetInput = inputs[1];
            } else if (inputs.length === 1) {
                aksiInput = inputs[0];
            }

            if (aksiInput) {
                // Isi nilai rencana aksi
                aksiInput.value = request.rencanaAksi;
                aksiInput.dispatchEvent(new Event('input', { bubbles: true }));
                aksiInput.dispatchEvent(new Event('change', { bubbles: true }));
                
                // Isi nilai target jika ada
                if (targetInput && request.target) {
                    targetInput.value = request.target;
                    targetInput.dispatchEvent(new Event('input', { bubbles: true }));
                    targetInput.dispatchEvent(new Event('change', { bubbles: true }));
                }

                success = true;
                msg = 'Berhasil mengisi Rencana Aksi dan Target!';
            } else {
                msg = 'Tidak dapat menemukan kolom input! Pastikan form popup sudah terbuka.';
            }

        } catch (error) {
            console.error('Error autofill:', error);
            msg = 'Terjadi kesalahan sistem autofill.';
        }

        sendResponse({ success, msg });
        return true;
    }
    
    if (request.action === 'fillBukti') {
        let success = false;
        let msg = '';
        
        try {
            const visibleModals = Array.from(document.querySelectorAll('.modal.show, .modal[style*="display: block"], .swal2-popup')).filter(el => {
                const style = window.getComputedStyle(el);
                return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
            });

            const container = visibleModals.length > 0 ? visibleModals[visibleModals.length - 1] : document;

            const inputs = Array.from(container.querySelectorAll('input:not([type="hidden"]):not([type="radio"]):not([type="checkbox"]):not([type="submit"]):not([type="button"]):not([disabled]):not([readonly]), textarea:not([disabled]):not([readonly])')).filter(el => {
                const style = window.getComputedStyle(el);
                return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
            });

            if (inputs.length >= 2) {
                // Biasanya input pertama adalah Nama Bukti Dukung, yang kedua adalah Link
                const namaInput = inputs[0];
                const linkInput = inputs[1];

                namaInput.value = request.nama;
                namaInput.dispatchEvent(new Event('input', { bubbles: true }));
                namaInput.dispatchEvent(new Event('change', { bubbles: true }));

                linkInput.value = request.link;
                linkInput.dispatchEvent(new Event('input', { bubbles: true }));
                linkInput.dispatchEvent(new Event('change', { bubbles: true }));

                success = true;
                msg = 'Berhasil mengisi Bukti Dukung!';
            } else {
                msg = 'Tidak dapat menemukan kolom input Bukti Dukung! Pastikan form popup sudah terbuka.';
            }

        } catch (error) {
            console.error('Error autofill bukti:', error);
            msg = 'Terjadi kesalahan sistem autofill.';
        }

        sendResponse({ success, msg });
        return true;
    }
});
