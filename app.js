class MaterialApp {
    constructor() {
        this.materials = JSON.parse(localStorage.getItem('obra_materials')) || [
            { id: 1, desc: 'Cimento', qtd: 5, unid: 'sacos', solicitante: 'Jamanta', status: 'Pedido solicitado', data_pedido: '2025-03-08', valor: 0, data_entrega: '', nota: '' }
        ];
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
}

const app = new MaterialApp();
