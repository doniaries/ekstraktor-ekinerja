if (!window.__bknExtractorLoaded) {
    window.__bknExtractorLoaded = true;
    
    let lastClickedIku = '';

    document.addEventListener('click', (e) => {
        const btn = e.target.closest('button, a, .btn');
        if (btn && (btn.textContent.toLowerCase().includes('tambah') || btn.textContent.toLowerCase().includes('edit'))) {
            const tr = btn.closest('tr');
            if (tr) {
                const tds = Array.from(tr.querySelectorAll('td'));
                let ikuText = '';
                
                // Heuristik tabel e-Kinerja:
                // Jika baris pertama dari sebuah RHK, biasanya ada 6 atau lebih kolom (No, RHK, IKU, Target, dll)
                if (tds.length >= 6) {
                    ikuText = tds[2].innerText.trim();
                } 
                // Jika baris kedua/ketiga (karena No dan RHK di-rowspan), biasanya sisa 4-5 kolom (IKU, Target, dll)
                else if (tds.length >= 4) {
                    ikuText = tds[0].innerText.trim();
                } 
                else if (tds.length > 0) {
                    ikuText = tds[0].innerText.trim();
                }
                
                if (ikuText) {
                    lastClickedIku = ikuText.split('\n')[0].trim();
                }
            }
        }
    }, true);

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

            // Cari semua input teks dan textarea yang terlihat
            const inputs = Array.from(container.querySelectorAll('input[type="text"]:not([disabled]):not([readonly]), input[type="url"]:not([disabled]):not([readonly]), input:not([type]):not([disabled]):not([readonly]), textarea:not([disabled]):not([readonly])')).filter(el => {
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

            const inputs = Array.from(container.querySelectorAll('input[type="text"]:not([disabled]):not([readonly]), input[type="url"]:not([disabled]):not([readonly]), input:not([type]):not([disabled]):not([readonly]), textarea:not([disabled]):not([readonly])')).filter(el => {
                const style = window.getComputedStyle(el);
                return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
            });

            if (inputs.length >= 2) {
                // Biasanya input pertama adalah Nama Bukti Dukung, yang kedua adalah Link
                const namaInput = inputs[0];
                const linkInput = inputs[1];
                
                let finalNama = lastClickedIku || request.nama;

                namaInput.value = finalNama;
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
        
        if (request.action === 'fillRealisasi') {
            let success = false;
            let msg = '';
            
            try {
                const visibleModals = Array.from(document.querySelectorAll('.modal.show, .modal[style*="display: block"], .swal2-popup')).filter(el => {
                    const style = window.getComputedStyle(el);
                    return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
                });

                const container = visibleModals.length > 0 ? visibleModals[visibleModals.length - 1] : document;

                const inputs = Array.from(container.querySelectorAll('input[type="text"]:not([disabled]):not([readonly]), input[type="url"]:not([disabled]):not([readonly]), input:not([type]):not([disabled]):not([readonly]), textarea:not([disabled]):not([readonly])')).filter(el => {
                    const style = window.getComputedStyle(el);
                    return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
                });

                if (inputs.length >= 2) {
                    // Biasanya input pertama adalah Realisasi, yang kedua adalah Sumber Data
                    const realisasiInput = inputs[0];
                    const sumberDataInput = inputs[1];

                    // Isi Sumber Data dengan nama file
                    sumberDataInput.value = request.nama;
                    sumberDataInput.dispatchEvent(new Event('input', { bubbles: true }));
                    sumberDataInput.dispatchEvent(new Event('change', { bubbles: true }));
                    
                    // Isi Realisasi jika ada, jika tidak fokuskan
                    if (request.teksRealisasi) {
                        realisasiInput.value = request.teksRealisasi;
                        realisasiInput.dispatchEvent(new Event('input', { bubbles: true }));
                        realisasiInput.dispatchEvent(new Event('change', { bubbles: true }));
                    } else {
                        realisasiInput.focus();
                    }

                    success = true;
                    msg = 'Berhasil mengisi Realisasi dan Sumber Data!';
                } else {
                    msg = 'Tidak dapat menemukan kolom input Realisasi! Pastikan form popup sudah terbuka.';
                }

            } catch (error) {
                console.error('Error autofill realisasi:', error);
                msg = 'Terjadi kesalahan sistem autofill Realisasi.';
            }

            sendResponse({ success, msg });
            return true;
        }
    });
}
