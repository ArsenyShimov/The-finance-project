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
        
        // Настройка делегирования событий
        this.setupEventDelegation();
    }

    // Настройка делегирования событий для кнопок в таблицах
    setupEventDelegation() {
        // Обработчик для кнопок редактирования и удаления
        document.addEventListener('click', (event) => {
            if (event.target.classList.contains('btn-edit')) {
                const id = event.target.dataset.id;
                const type = event.target.dataset.type;
                if (this.onEditCallback) {
                    this.onEditCallback(id, type);
                }
            } else if (event.target.classList.contains('btn-delete')) {
                const id = event.target.dataset.id;
                const type = event.target.dataset.type;
                if (this.onDeleteCallback) {
                    this.onDeleteCallback(id, type);
                }
            }
        });
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

        // Сохраняем колбэки для делегирования событий
        this.onEditCallback = onEdit;
        this.onDeleteCallback = onDelete;
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

    // Универсальный метод для определения storeName
    getStoreName(type) {
        // Константы для типов записей
        const RECORD_TYPES = {
            INCOME: 'income',
            EXPENSE: 'expense'
        };
        
        // Маппинг типов на названия хранилищ
        const typeMapping = {
            [RECORD_TYPES.INCOME]: 'incomes',
            [RECORD_TYPES.EXPENSE]: 'expenses'
        };
        
        // Валидация типа
        if (!type || typeof type !== 'string') {
            throw new Error('Тип записи должен быть непустой строкой');
        }
        
        if (!typeMapping[type]) {
            const validTypes = Object.keys(typeMapping).join(', ');
            throw new Error(`Неизвестный тип записи: "${type}". Доступные типы: ${validTypes}`);
        }
        
        return typeMapping[type];
    }

    // Вспомогательный метод для получения человекочитаемого названия типа
    getTypeDisplayName(type) {
        const displayNames = {
            'income': 'доход',
            'expense': 'расход'
        };
        
        return displayNames[type] || type;
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
        // Единый обработчик для всех событий
        document.addEventListener('click', this.handleClick.bind(this));
        this.uiManager.form.addEventListener('submit', this.handleFormSubmit.bind(this));
    }

    // Единый обработчик кликов
    handleClick(event) {
        const { target } = event;
        
        // Обработка кнопок добавления
        if (target.id === 'addIncomeBtn') {
            this.uiManager.openModal('Добавить доход', 'income');
            return;
        }
        
        if (target.id === 'addExpenseBtn') {
            this.uiManager.openModal('Добавить расход', 'expense');
            return;
        }
        
        // Обработка кнопок в таблицах (уже обрабатывается в UIManager)
        if (target.classList.contains('btn-edit') || target.classList.contains('btn-delete')) {
            return; // Обрабатывается в UIManager
        }
        
        // Обработка закрытия модального окна
        if (target.id === 'closeModal' || target === this.uiManager.modal) {
            this.uiManager.closeModal();
            return;
        }
    }

    // Обработка отправки формы
    async handleFormSubmit(event) {
        event.preventDefault();
        const type = this.uiManager.recordTypeInput.value;
        const storeName = this.getStoreName(type);
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
        const storeName = this.getStoreName(type);
        const records = await this.dbManager.getAllRecords(storeName);
        const record = records.find(r => r.id === parseInt(id));
        const displayName = this.getTypeDisplayName(type);
        this.uiManager.openModal(`Редактировать ${displayName}`, type, record);
    }

    // Удаление записи
    async deleteRecord(id, type) {
        // Получаем информацию о записи для отображения в диалоге
        const storeName = this.getStoreName(type);
        const records = await this.dbManager.getAllRecords(storeName);
        const record = records.find(r => r.id === parseInt(id));
        
        if (!record) {
            alert('Запись не найдена!');
            return;
        }
        
        // Формируем сообщение для подтверждения
        const recordType = this.getTypeDisplayName(type);
        const recordDate = new Date(record.date).toLocaleDateString('ru-RU');
        const recordAmount = record.amount.toFixed(2);
        
        const confirmMessage = `Вы уверены, что хотите удалить эту запись?\n\n` +
                             `Тип: ${recordType}\n` +
                             `Категория: ${record.category}\n` +
                             `Дата: ${recordDate}\n` +
                             `Сумма: ${recordAmount} руб.`;
        
        // Показываем диалог подтверждения
        if (confirm(confirmMessage)) {
            try {
                await this.dbManager.deleteRecord(storeName, parseInt(id));
                await this.loadRecords();
                
                // Показываем сообщение об успешном удалении
                this.showNotification('Запись успешно удалена!', 'success');
            } catch (error) {
                console.error('Ошибка при удалении записи:', error);
                this.showNotification('Ошибка при удалении записи!', 'error');
            }
        }
    }
    
    // Показ уведомлений
    showNotification(message, type = 'info') {
        // Создаем элемент уведомления
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        
        // Добавляем в DOM
        document.body.appendChild(notification);
        
        // Анимация появления
        setTimeout(() => {
            notification.classList.add('show');
        }, 100);
        
        // Автоматическое удаление через 3 секунды
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }
}

document.addEventListener('DOMContentLoaded', () => new FinanceApp());