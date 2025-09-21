class DatabaseManager {    
    constructor(dbName, storeNames) {
        this.dbName = dbName;
        this.storeNames = storeNames;
        this.db = null;
        this.version = 1;
    }

    // Инициализация базы данных
    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.version);

            request.onupgradeneeded = (event) => {
                this.db = event.target.result;
                this.createObjectStores();
            };

            request.onsuccess = (event) => {
                this.db = event.target.result;
                resolve();
            };

            request.onerror = (event) => {
                reject(new Error(`Ошибка открытия базы данных: ${event.target.error}`));
            };
        });
    }

    // Создание хранилищ объектов
    createObjectStores() {
        this.storeNames.forEach(storeName => {
            if (!this.db.objectStoreNames.contains(storeName)) {
                this.db.createObjectStore(storeName, { 
                    keyPath: 'id', 
                    autoIncrement: true 
                });
            }
        });
    }

    // Добавление записи
    async addRecord(storeName, record) {
        this.validateStoreName(storeName);
        this.validateRecord(record);

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.add(record);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(new Error(`Ошибка добавления записи: ${request.error}`));
        });
    }

    // Получение всех записей
    async getAllRecords(storeName) {
        this.validateStoreName(storeName);

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.getAll();

            request.onsuccess = () => resolve(request.result || []);
            request.onerror = () => reject(new Error(`Ошибка получения записей: ${request.error}`));
        });
    }

    // Получение записи по ID
    async getRecordById(storeName, id) {
        this.validateStoreName(storeName);
        this.validateId(id);

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.get(id);

            request.onsuccess = () => resolve(request.result || null);
            request.onerror = () => reject(new Error(`Ошибка получения записи: ${request.error}`));
        });
    }

    // Обновление записи
    async updateRecord(storeName, record) {
        this.validateStoreName(storeName);
        this.validateRecord(record);
        this.validateId(record.id);

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.put(record);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(new Error(`Ошибка обновления записи: ${request.error}`));
        });
    }

    // Удаление записи
    async deleteRecord(storeName, id) {
        this.validateStoreName(storeName);
        this.validateId(id);

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.delete(id);

            request.onsuccess = () => resolve();
            request.onerror = () => reject(new Error(`Ошибка удаления записи: ${request.error}`));
        });
    }

    // Получение записей по фильтру
    async getRecordsByFilter(storeName, filterFn) {
        this.validateStoreName(storeName);
        
        if (typeof filterFn !== 'function') {
            throw new Error('Функция фильтрации должна быть функцией');
        }

        const allRecords = await this.getAllRecords(storeName);
        return allRecords.filter(filterFn);
    }

    // Очистка хранилища
    async clearStore(storeName) {
        this.validateStoreName(storeName);

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.clear();

            request.onsuccess = () => resolve();
            request.onerror = () => reject(new Error(`Ошибка очистки хранилища: ${request.error}`));
        });
    }

    // Получение количества записей в хранилище
    async getRecordCount(storeName) {
        this.validateStoreName(storeName);

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.count();

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(new Error(`Ошибка подсчета записей: ${request.error}`));
        });
    }

    // Валидация названия хранилища
    validateStoreName(storeName) {
        if (!storeName || typeof storeName !== 'string') {
            throw new Error('Название хранилища должно быть непустой строкой');
        }
        
        if (!this.storeNames.includes(storeName)) {
            throw new Error(`Неизвестное хранилище: ${storeName}`);
        }
    }

    // Валидация записи
    validateRecord(record) {
        if (!record || typeof record !== 'object') {
            throw new Error('Запись должна быть объектом');
        }

        const requiredFields = ['category', 'date', 'amount'];
        for (const field of requiredFields) {
            if (!(field in record)) {
                throw new Error(`Отсутствует обязательное поле: ${field}`);
            }
        }

        if (typeof record.amount !== 'number' || record.amount <= 0) {
            throw new Error('Сумма должна быть положительным числом');
        }
    }

    // Валидация ID
    validateId(id) {
        if (id === undefined || id === null) {
            throw new Error('ID не может быть пустым');
        }
        
        const numId = Number(id);
        if (isNaN(numId) || numId <= 0 || !Number.isInteger(numId)) {
            throw new Error('ID должен быть положительным целым числом');
        }
    }

    // Закрытие соединения с базой данных
    close() {
        if (this.db) {
            this.db.close();
            this.db = null;
        }
    }
}
