//Для работы с IndexedDB
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
}

//Класс для управления графиками с использованием Apache ECharts
class ChartManager {
    constructor(incomeChartId, expenseChartId) {
        this.incomeChartElement = document.getElementById(incomeChartId);
        this.expenseChartElement = document.getElementById(expenseChartId);
        this.incomeChart = echarts.init(this.incomeChartElement);
        this.expenseChart = echarts.init(this.expenseChartElement);
    }

    // Обновление графика доходов (круговая диаграмма)
    updateIncomeChart(records) {
        const categories = {};
        records.forEach(record => {
            categories[record.category] = (categories[record.category] || 0) + record.amount;
        });

        const data = Object.keys(categories).map(category => ({
            name: category,
            value: categories[category]
        }));

        const option = {
            tooltip: { trigger: 'item' },
            legend: { top: '5%', left: 'center', textStyle: { color: '#e0e0e0' } },
            series: [{
                type: 'pie',
                radius: '50%',
                data,
                itemStyle: {
                    color: params => {
                        const colors = ['#26a69a', '#0288d1', '#80cbc4', '#0277bd', '#4db6ac', '#01579b'];
                        return colors[params.dataIndex % colors.length];
                    }
                },
                emphasis: {
                    itemStyle: {
                        shadowBlur: 10,
                        shadowOffsetX: 0,
                        shadowColor: 'rgba(0, 0, 0, 0.5)'
                    }
                }
            }],
            backgroundColor: 'transparent',
            textStyle: { color: '#e0e0e0' }
        };

        this.incomeChart.setOption(option, true);
    }

    // Обновление графика расходов (столбчатая диаграмма)
    updateExpenseChart(records1, records2) {
        const categories1 = {};
        const categories2 = {};
        records1.forEach(record => {
            categories1[record.category] = (categories1[record.category] || 0) + record.amount;
        });
        records2.forEach(record => {
            categories2[record.category] = (categories2[record.category] || 0) + record.amount;
        });

        const allCategories = [...new Set([...Object.keys(categories1), ...Object.keys(categories2)])];
        const data1 = allCategories.map(cat => categories1[cat] || 0);
        const data2 = allCategories.map(cat => categories2[cat] || 0);

        const option = {
            tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
            legend: { top: '5%', textStyle: { color: '#e0e0e0' } },
            grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
            xAxis: {
                type: 'category',
                data: allCategories,
                axisLabel: { color: '#e0e0e0' }
            },
            yAxis: {
                type: 'value',
                axisLabel: { color: '#e0e0e0' }
            },
            series: [
                {
                    name: 'Период 1',
                    type: 'bar',
                    data: data1,
                    itemStyle: { color: '#26a69a' }
                },
                {
                    name: 'Период 2',
                    type: 'bar',
                    data: data2,
                    itemStyle: { color: '#0288d1' }
                }
            ],
            backgroundColor: 'transparent',
            textStyle: { color: '#e0e0e0' }
        };

        this.expenseChart.setOption(option, true);
    }
}

//Основной класс приложения для графиков
class ChartApp {
    constructor() {
        this.dbManager = new DatabaseManager('FinanceDB', ['incomes', 'expenses']);
        this.chartManager = new ChartManager('incomeChart', 'expenseChart');
        this.init();
    }

    // Инициализация приложения
    async init() {
        await this.dbManager.init();
        this.loadCharts();
        this.setupEventListeners();
    }

    // Загрузка данных и обновление графиков
    async loadCharts() {
        const incomes = await this.dbManager.getAllRecords('incomes');
        const expenses = await this.dbManager.getAllRecords('expenses');

        this.chartManager.updateIncomeChart(incomes);
        this.chartManager.updateExpenseChart(expenses, expenses); // По умолчанию показываем все расходы
    }

    // Настройка обработчиков событий
    setupEventListeners() {
        document.getElementById('updateExpenseChart').addEventListener('click', async () => {
            const startDate1 = document.getElementById('startDate1').value;
            const endDate1 = document.getElementById('endDate1').value;
            const startDate2 = document.getElementById('startDate2').value;
            const endDate2 = document.getElementById('endDate2').value;

            const expenses = await this.dbManager.getAllRecords('expenses');
            const filterByDate = (records, start, end) => {
                if (!start || !end) return records;
                return records.filter(record => {
                    const recordDate = new Date(record.date);
                    return recordDate >= new Date(start) && recordDate <= new Date(end);
                });
            };

            const expenses1 = filterByDate(expenses, startDate1, endDate1);
            const expenses2 = filterByDate(expenses, startDate2, endDate2);
            this.chartManager.updateExpenseChart(expenses1, expenses2);
        });
    }
}

// Инициализация приложения
document.addEventListener('DOMContentLoaded', () => new ChartApp());