class MaterialApp {
    constructor() {
        this.materials = JSON.parse(localStorage.getItem('obra_materials')) || [
            { id: 1, desc: 'Cimento', qtd: 5, unid: 'sacos', solicitante: 'Jamanta', status: 'Pedido solicitado', data_pedido: '2025-03-08', valor: 0, data_entrega: '', nota: '' }
        ];
        this.reports = JSON.parse(localStorage.getItem('obra_reports')) || [];
        this.currentReportPhotos = [];
        this.mode = 'solicitar';
        this.init();
    }

    init() {
        this.renderTable();
        this.setupForm();
    }

    switchView(viewId) {
        document.querySelectorAll('.view-container').forEach(v => v.classList.remove('active'));
        document.getElementById(viewId).classList.add('active');
        lucide.createIcons();
    }

    enterMaterialMode(mode) {
        this.mode = mode;
        document.body.className = `mode-${mode}`;
        
        // Update Title
        const titleMap = {
            'solicitar': 'Solicitar Material',
            'processar': 'Processar Material',
            'historico': 'Histórico de Solicitações'
        };
        const titleEl = document.getElementById('material-view-title');
        if (titleEl) titleEl.innerText = titleMap[mode] || 'Gestão de Materiais';

        // Show/Hide Novo Pedido button (only in solicitar mode)
        const btnAdd = document.querySelector('.btn-add');
        if (btnAdd) {
            btnAdd.style.display = mode === 'solicitar' ? 'flex' : 'none';
        }

        this.renderTable();
        this.switchView('material-view');
    }

