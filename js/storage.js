// LocalStorage 관리 모듈
const GonPlanStorage = {
    STORAGE_KEY: 'gonPlanItems',

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
     * @param {string} category - 카테고리 (todo | wish | want | like)
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
     * 항목 삭제
     * @param {string} id - 삭제할 항목의 ID
     */
    deleteItem(id) {
        const items = this.load();
        const filtered = items.filter(item => item.id !== id);

        if (filtered.length !== items.length) {
            this.save(filtered);
            return true;
        }
        return false;
    },

    /**
     * 완료 상태 토글
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
     * @param {string} category - 카테고리 (todo | wish | want | like)
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
    }
};
