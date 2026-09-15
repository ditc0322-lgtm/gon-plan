// LocalStorage 관리 모듈
const GonPlanStorage = {
    STORAGE_KEY: 'gonPlanItems',
    DAILY_LOG_KEY: 'gonPlanDailyLogs',

    /**
     * LocalStorage에서 전체 항목 불러오기
     * @returns {Array} 전체 항목 배열
     */
    load() {
        try {
            const data = localStorage.getItem(this.STORAGE_KEY);
            return data ? JSON.parse(data) : [];
        } catch (error) {
            console.error('데이터 로드 실패:', error);
            return [];
        }
    },

    /**
     * LocalStorage에 전체 항목 저장하기
     * @param {Array} items - 저장할 항목 배열
     */
    save(items) {
        try {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(items));
            return true;
        } catch (error) {
            console.error('데이터 저장 실패:', error);
            return false;
        }
    },

    /**
     * 새 항목 추가
     * @param {string} category - 카테고리 (daily | todo | wish | want | like)
     * @param {string} title - 항목 내용
     * @returns {Object} 추가된 항목
     */
    addItem(category, title) {
        const items = this.load();
        const newItem = {
            id: Date.now().toString(),
            category,
            title: title.trim(),
            completed: false,
            createdAt: new Date().toISOString(),
            completedAt: null
        };
        items.unshift(newItem); // 최신 항목을 맨 위에 추가
        this.save(items);
        return newItem;
    },

    /**
     * 항목 내용 수정
     * @param {string} id - 수정할 항목의 ID
     * @param {string} newTitle - 새로운 내용
     */
    updateItem(id, newTitle) {
        const items = this.load();
        const index = items.findIndex(item => item.id === id);

        if (index !== -1) {
            items[index].title = newTitle.trim();
            this.save(items);
            return true;
        }
        return false;
    },

    /**
     * 항목 삭제 (일일활동 항목이면 관련 체크 기록도 함께 삭제)
     * @param {string} id - 삭제할 항목의 ID
     */
    deleteItem(id) {
        const items = this.load();
        const filtered = items.filter(item => item.id !== id);

        if (filtered.length !== items.length) {
            this.save(filtered);
            this.deleteDailyLogsForHabit(id);
            return true;
        }
        return false;
    },

    /**
     * 완료 상태 토글 (완료 시각을 completedAt에 기록)
     * @param {string} id - 토글할 항목의 ID
     */
    toggleComplete(id) {
        const items = this.load();
        const index = items.findIndex(item => item.id === id);

        if (index !== -1) {
            items[index].completed = !items[index].completed;
            items[index].completedAt = items[index].completed
                ? new Date().toISOString()
                : null;
            this.save(items);
            return items[index].completed;
        }
        return false;
    },

    /**
     * 카테고리별 항목 가져오기 (미완료 항목이 위, 완료 항목은 아래로 자동 정렬)
     * @param {string} category - 카테고리 (daily | todo | wish | want | like)
     * @returns {Array} 정렬된 항목 배열
     */
    getItemsByCategory(category) {
        const items = this.load().filter(item => item.category === category);

        return items.sort((a, b) => {
            if (a.completed !== b.completed) {
                return a.completed ? 1 : -1; // 미완료가 먼저, 완료는 뒤로
            }
            return new Date(b.createdAt) - new Date(a.createdAt); // 최신순
        });
    },

    /**
     * 일일활동에 연동되는 항목: 해야할일 중 아직 완료되지 않은 항목
     * (완료 처리되는 순간부터 일일활동 화면에서 자동으로 빠짐)
     */
    getActiveDailyHabits() {
        return this.getItemsByCategory('todo').filter(item => !item.completed);
    },

    /**
     * 완료 탭용: 전체 카테고리를 통틀어 완료된 항목 (완료일 최신순)
     * @returns {Array} 완료된 항목 배열
     */
    getCompletedItems() {
        return this.load()
            .filter(item => item.completed)
            .sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt));
    },

    // ── 일일활동(습관) 체크 기록 ────────────────────────────

    /**
     * 날짜를 YYYY-MM-DD 형식 문자열로 변환 (로컬 기준)
     * @param {Date} date
     */
    formatDateStr(date) {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    },

    /**
     * 오늘 날짜 문자열
     */
    getTodayStr() {
        return this.formatDateStr(new Date());
    },

    /**
     * 오늘부터 과거 n일간의 날짜 문자열 배열 (과거→오늘 순)
     * @param {number} n
     */
    getRecentDates(n) {
        const dates = [];
        for (let i = n - 1; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            dates.push(this.formatDateStr(d));
        }
        return dates;
    },

    /**
     * 일일 체크 기록 전체 불러오기
     */
    loadDailyLogs() {
        try {
            const data = localStorage.getItem(this.DAILY_LOG_KEY);
            return data ? JSON.parse(data) : [];
        } catch (error) {
            console.error('일일 기록 로드 실패:', error);
            return [];
        }
    },

    /**
     * 일일 체크 기록 전체 저장하기
     * @param {Array} logs
     */
    saveDailyLogs(logs) {
        try {
            localStorage.setItem(this.DAILY_LOG_KEY, JSON.stringify(logs));
            return true;
        } catch (error) {
            console.error('일일 기록 저장 실패:', error);
            return false;
        }
    },

    /**
     * 특정 습관의 특정 날짜 기록 가져오기
     * @param {string} habitId
     * @param {string} date - YYYY-MM-DD
     */
    getDailyLog(habitId, date) {
        return this.loadDailyLogs().find(l => l.habitId === habitId && l.date === date) || null;
    },

    /**
     * 특정 습관의 특정 날짜 기록을 생성하거나 병합해서 저장
     * @param {string} habitId
     * @param {string} date - YYYY-MM-DD
     * @param {Object} patch - { checked, memo }
     */
    upsertDailyLog(habitId, date, patch) {
        const logs = this.loadDailyLogs();
        const index = logs.findIndex(l => l.habitId === habitId && l.date === date);

        if (index !== -1) {
            logs[index] = { ...logs[index], ...patch };
        } else {
            logs.push({
                id: Date.now().toString(),
                habitId,
                date,
                checked: false,
                memo: '',
                ...patch
            });
        }
        this.saveDailyLogs(logs);
    },

    /**
     * 습관 삭제 시 관련 체크 기록 전체 삭제
     * @param {string} habitId
     */
    deleteDailyLogsForHabit(habitId) {
        const logs = this.loadDailyLogs().filter(l => l.habitId !== habitId);
        this.saveDailyLogs(logs);
    },

    /**
     * 일일활동 전체 진도율 (주간 / 월간 / 전체)
     */
    getDailySummary() {
        const habits = this.getActiveDailyHabits();
        if (habits.length === 0) {
            return { weekly: 0, monthly: 0, overall: 0 };
        }

        const logs = this.loadDailyLogs();
        const isChecked = (habitId, date) => logs.some(l => l.habitId === habitId && l.date === date && l.checked);
        const pct = (num, den) => (den > 0 ? Math.round((num / den) * 100) : 0);

        // 주간: 최근 7일
        const weekDates = this.getRecentDates(7);
        let weeklyChecked = 0;
        weekDates.forEach(date => habits.forEach(h => { if (isChecked(h.id, date)) weeklyChecked++; }));
        const weekly = pct(weeklyChecked, habits.length * weekDates.length);

        // 월간: 이번 달 1일부터 오늘까지
        const today = new Date();
        const monthDates = [];
        for (let d = 1; d <= today.getDate(); d++) {
            monthDates.push(this.formatDateStr(new Date(today.getFullYear(), today.getMonth(), d)));
        }
        let monthlyChecked = 0;
        monthDates.forEach(date => habits.forEach(h => { if (isChecked(h.id, date)) monthlyChecked++; }));
        const monthly = pct(monthlyChecked, habits.length * monthDates.length);

        // 전체: 각 습관의 등록일부터 오늘까지
        let overallChecked = 0;
        let overallTotal = 0;
        habits.forEach(h => {
            const created = new Date(h.createdAt);
            const createdZero = new Date(created.getFullYear(), created.getMonth(), created.getDate());
            const todayZero = new Date(today.getFullYear(), today.getMonth(), today.getDate());
            const dayCount = Math.floor((todayZero - createdZero) / 86400000) + 1;
            overallTotal += dayCount;
            overallChecked += logs.filter(l => l.habitId === h.id && l.checked).length;
        });
        const overall = pct(overallChecked, overallTotal);

        return { weekly, monthly, overall };
    }
};