    renderTable() {
        const tbody = document.getElementById('materials-body');
        tbody.innerHTML = '';

        // Filter based on mode
        let filtered = this.materials;
        if (this.mode === 'solicitar' || this.mode === 'processar') {
            filtered = this.materials.filter(m => m.status === 'Pedido solicitado');
        } else if (this.mode === 'historico') {
            filtered = this.materials.filter(m => m.status !== 'Pedido solicitado');
        }

        filtered.forEach(item => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td data-label="Data">${this.formatDate(item.data_pedido)}</td>
                <td data-label="Descrição">${item.desc}</td>
                <td data-label="Qtd">${item.qtd}</td>
                <td data-label="Unidade">${item.unid || '-'}</td>
                <td data-label="Solicitante">${item.solicitante || '-'}</td>
                <td data-label="Valor" class="processor-info">R$ ${Number(item.valor || 0).toFixed(2)}</td>
                <td data-label="Status"><span class="status-badge status-${(item.status || 'solicitado').toLowerCase().replace(' ', '-')}">${item.status || 'Pedido solicitado'}</span></td>
                <td data-label="Processador" class="processor-info">${item.processador || '-'}</td>
                <td data-label="Processamento" class="processor-info">${this.formatDate(item.data_processamento)}</td>
                <td data-label="Entrega" class="processor-info">${this.formatDate(item.data_entrega)}</td>
                <td data-label="Ações">
                    <div class="btn-group" style="white-space: nowrap; display: flex; gap: 0.5rem; justify-content: flex-end;">
                        ${this.mode === 'historico' && item.status !== 'Entregue' ? `
                            <button class="action-btn" title="Marcar como Entregue" onclick="app.markAsDelivered(${item.id})" style="color:var(--success); border-color: rgba(34, 197, 94, 0.3)">
                                <i data-lucide="check-circle" style="width:16px; margin-right: 4px;"></i>
                                <span>Entregue</span>
                            </button>
                        ` : ''}
                        <button class="action-btn" title="${this.mode === 'processar' ? 'Processar' : 'Alterar'}" onclick="app.editEntry(${item.id})">
                            <i data-lucide="${this.mode === 'processar' ? 'clipboard-check' : 'edit-2'}" style="width:16px; margin-right: 4px;"></i>
                            <span>${this.mode === 'processar' ? 'Processar' : 'Alterar'}</span>
                        </button>
                        <button class="action-btn" title="Excluir" onclick="app.deleteEntry(${item.id})" style="color:var(--danger)">
                            <i data-lucide="trash-2" style="width:16px; margin-right: 4px;"></i>
                            <span>Excluir</span>
                        </button>
                    </div>
                </td>
            `;
            tbody.appendChild(tr);
        });

        // Update summary
        let solicitado = 0;
        let pendente = 0;
        let entregue = 0;
        this.materials.forEach(m => {
            if (m.status === 'Entregue') entregue++;
            else if (m.status === 'Pendente' || m.status === 'Pedido aguardando entrega') pendente++;
            else solicitado++;
        });
        document.getElementById('total-solicitado').innerText = solicitado;
        document.getElementById('total-pendente').innerText = pendente;
        document.getElementById('total-entregue').innerText = entregue;

        localStorage.setItem('obra_materials', JSON.stringify(this.materials));
        lucide.createIcons();
    }


    formatDate(dateStr) {
        if (!dateStr) return '-';
        const [year, month, day] = dateStr.split('-');
        return `${day}/${month}/${year}`;
    }

    setupForm() {
        const form = document.getElementById('material-form');
        form.onsubmit = (e) => {
            e.preventDefault();
            const id = document.getElementById('edit-id').value;
            const unidSelect = document.getElementById('unid').value;
            const customUnid = document.getElementById('custom-unid').value;
            
            const data = {
                id: id ? parseInt(id) : Date.now(),
                desc: document.getElementById('desc').value,
                qtd: document.getElementById('qtd').value,
                unid: unidSelect === 'custom' ? customUnid : unidSelect,
                solicitante: document.getElementById('solicitante').value,
                status: this.mode === 'processar' ? document.getElementById('status').value : 'Pedido solicitado',
                data_pedido: document.getElementById('data_pedido').value,
                valor: document.getElementById('valor').value || 0,
                data_entrega: document.getElementById('data_entrega').value || '',
                nota: document.getElementById('nota').value || '',
                processador: document.getElementById('processador').value || '',
                data_processamento: document.getElementById('data_processamento').value || ''
            };

            if (id) {
                const index = this.materials.findIndex(m => m.id === parseInt(id));
                this.materials[index] = data;
            } else {
                this.materials.push(data);
            }

            this.renderTable();
            this.closeModal();
        };
    }

    selectMaterial(material) {
        // Deselect others
        document.querySelectorAll('.material-chip').forEach(c => c.classList.remove('selected'));
        // Find chip and select
        const chips = Array.from(document.querySelectorAll('.material-chip'));
        const chip = chips.find(c => c.innerText === material);
        if (chip) chip.classList.add('selected');
        
        document.getElementById('desc').value = material;
        document.getElementById('custom-material-group').style.display = 'none';
    }

    toggleCustomMaterial() {
        document.querySelectorAll('.material-chip').forEach(c => c.classList.remove('selected'));
        document.getElementById('custom-material-group').style.display = 'block';
        document.getElementById('desc').value = '';
        document.getElementById('desc').focus();
    }

    openModal(data = null) {
        document.getElementById('material-modal').style.display = 'flex';
        document.getElementById('modal-title').innerText = data ? 'Alterar Pedido' : 'Novo Pedido';
        
        document.getElementById('custom-material-group').style.display = 'none';
        document.querySelectorAll('.material-chip').forEach(c => c.classList.remove('selected'));

        if (data) {
            document.getElementById('edit-id').value = data.id;
            document.getElementById('desc').value = data.desc;
            document.getElementById('qtd').value = data.qtd;
            
            // Populate Summary (for processor mode)
            document.getElementById('sum-desc').innerText = data.desc;
            document.getElementById('sum-qtd').innerText = data.qtd;
            document.getElementById('sum-unid').innerText = data.unid || '';
            document.getElementById('sum-solicitante').innerText = data.solicitante || '-';
            document.getElementById('sum-data').innerText = this.formatDate(data.data_pedido);

            // Handle unit loading
            const standardUnits = ['kg', 'sacos', 'm³', 'm²', 'unid', 'pacotes'];
            if (standardUnits.includes(data.unid)) {
                document.getElementById('unid').value = data.unid;
                document.getElementById('custom-unid-group').style.display = 'none';
            } else if (data.unid) {
                document.getElementById('unid').value = 'custom';
                document.getElementById('custom-unid-group').style.display = 'block';
                document.getElementById('custom-unid').value = data.unid;
            } else {
                document.getElementById('unid').value = '';
                document.getElementById('custom-unid-group').style.display = 'none';
            }
            
            document.getElementById('solicitante').value = data.solicitante || '';
            document.getElementById('data_pedido').value = data.data_pedido;
            
            // Processor fields requirements
            const isProcessar = this.mode === 'processar';
            document.getElementById('processador').required = isProcessar;
            document.getElementById('data_processamento').required = isProcessar;
            
            // Adjust Solicitor fields requirements (they should only be required when visible)
            const isSolicitar = !isProcessar;
            document.getElementById('data_pedido').required = isSolicitar;
            document.getElementById('qtd').required = isSolicitar;
            document.getElementById('unid').required = isSolicitar;
            document.getElementById('solicitante').required = isSolicitar;
            
            // Critical: Ensure custom fields don't block saving if they are hidden
            const customUnid = document.getElementById('custom-unid');
            if (customUnid) customUnid.required = isSolicitar && document.getElementById('unid').value === 'custom';

            let currentStatus = data.status || 'Pedido solicitado';
            if (isProcessar && currentStatus === 'Pedido solicitado') {
                currentStatus = 'Pedido aguardando entrega';
            }
            document.getElementById('status').value = currentStatus;
            document.getElementById('valor').value = data.valor || '';
            document.getElementById('data_entrega').value = data.data_entrega || '';
            document.getElementById('nota').value = data.nota || '';
            document.getElementById('processador').value = data.processador || '';
            document.getElementById('data_processamento').value = data.data_processamento || new Date().toISOString().split('T')[0];
        } else {
            document.getElementById('material-form').reset();
            document.getElementById('edit-id').value = '';
            
            // Reset requirements for solicitar mode
            document.getElementById('processador').required = false;
            document.getElementById('data_processamento').required = false;
            document.getElementById('data_pedido').required = true;
            document.getElementById('qtd').required = true;
            document.getElementById('unid').required = true;
            document.getElementById('solicitante').required = true;

            document.getElementById('data_pedido').value = new Date().toISOString().split('T')[0];
            document.getElementById('data_processamento').value = new Date().toISOString().split('T')[0];
            document.getElementById('custom-unid-group').style.display = 'none';
            document.getElementById('status').value = 'Pedido solicitado';
        }
    }

    checkCustomUnit(value) {
        const group = document.getElementById('custom-unid-group');
        const customField = document.getElementById('custom-unid');
        if (value === 'custom') {
            group.style.display = 'block';
            customField.required = this.mode === 'solicitar';
            customField.focus();
        } else {
            group.style.display = 'none';
            customField.required = false;
        }
    }

    closeModal() {
        document.getElementById('material-modal').style.display = 'none';
    }

    editEntry(id) {
        const item = this.materials.find(m => m.id === id);
        this.openModal(item);
    }

    deleteEntry(id) {
        if (confirm('Tem certeza que deseja excluir este registro?')) {
            this.materials = this.materials.filter(m => m.id !== id);
            this.renderTable();
        }
    }

    markAsDelivered(id) {
        const index = this.materials.findIndex(m => m.id === id);
        if (index !== -1) {
            this.materials[index].status = 'Entregue';
            this.materials[index].data_entrega = new Date().toISOString().split('T')[0];
            this.renderTable();
        }
    }

    // --- Report Management ---

    enterReportMode(mode) {
        if (mode === 'criar') {
            this.currentReportPhotos = [];
            this.setupPhotoUpload(4); // Default to 4
            document.getElementById('report-photo-count').value = '4';
            this.switchView('report-create-view');
        } else if (mode === 'buscar') {
            this.renderReportHistory();
            this.switchView('report-history-view');
        }
    }

    setupPhotoUpload(count) {
        const grid = document.getElementById('photo-upload-grid');
        grid.innerHTML = '';
        this.currentReportPhotos = new Array(parseInt(count)).fill(null);
        
        for (let i = 0; i < count; i++) {
            const slot = document.createElement('div');
            slot.className = 'photo-slot';
            slot.onclick = () => this.triggerPhotoUpload(i);
            slot.id = `photo-slot-${i}`;
            
            slot.innerHTML = `
                <div class="slot-placeholder">
                    <i data-lucide="camera"></i>
                    <span>Foto ${i + 1}</span>
                </div>
                <input type="file" id="file-input-${i}" style="display:none" accept="image/*" onchange="app.handlePhotoUpload(event, ${i})">
            `;
            grid.appendChild(slot);
        }
        lucide.createIcons();
        this.updateReportActions();
    }

    triggerPhotoUpload(index) {
        const input = document.getElementById(`file-input-${index}`);
        if (input) input.click();
    }

    handlePhotoUpload(event, index) {
        const file = event.target.files[0];
        if (!file) return;

        const slot = document.getElementById(`photo-slot-${index}`);
        slot.classList.add('loading');

        const reader = new FileReader();
        reader.onload = async (e) => {
            const imageData = e.target.result;
            try {
                const standardizedData = await this.standardizeImage(imageData);
                
                // CRITICAL FIX: Direct update and specific slot re-render
                this.currentReportPhotos[index] = {
                    src: standardizedData,
                    title: this.getAISuggestion(index)
                };
                
                this.renderPhotoSlot(index);
                this.updateReportActions();
            } catch (err) {
                console.error('Erro ao processar imagem:', err);
                alert('Erro ao processar imagem. Tente outro arquivo.');
            } finally {
                slot.classList.remove('loading');
            }
        };
        reader.readAsDataURL(file);
    }

    standardizeImage(base64Str) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                const targetWidth = 800;
                const targetHeight = 450; // 16:9
                canvas.width = targetWidth;
                canvas.height = targetHeight;
                
                const imgAspectRatio = img.width / img.height;
                const targetAspectRatio = targetWidth / targetHeight;
                
                let renderWidth, renderHeight, offsetX, offsetY;
                if (imgAspectRatio > targetAspectRatio) {
                    renderHeight = targetHeight;
                    renderWidth = img.width * (targetHeight / img.height);
                    offsetX = (targetWidth - renderWidth) / 2;
                    offsetY = 0;
                } else {
                    renderWidth = targetWidth;
                    renderHeight = img.height * (targetWidth / img.width);
                    offsetX = 0;
                    offsetY = (targetHeight - renderHeight) / 2;
                }
                
                ctx.fillStyle = '#FFFFFF';
                ctx.fillRect(0, 0, targetWidth, targetHeight);
                ctx.drawImage(img, offsetX, offsetY, renderWidth, renderHeight);
                resolve(canvas.toDataURL('image/jpeg', 0.4));
            };
            img.onerror = reject;
            img.src = base64Str;
        });
    }

    getAISuggestion(index) {
        const suggestions = [
            'Vista frontal da obra', 'Andamento da fundação', 'Instalações hidráulicas',
            'Revestimento interno', 'Estrutura metálica', 'Acabamento de reboco',
            'Pintura externa', 'Instalação elétrica', 'Colocação de pisos', 'Vista aérea geral'
        ];
        return suggestions[index % suggestions.length];
    }

    renderPhotoSlot(index) {
        const slot = document.getElementById(`photo-slot-${index}`);
        const photo = this.currentReportPhotos[index];
        if (!photo) return;

        // CRITICAL FIX: Keep the input but hide standard UI
        slot.innerHTML = `
            <img src="${photo.src}" alt="Foto ${index + 1}">
            <input type="text" class="photo-caption-input" 
                   value="${photo.title}" 
                   onchange="app.updatePhotoTitle(${index}, this.value)"
                   onclick="event.stopPropagation()">
            <input type="file" id="file-input-${index}" style="display:none" accept="image/*" onchange="app.handlePhotoUpload(event, ${index})">
        `;
    }

    updatePhotoTitle(index, title) {
        if (this.currentReportPhotos[index]) {
            this.currentReportPhotos[index].title = title;
        }
    }

    updateReportActions() {
        const uploadedCount = this.currentReportPhotos.filter(p => p !== null).length;
        const actions = document.querySelector('.report-actions');
        actions.style.display = uploadedCount === this.currentReportPhotos.length ? 'flex' : 'none';
    }

    previewReport() {
        const modal = document.getElementById('report-preview-modal');
        const content = document.getElementById('report-preview-content');
        
        const count = this.currentReportPhotos.length;
        
        let html = `
            <div style="text-align: center; border-bottom: 2px solid #005844; padding-bottom: 10px; margin-bottom: 10px;">
                <img src="logo.jpg" style="max-height: 40px;">
                <h1 style="font-size: 18px; color: #005844; margin: 5px 0;">RELATÓRIO FOTOGRÁFICO DE OBRA</h1>
                <p style="font-size: 11px; color: #666;">Data: ${new Date().toLocaleDateString('pt-BR')}</p>
            </div>
            <div class="a4-photo-container">
        `;

        this.currentReportPhotos.forEach((photo) => {
            if (photo) {
                html += `
                    <div class="a4-photo-item">
                        <img src="${photo.src}">
                        <p>${photo.title.toUpperCase()}</p>
                    </div>
                `;
            }
        });

        html += '</div>';
        content.innerHTML = html;
        modal.style.display = 'flex';
    }

    closeReportPreview() {
        document.getElementById('report-preview-modal').style.display = 'none';
    }

    async generateReportPDF() {
        try {
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF('p', 'mm', 'a4');
            const pageWidth = 210;
            const pageHeight = 297;
            const margin = 15;
            const availableWidth = pageWidth - (margin * 2);

            const getLogoBase64 = async () => {
                try {
                    const response = await fetch('logo.jpg');
                    const blob = await response.blob();
                    return new Promise(r => {
                        const reader = new FileReader();
                        reader.onloadend = () => r(reader.result);
                        reader.readAsDataURL(blob);
                    });
                } catch { return null; }
            };

            const logoStr = await getLogoBase64();
            
            const renderPage = (photosSlice, isNewPage = false) => {
                if (isNewPage) doc.addPage();
                
                if (logoStr) doc.addImage(logoStr, 'JPEG', margin, margin, 35, 12);
                doc.setFontSize(14);
                doc.setTextColor(0, 88, 68);
                doc.text('RELATÓRIO FOTOGRÁFICO', pageWidth/2, margin + 8, { align: 'center' });
                doc.setDrawColor(0, 88, 68);
                doc.line(margin, margin + 15, pageWidth - margin, margin + 15);
                
                const photoCount = photosSlice.length;
                const photoWidth = (availableWidth - 10) / 2;
                const photoHeight = (photoWidth * 9) / 16;
                const rowGap = 15;
                
                // Top Centered Layout (Starting below header)
                let startY = 40;

                photosSlice.forEach((photo, i) => {
                    const col = i % 2;
                    const row = Math.floor(i / 2);
                    const x = margin + (col * (photoWidth + 10));
                    const y = startY + (row * (photoHeight + rowGap));
                    
                    if (photo && photo.src) {
                        try {
                            doc.addImage(photo.src, 'JPEG', x, y, photoWidth, photoHeight);
                        } catch (e) { console.error('PDF Img Error:', e); }
                    }
                    doc.setFontSize(9);
                    doc.setTextColor(50);
                    doc.text(photo.title.toUpperCase(), x + (photoWidth / 2), y + photoHeight + 5, { align: 'center' });
                });
            };

            for (let i = 0; i < this.currentReportPhotos.length; i += 6) {
                renderPage(this.currentReportPhotos.slice(i, i + 6), i > 0);
            }

            doc.save(`Relatorio_Obra_${Date.now()}.pdf`);
            this.saveReportToHistory();
            this.closeReportPreview();
            alert('Relatório gerado!');
        } catch (err) {
            console.error(err);
            alert('Erro ao gerar PDF: ' + err.message);
        }
    }

    saveReportToHistory() {
        const report = {
            id: Date.now(),
            date: new Date().toISOString(),
            photoCount: this.currentReportPhotos.length,
            title: `Relatório de ${this.currentReportPhotos.length} fotos`,
            photos: this.currentReportPhotos
        };
        this.reports.unshift(report);
        localStorage.setItem('obra_reports', JSON.stringify(this.reports));
    }

    renderReportHistory() {
        const list = document.getElementById('report-list');
        list.innerHTML = '';
        
        if (this.reports.length === 0) {
            list.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: var(--text-muted);">Nenhum relatório encontrado.</p>';
            return;
        }

        this.reports.forEach(report => {
            const card = document.createElement('div');
            card.className = 'report-item-card';
            card.innerHTML = `
                <h4>${report.title}</h4>
                <div class="date">${new Date(report.date).toLocaleDateString('pt-BR')} ${new Date(report.date).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})}</div>
                <div style="display: flex; gap: 0.5rem; margin-top: auto;">
                    <button class="action-btn" onclick="app.reprintReport(${report.id})">
                        <i data-lucide="printer"></i> Reimprimir
                    </button>
                    <button class="action-btn" onclick="app.deleteReport(${report.id})" style="color: var(--danger)">
                        <i data-lucide="trash-2"></i>
                    </button>
                </div>
            `;
            list.appendChild(card);
        });
        lucide.createIcons();
    }

    reprintReport(id) {
        const report = this.reports.find(r => r.id === id);
        if (report) {
            this.currentReportPhotos = report.photos;
            this.previewReport();
        }
    }

    deleteReport(id) {
        if (confirm('Deseja excluir este relatório do histórico?')) {
            this.reports = this.reports.filter(r => r.id !== id);
            localStorage.setItem('obra_reports', JSON.stringify(this.reports));
            this.renderReportHistory();
        }
    }
}

const app = new MaterialApp();
