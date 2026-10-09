document.addEventListener('DOMContentLoaded', () => {
    const btnFetchSheet = document.getElementById('btn-fetch-sheet');
    const btnParseClipboard = document.getElementById('btn-parse-clipboard');
    const btnClear = document.getElementById('btn-clear');
    const resultsSection = document.getElementById('results-section');
    const itemList = document.getElementById('item-list');
    const countBadge = document.getElementById('count-badge');
    const searchInput = document.getElementById('search-input');
    const toast = document.getElementById('toast');

    let parsedData = [];

    const defaultData = [
        { id: 1, sasaran: 'Meningkatnya daya tarik pariwisata', indikator: 'Persentase peningkatan promosi pariwisata', target: '5,88' },
        { id: 2, sasaran: 'Meningkatnya kawasan pengembangan pariwisata', indikator: 'Persentase SI DEWI MANDE', target: '50%' },
        { id: 3, sasaran: 'Meningkatnya Promosi pariwisata', indikator: 'Jumlah media promosi pariwisata yang digunakan', target: '17 Promosi' },
        { id: 4, sasaran: 'Meningkatnya program inovatif one village one event', indikator: 'Meningkatnya program inovatif one village one event', target: '4 Even' },
        { id: 5, sasaran: 'Meningkatnya kualitas ekosistem ekonomi kreatif', indikator: '1. Persentase peningkatan kapasitas SDM Ekraf', target: '14%' },
        { id: 6, sasaran: 'Meningkatnya kualitas ekosistem ekonomi kreatif', indikator: '2. Persentase produk ekonomi kreatif yang memiliki HKI', target: '18,25%' },
        { id: 7, sasaran: 'Meningkatnya kualitas ekosistem ekonomi kreatif', indikator: '3. Persentase peningkatan jumlah pelaku ekonomi kreatif', target: '6,67%' },
        { id: 8, sasaran: 'Meningkatnya produk ekonomi kreatif yang memilliki HKI', indikator: 'Jumlah produk Ekonomi Kreatif yang memiliki HKI', target: '5 HKI' }
    ];

    // Load saved data
    chrome.storage.local.get(['skpData'], (result) => {
        if (result.skpData && result.skpData.length > 0) {
            parsedData = result.skpData;
            renderList(parsedData);
        } else {
            // Load default template if empty
            parsedData = defaultData;
            chrome.storage.local.set({ skpData: parsedData });
            renderList(parsedData);
        }
    });

    function processText(text) {
        const data = parseTsv(text);
        if (data.length > 0) {
            parsedData = data;
            chrome.storage.local.set({ skpData: parsedData });
            renderList(parsedData);
            showToast('Data berhasil diproses!');
        } else {
            showToast('Format tidak dikenali!', true);
        }
    }

    btnFetchSheet.addEventListener('click', async () => {
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            
            if (!tab || !tab.url || !tab.url.includes('docs.google.com/spreadsheets')) {
                showToast('Silakan buka file Google Sheet terlebih dahulu!', true);
                return;
            }
            
            const match = tab.url.match(/\/d\/([a-zA-Z0-9-_]+)/);
            if (!match) {
                showToast('URL Google Sheet tidak valid!', true);
                return;
            }
            
            const spreadsheetId = match[1];
            let gid = '0';
            const gidMatch = tab.url.match(/[#&]gid=([0-9]+)/);
            if (gidMatch) {
                gid = gidMatch[1];
            }
            
            const originalHtml = btnFetchSheet.innerHTML;
            btnFetchSheet.textContent = 'Mengambil Data...';
            btnFetchSheet.disabled = true;
            
            const exportUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=tsv&gid=${gid}`;
            const response = await fetch(exportUrl);
            
            if (!response.ok) {
                throw new Error('Gagal mengunduh data. Pastikan Anda memiliki akses ke sheet ini.');
            }
            
            const text = await response.text();
            processText(text);
            
            btnFetchSheet.innerHTML = originalHtml;
            btnFetchSheet.disabled = false;
        } catch (error) {
            console.error(error);
            showToast('Error: ' + error.message, true);
            btnFetchSheet.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="8" y1="13" x2="16" y2="13"></line><line x1="8" y1="17" x2="16" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg> Ambil dari Google Sheet Aktif';
            btnFetchSheet.disabled = false;
        }
    });

    btnParseClipboard.addEventListener('click', async () => {
        try {
            const text = await navigator.clipboard.readText();
            if (!text || !text.trim()) {
                showToast('Clipboard kosong!', true);
                return;
            }
            processText(text);
        } catch (err) {
            console.error(err);
            showToast('Gagal membaca clipboard. Izinkan akses jika diminta.', true);
        }
    });

    btnClear.addEventListener('click', () => {
        if (confirm('Hapus semua data tersimpan?')) {
            parsedData = [];
            chrome.storage.local.remove(['skpData']);
            renderList([]);
            pasteArea.value = '';
        }
    });

    searchInput.addEventListener('input', (e) => {
        const keyword = e.target.value.toLowerCase();
        const filtered = parsedData.filter(item => 
            item.sasaran.toLowerCase().includes(keyword) || 
            item.indikator.toLowerCase().includes(keyword)
        );
        renderList(filtered);
    });

    function parseTsv(text) {
        const lines = text.trim().split('\n');
        let lastSasaran = '';
        const results = [];
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].replace(/\r/g, ''); 
            if (!line.trim()) continue;
            
            const cols = line.split('\t');
            
            if (cols.length >= 2) {
                let sasaran = cols[0] ? cols[0].trim() : '';
                const sasaranLower = sasaran.toLowerCase();
                
                // Skip header rows commonly found in SKP tables
                if (sasaranLower.includes('sasaran strategis') || sasaranLower === 'sasaran' || sasaranLower.includes('rencana hasil kerja')) {
                    continue;
                }

                if (sasaran) {
                    lastSasaran = sasaran;
                } else {
                    sasaran = lastSasaran;
                }
                
                let indikator = cols[1] ? cols[1].trim() : '';
                let target = cols[2] ? cols[2].trim() : '';
                
                // Hapus nomor urut di awal teks (misal: "1. ", "2. ")
                indikator = indikator.replace(/^\d+\.\s*/, '');
                target = target.replace(/^\d+\.\s*/, '');
                
                // Only push if there is an indikator (rencana aksi/indikator kinerja)
                if (sasaran && indikator) {
                    results.push({
                        id: Date.now() + i,
                        sasaran,
                        indikator,
                        target
                    });
                }
            }
        }
        return results;
    }

    function renderList(data) {
        itemList.innerHTML = '';
        countBadge.textContent = `${data.length} item`;

        if (data.length === 0) {
            resultsSection.style.display = 'none';
            return;
        }

        resultsSection.style.display = 'flex';

        // Kelompokkan berdasarkan Sasaran
        const grouped = {};
        data.forEach(item => {
            if (!grouped[item.sasaran]) {
                grouped[item.sasaran] = [];
            }
            grouped[item.sasaran].push(item);
        });

        // Render HTML
        for (const [sasaran, items] of Object.entries(grouped)) {
            const groupDiv = document.createElement('div');
            groupDiv.className = 'sasaran-group';

            const headerDiv = document.createElement('div');
            headerDiv.className = 'group-header';
            headerDiv.innerHTML = `
                <div style="flex:1; padding-right:10px;">${sasaran} <span style="font-size: 11px; opacity:0.7; font-weight:normal;">(${items.length} aksi)</span></div>
                <svg class="toggle-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
            `;
            
            const contentDiv = document.createElement('div');
            contentDiv.className = 'group-content';
            
            headerDiv.onclick = () => {
                headerDiv.classList.toggle('active');
                contentDiv.classList.toggle('active');
            };

            items.forEach((item, index) => {
                const itemDiv = document.createElement('div');
                itemDiv.className = 'data-card';
                itemDiv.style.background = 'var(--surface)';
                itemDiv.style.border = '1px solid var(--border)';
                itemDiv.style.padding = '12px';
                itemDiv.style.borderRadius = '8px';
                
                const uniqueId = \`\${Date.now()}-\${index}\`;
                
                // Gunakan innerHTML penuh untuk memastikan tombol terender
                itemDiv.innerHTML = \`
                    <div style="font-size:10px; color:var(--text-secondary); text-transform:uppercase; font-weight:600; letter-spacing:0.5px; margin-bottom:4px;">Rencana Aksi</div>
                    <div style="font-weight:600; margin-bottom:6px; color:var(--text-primary); line-height:1.4;">\${item.indikator}</div>
                    \${item.target ? \`<div style="font-size:12px; color:var(--text-secondary);">Target: <span style="font-weight:600; color:var(--text-primary);">\${item.target}</span></div>\` : ''}
                    <div style="display:flex; gap:6px; margin-top:12px;">
                        <button class="btn-primary" style="flex:1; justify-content:center;" id="isi-\${uniqueId}">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg> 
                            Isi Form E-Kinerja
                        </button>
                        <button class="copy-btn" style="padding:8px 10px;" id="copy-\${uniqueId}" title="Copy Text">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                        </button>
                    </div>
                \`;
                
                contentDiv.appendChild(itemDiv);

                // Tambahkan event listener setelah elemen dimasukkan
                setTimeout(() => {
                    const isiBtn = document.getElementById(\`isi-\${uniqueId}\`);
                    const copyBtn = document.getElementById(\`copy-\${uniqueId}\`);
                    
                    if (isiBtn) {
                        isiBtn.onclick = () => {
                            chrome.tabs.query({url: "*://*.bkn.go.id/*"}, (tabs) => {
                                const targetTab = tabs.find(t => t.url.includes('kinerja.bkn.go.id'));
                                if (targetTab) {
                                    chrome.tabs.sendMessage(targetTab.id, { action: 'fillAksi', rencanaAksi: item.indikator, target: item.target }, (response) => {
                                        if (response && response.success) {
                                            showToast(response.msg);
                                        } else {
                                            showToast(response ? response.msg : 'Gagal terhubung! Coba reload tab e-kinerja.', true);
                                        }
                                    });
                                } else {
                                    showToast('Buka tab kinerja.bkn.go.id terlebih dahulu!', true);
                                }
                            });
                        };
                    }
                    
                    if (copyBtn) {
                        copyBtn.onclick = () => copyToClipboard(item.indikator);
                    }
                }, 0);
            });

            groupDiv.appendChild(headerDiv);
            groupDiv.appendChild(contentDiv);
            itemList.appendChild(groupDiv);
        }
    }

    async function copyToClipboard(text) {
        if (!text) return;
        try {
            await navigator.clipboard.writeText(text);
            showToast('Teks berhasil disalin!');
        } catch (err) {
            console.error('Failed to copy text: ', err);
            // Fallback for older browsers
            const textarea = document.createElement('textarea');
            textarea.value = text;
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
            showToast('Teks berhasil disalin!');
        }
    }

    let toastTimeout;
    function showToast(message, isError = false) {
        toast.textContent = message;
        toast.style.background = isError ? '#ef4444' : '#10b981';
        toast.classList.add('show');
        
        clearTimeout(toastTimeout);
        toastTimeout = setTimeout(() => {
            toast.classList.remove('show');
        }, 2000);
    }
});
