// Класс для управления графиками с использованием Apache ECharts
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
        // Группируем данные по датам для каждого периода
        const groupByDate = (records) => {
            const grouped = {};
            records.forEach(record => {
                const date = record.date;
                if (!grouped[date]) {
                    grouped[date] = 0;
                }
                grouped[date] += record.amount;
            });
            return grouped;
        };

        const dataByDate1 = groupByDate(records1);
        const dataByDate2 = groupByDate(records2);

        // Получаем все уникальные даты и сортируем их
        const allDates = [...new Set([...Object.keys(dataByDate1), ...Object.keys(dataByDate2)])]
            .sort((a, b) => new Date(a) - new Date(b));

        // Форматируем даты для отображения
        const formattedDates = allDates.map(date => {
            const d = new Date(date);
            return d.toLocaleDateString('ru-RU', { 
                day: '2-digit', 
                month: '2-digit' 
            });
        });

        // Подготавливаем данные для графиков
        const data1 = allDates.map(date => dataByDate1[date] || 0);
        const data2 = allDates.map(date => dataByDate2[date] || 0);

        const option = {
            title: {
                text: 'Расходы по датам',
                left: 'center',
                textStyle: { color: '#e0e0e0', fontSize: 16 }
            },
            tooltip: { 
                trigger: 'axis', 
                axisPointer: { type: 'shadow' },
                formatter: function(params) {
                    let result = `Дата: ${params[0].axisValue}<br/>`;
                    params.forEach(param => {
                        result += `${param.seriesName}: ${param.value.toFixed(2)} руб.<br/>`;
                    });
                    return result;
                }
            },
            legend: { 
                top: '8%', 
                textStyle: { color: '#e0e0e0' },
                data: ['Период 1', 'Период 2']
            },
            grid: { 
                left: '8%', 
                right: '4%', 
                bottom: '8%', 
                top: '15%',
                containLabel: true 
            },
            xAxis: {
                type: 'value',
                name: 'Сумма (руб.)',
                nameLocation: 'middle',
                nameGap: 30,
                axisLabel: { 
                    color: '#e0e0e0',
                    formatter: '{value} руб.'
                },
                axisLine: { lineStyle: { color: '#e0e0e0' } },
                splitLine: { lineStyle: { color: '#37474f' } }
            },
            yAxis: {
                type: 'category',
                data: formattedDates,
                name: 'Даты',
                nameLocation: 'middle',
                nameGap: 50,
                axisLabel: { 
                    color: '#e0e0e0',
                    interval: 0
                },
                axisLine: { lineStyle: { color: '#e0e0e0' } }
            },
            series: [
                {
                    name: 'Период 1',
                    type: 'bar',
                    data: data1,
                    itemStyle: { 
                        color: '#26a69a',
                        borderRadius: [0, 4, 4, 0]
                    },
                    barWidth: '30%'
                },
                {
                    name: 'Период 2',
                    type: 'bar',
                    data: data2,
                    itemStyle: { 
                        color: '#0288d1',
                        borderRadius: [0, 4, 4, 0]
                    },
                    barWidth: '30%'
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
        
        // Устанавливаем периоды по умолчанию (последние 30 дней)
        const today = new Date();
        const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
        
        const startDate1 = thirtyDaysAgo.toISOString().split('T')[0];
        const endDate1 = today.toISOString().split('T')[0];
        
        // Устанавливаем значения в поля ввода
        document.getElementById('startDate1').value = startDate1;
        document.getElementById('endDate1').value = endDate1;
        
        // Фильтруем данные для периода 1
        const filterByDate = (records, start, end) => {
            if (!start || !end) return records;
            return records.filter(record => {
                const recordDate = new Date(record.date);
                return recordDate >= new Date(start) && recordDate <= new Date(end);
            });
        };
        
        const expenses1 = filterByDate(expenses, startDate1, endDate1);
        this.chartManager.updateExpenseChart(expenses1, []); // Период 2 пустой по умолчанию
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
                if (!start || !end) return [];
                return records.filter(record => {
                    const recordDate = new Date(record.date);
                    return recordDate >= new Date(start) && recordDate <= new Date(end);
                });
            };

            const expenses1 = filterByDate(expenses, startDate1, endDate1);
            const expenses2 = filterByDate(expenses, startDate2, endDate2);
            
            // Показываем сообщение, если нет данных
            if (expenses1.length === 0 && expenses2.length === 0) {
                alert('Нет данных для выбранных периодов. Проверьте даты и убедитесь, что есть записи за эти периоды.');
                return;
            }
            
            this.chartManager.updateExpenseChart(expenses1, expenses2);
        });
    }
}

// Инициализация приложения
document.addEventListener('DOMContentLoaded', () => new ChartApp());