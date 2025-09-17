//Класс для работы с IndexedDB
class DatabaseManager {
    constructor(dbName, storeNames) {
        this.dbName = dbName;
        this.storeNames = storeNames;
        this.db = null;
    }

    // Инициализация базы данных
    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, 1);

            request.onupgradeneeded = (event) => {
                this.db = event.target.result;
                this.storeNames.forEach(storeName => {
                    if (!this.db.objectStoreNames.contains(storeName)) {
                        this.db.createObjectStore(storeName, { keyPath: 'id', autoIncrement: true });
                    }
                });
            };

            request.onsuccess = (event) => {
                this.db = event.target.result;
                resolve();
            };

            request.onerror = (event) => {
                reject(event.target.error);
            };
        });
    }

    // Добавление записи
    async addRecord(storeName, record) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.add(record);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    // Получение всех записей
    async getAllRecords(storeName) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.getAll();

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    // Обновление записи
    async updateRecord(storeName, record) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.put(record);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    // Удаление записи
    async deleteRecord(storeName, id) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.delete(id);

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }
}

// Класс для управления UI (таблицы и модальное окно) 
class UIManager {
    constructor(incomeTableId, expenseTableId, modalId, formId, modalTitleId, closeModalId) {
        this.incomeTable = document.getElementById(incomeTableId).querySelector('tbody');
        this.expenseTable = document.getElementById(expenseTableId).querySelector('tbody');
        this.modal = document.getElementById(modalId);
        this.form = document.getElementById(formId);
        this.modalTitle = document.getElementById(modalTitleId);
        this.closeModalElement = document.getElementById(closeModalId);
        this.categoryInput = document.getElementById('category');
        this.dateInput = document.getElementById('date');
        this.amountInput = document.getElementById('amount');
        this.recordIdInput = document.getElementById('recordId');
        this.recordTypeInput = document.getElementById('recordType');
    }

    // Отображение записей в таблице
    displayRecords(records, table, type, onEdit, onDelete) {
        table.innerHTML = '';
        records.forEach(record => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${record.category}</td>
                <td>${new Date(record.date).toLocaleDateString('ru-RU')}</td>
                <td>${record.amount.toFixed(2)}</td>
                <td>
                    <button class="btn btn-edit" data-id="${record.id}" data-type="${type}">Редактировать</button>
                    <button class="btn btn-delete" data-id="${record.id}" data-type="${type}">Удалить</button>
                </td>
            `;
            table.appendChild(row);
        });

        // Назначение обработчиков событий для кнопок
        table.querySelectorAll('.btn-edit').forEach(btn => {
            btn.addEventListener('click', () => onEdit(btn.dataset.id, btn.dataset.type));
        });
        table.querySelectorAll('.btn-delete').forEach(btn => {
            btn.addEventListener('click', () => onDelete(btn.dataset.id, btn.dataset.type));
        });
    }

    // Открытие модального окна
    openModal(title, type, record = null) {
        this.modalTitle.textContent = title;
        this.recordTypeInput.value = type;
        if (record) {
            this.categoryInput.value = record.category;
            this.dateInput.value = record.date;
            this.amountInput.value = record.amount;
            this.recordIdInput.value = record.id;
        } else {
            this.form.reset();
            this.recordIdInput.value = '';
            this.recordTypeInput.value = type;
        }
        this.modal.style.display = 'block';
    }

    // Закрытие модального окна
    closeModal() {
        this.modal.style.display = 'none';
    }
}

//Основной класс приложения
class FinanceApp {
    constructor() {
        this.dbManager = new DatabaseManager('FinanceDB', ['incomes', 'expenses']);
        this.uiManager = new UIManager('incomeTable', 'expenseTable', 'crudModal', 'crudForm', 'modalTitle', 'closeModal');
        this.init();
    }

    // Инициализация приложения
    async init() {
        await this.dbManager.init();
        this.loadRecords();
        this.setupEventListeners();
    }

    // Загрузка записей и обновление UI
    async loadRecords() {
        const incomes = await this.dbManager.getAllRecords('incomes');
        const expenses = await this.dbManager.getAllRecords('expenses');

        this.uiManager.displayRecords(incomes, this.uiManager.incomeTable, 'income', this.editRecord.bind(this), this.deleteRecord.bind(this));
        this.uiManager.displayRecords(expenses, this.uiManager.expenseTable, 'expense', this.editRecord.bind(this), this.deleteRecord.bind(this));
    }

    // Настройка обработчиков событий
    setupEventListeners() {
        document.getElementById('addIncomeBtn').addEventListener('click', () => this.uiManager.openModal('Добавить доход', 'income'));
        document.getElementById('addExpenseBtn').addEventListener('click', () => this.uiManager.openModal('Добавить расход', 'expense'));
        this.uiManager.closeModalElement.addEventListener('click', () => this.uiManager.closeModal());
        window.addEventListener('click', (event) => {
            if (event.target === this.uiManager.modal) this.uiManager.closeModal();
        });
        this.uiManager.form.addEventListener('submit', this.handleFormSubmit.bind(this));
    }

    // Обработка отправки формы
    async handleFormSubmit(event) {
        event.preventDefault();
        const type = this.uiManager.recordTypeInput.value;
        const storeName = type === 'income' ? 'incomes' : 'expenses';
        const record = {
            category: this.uiManager.categoryInput.value,
            date: this.uiManager.dateInput.value,
            amount: parseFloat(this.uiManager.amountInput.value)
        };

        if (this.uiManager.recordIdInput.value) {
            record.id = parseInt(this.uiManager.recordIdInput.value);
            await this.dbManager.updateRecord(storeName, record);
        } else {
            await this.dbManager.addRecord(storeName, record);
        }

        this.uiManager.closeModal();
        await this.loadRecords();
    }

    // Редактирование записи
    async editRecord(id, type) {
        const storeName = type === 'income' ? 'incomes' : 'expenses';
        const records = await this.dbManager.getAllRecords(storeName);
        const record = records.find(r => r.id === parseInt(id));
        this.uiManager.openModal(`Редактировать ${type === 'income' ? 'доход' : 'расход'}`, type, record);
    }

    // Удаление записи
    async deleteRecord(id, type) {
        const storeName = type === 'income' ? 'incomes' : 'expenses';
        await this.dbManager.deleteRecord(storeName, parseInt(id));
        await this.loadRecords();
    }
}

document.addEventListener('DOMContentLoaded', () => new FinanceApp());