// 카테고리별 라벨/문구 정의 (일일활동은 해야할일을 그대로 미러링하므로 입력 설정이 없음)
const CATEGORIES = {
    todo: { label: '해야할일', placeholder: '할 일을 입력하세요...', empty: '아직 등록한 할 일이 없습니다.' },
    wish: { label: '하고싶은 것', placeholder: '하고 싶은 일을 입력하세요...', empty: '아직 등록한 하고 싶은 일이 없습니다.' },
    want: { label: '원하는 것', placeholder: '원하는 것을 입력하세요...', empty: '아직 등록한 원하는 것이 없습니다.' },
    like: { label: '좋아하는 것', placeholder: '좋아하는 것을 입력하세요...', empty: '아직 등록한 좋아하는 것이 없습니다.' }
};

// 요일 라벨 (일일활동 오늘 날짜 표시용)
const WEEKDAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];

// 메인 애플리케이션 로직
class GonPlanApp {
    constructor() {
        this.currentCategory = 'daily';
        this.editingId = null;
        // 완료 항목을 이번 접속 동안은 제자리에, 다음 접속(새로고침)부터 맨 아래로 보내기 위한
        // 세션 한정 표시 순서 캐시 (daily 카테고리는 사용하지 않음)
        this.sessionOrder = {};
        this.init();
    }

    /**
     * 앱 초기화
     */
    init() {
        this.cacheElements();
        this.bindEvents();
        this.updateAddFormVisibility();
        if (this.currentCategory !== 'daily') {
            this.itemInput.placeholder = CATEGORIES[this.currentCategory].placeholder;
        }
        this.render();
    }

    /**
     * DOM 요소 캐싱
     */
    cacheElements() {
        this.itemForm = document.getElementById('itemForm');
        this.itemInput = document.getElementById('itemInput');

        this.addFormCard = document.getElementById('addFormCard');
        this.itemListContainer = document.getElementById('itemListContainer');
        this.emptyState = document.getElementById('emptyState');
        this.emptyStateText = document.getElementById('emptyStateText');

        this.tabBtns = document.querySelectorAll('.tab-btn');

        this.editModal = document.getElementById('editModal');
        this.editForm = document.getElementById('editForm');
        this.editInput = document.getElementById('editInput');
        this.cancelEditBtn = document.getElementById('cancelEdit');
    }

    /**
     * 이벤트 바인딩
     */
    bindEvents() {
        this.itemForm.addEventListener('submit', (e) => this.handleAdd(e));

        this.tabBtns.forEach(btn => {
            btn.addEventListener('click', (e) => this.handleTabChange(e));
        });

        this.editForm.addEventListener('submit', (e) => this.handleEditSubmit(e));
        this.cancelEditBtn.addEventListener('click', () => this.closeEditModal());
        this.editModal.addEventListener('click', (e) => {
            if (e.target === this.editModal) {
                this.closeEditModal();
            }
        });
    }

    /**
     * 카테고리 탭 전환 처리
     */
    handleTabChange(e) {
        const category = e.currentTarget.dataset.category;
        this.currentCategory = category;

        this.tabBtns.forEach(btn => btn.classList.remove('active'));
        e.currentTarget.classList.add('active');

        this.updateAddFormVisibility();
        if (category !== 'daily') {
            this.itemInput.placeholder = CATEGORIES[category].placeholder;
        }
        this.render();
    }

    /**
     * 입력 폼 표시 여부 (일일활동은 해야할일에서만 추가되므로 입력 폼을 숨김)
     */
    updateAddFormVisibility() {
        this.addFormCard.classList.toggle('hidden', this.currentCategory === 'daily');
    }

    /**
     * 새 항목 추가 처리
     */
    handleAdd(e) {
        e.preventDefault();

        if (this.currentCategory === 'daily') {
            return;
        }

        const title = this.itemInput.value.trim();
        if (!title) {
            return;
        }

        GonPlanStorage.addItem(this.currentCategory, title);
        this.itemInput.value = '';
        this.itemInput.focus();
        this.render();
    }

    /**
     * 완료 상태 토글 (해야할일 / 하고싶은 것 / 원하는 것 / 좋아하는 것)
     */
    handleToggle(id) {
        GonPlanStorage.toggleComplete(id);
        this.render();
    }

    /**
     * 일일활동 오늘 체크 토글
     */
    handleDailyCheck(habitId) {
        const today = GonPlanStorage.getTodayStr();
        const log = GonPlanStorage.getDailyLog(habitId, today);
        GonPlanStorage.upsertDailyLog(habitId, today, { checked: !(log && log.checked) });
        this.render();
    }

    /**
     * 일일활동 오늘 메모 입력 처리
     */
    handleDailyMemoChange(habitId, value) {
        const today = GonPlanStorage.getTodayStr();
        GonPlanStorage.upsertDailyLog(habitId, today, { memo: value });
    }

    /**
     * 수정 모달 열기
     */
    openEditModal(id, currentTitle) {
        this.editingId = id;
        this.editInput.value = currentTitle;
        this.editModal.classList.remove('hidden');
        this.editModal.classList.add('flex');
        this.editInput.focus();
    }

    /**
     * 수정 모달 닫기
     */
    closeEditModal() {
        this.editingId = null;
        this.editInput.value = '';
        this.editModal.classList.add('hidden');
        this.editModal.classList.remove('flex');
    }

    /**
     * 수정 제출 처리
     */
    handleEditSubmit(e) {
        e.preventDefault();

        const newTitle = this.editInput.value.trim();
        if (!newTitle || !this.editingId) {
            return;
        }

        GonPlanStorage.updateItem(this.editingId, newTitle);
        this.closeEditModal();
        this.render();
    }

    /**
     * 삭제 처리
     */
    handleDelete(id, title) {
        if (confirm(`"${title}"\n정말 삭제하시겠습니까?`)) {
            GonPlanStorage.deleteItem(id);
            this.render();
        }
    }

    /**
     * 완료 항목이 이번 접속 중 제자리를 지키도록, 카테고리별 표시 순서를 캐싱해서 반환
     * (새 항목은 맨 위, 삭제된 항목은 자동 제외. 완료 여부에 따른 재정렬은 다음 접속 때 반영됨)
     */
    getOrderedItems(category) {
        const items = GonPlanStorage.getItemsByCategory(category);
        const byId = new Map(items.map(item => [item.id, item]));

        if (!this.sessionOrder[category]) {
            this.sessionOrder[category] = items.map(item => item.id);
        }

        let order = this.sessionOrder[category].filter(id => byId.has(id));
        const knownIds = new Set(order);
        const newIds = items.map(item => item.id).filter(id => !knownIds.has(id));
        order = [...newIds, ...order];
        this.sessionOrder[category] = order;

        return order.map(id => byId.get(id));
    }

    /**
     * ISO 날짜 문자열 → "M/D" 형식
     */
    formatShortDate(isoString) {
        const d = new Date(isoString);
        return `${d.getMonth() + 1}/${d.getDate()}`;
    }

    /**
     * "YYYY-MM-DD" → "M/D" 형식
     */
    formatShortDateFromStr(dateStr) {
        const [, m, d] = dateStr.split('-').map(Number);
        return `${m}/${d}`;
    }

    /**
     * 해야할일 / 하고싶은 것 / 원하는 것 / 좋아하는 것 항목 카드 HTML 생성
     */
    createItemHTML(item) {
        const isDone = item.completed;
        const titleClass = isDone ? 'item-title completed' : 'item-title';
        const dateBadge = isDone && item.completedAt
            ? `<span class="done-date">완료 · ${this.formatShortDate(item.completedAt)}</span>`
            : '';
        const completeBtnClass = isDone ? 'btn-complete done' : 'btn-complete';
        const completeBtnLabel = isDone ? '완료 ✓' : '완료';
        const escapedTitle = this.escapeHtml(item.title).replace(/'/g, "\\'");

        return `
            <div class="item-row bg-white rounded-lg shadow p-4">
                <div class="flex items-center gap-3">
                    <div class="flex-1 min-w-0">
                        <p class="${titleClass} text-gray-800 break-words">${this.escapeHtml(item.title)}</p>
                        ${dateBadge}
                    </div>
                    <button class="${completeBtnClass}" onclick="app.handleToggle('${item.id}')">${completeBtnLabel}</button>
                </div>
                <div class="flex justify-end gap-2 mt-2 pt-2 border-t border-gray-100">
                    <button class="btn-sub bg-indigo-50 text-indigo-600" onclick="app.openEditModal('${item.id}', '${escapedTitle}')">수정</button>
                    <button class="btn-sub bg-red-50 text-red-600" onclick="app.handleDelete('${item.id}', '${escapedTitle}')">삭제</button>
                </div>
            </div>
        `;
    }

    /**
     * 일일활동 진도율 요약(주간/월간/전체) HTML 생성
     */
    createDailySummaryHTML() {
        const summary = GonPlanStorage.getDailySummary();
        const tile = (label, pct) => `
            <div class="text-center">
                <div class="text-[11px] text-gray-400 font-bold mb-1">${label}</div>
                <div class="text-xl font-extrabold text-indigo-600">${pct}%</div>
                <div class="h-1.5 bg-gray-100 rounded-full mt-2 overflow-hidden">
                    <div class="h-full bg-indigo-500 rounded-full" style="width:${pct}%"></div>
                </div>
            </div>
        `;

        return `
            <div class="bg-white rounded-xl shadow p-4 mb-6">
                <div class="text-center text-xs font-bold text-gray-400 mb-4">전체 활동 진도율</div>
                <div class="grid grid-cols-3 gap-3">
                    ${tile('주간', summary.weekly)}
                    ${tile('월간', summary.monthly)}
                    ${tile('전체', summary.overall)}
                </div>
            </div>
        `;
    }

    /**
     * 일일활동 오늘 날짜 라벨 HTML
     */
    createTodayLabelHTML() {
        const now = new Date();
        return `<div class="text-xs font-bold text-gray-400 px-1 mb-2">${now.getMonth() + 1}/${now.getDate()} (${WEEKDAY_LABELS[now.getDay()]}) · 오늘 체크 현황</div>`;
    }

    /**
     * 일일활동 습관 카드 HTML 생성 (오늘 체크 + 메모 + 최근 7일 기록)
     */
    createHabitCardHTML(item) {
        const today = GonPlanStorage.getTodayStr();
        const todayLog = GonPlanStorage.getDailyLog(item.id, today);
        const checked = !!(todayLog && todayLog.checked);
        const memo = (todayLog && todayLog.memo) || '';
        const streak = GonPlanStorage.getStreak(item.id);
        const weekly = GonPlanStorage.getHabitRate(item.id, 7);
        const escapedTitle = this.escapeHtml(item.title).replace(/'/g, "\\'");

        const history = GonPlanStorage.getRecentDates(7).map(date => {
            const isToday = date === today;
            let dotClass = 'day-dot';
            let dotText = '✕';
            let label = this.formatShortDateFromStr(date);

            if (isToday) {
                dotClass += ' today';
                dotText = String(new Date().getDate());
                label = '오늘';
            } else {
                const log = GonPlanStorage.getDailyLog(item.id, date);
                if (log && log.checked) {
                    dotClass += ' done';
                    dotText = '✓';
                } else {
                    dotClass += ' miss';
                }
            }

            return `
                <div class="flex flex-col items-center gap-1 flex-1">
                    <div class="${dotClass}">${dotText}</div>
                    <span class="text-[10px] text-gray-400">${label}</span>
                </div>
            `;
        }).join('');

        const streakLabel = streak > 0
            ? `<span class="text-xs font-bold text-amber-600">🔥 ${streak}일 연속</span>`
            : `<span class="text-xs font-bold text-gray-400">연속 기록 없음</span>`;

        return `
            <div class="item-row bg-white rounded-lg shadow p-4 mb-3">
                <div class="flex items-center gap-3">
                    <button class="${checked ? 'btn-complete done' : 'btn-complete'}" onclick="app.handleDailyCheck('${item.id}')">${checked ? '오늘 완료 ✓' : '오늘 체크'}</button>
                    <p class="flex-1 text-gray-800 font-medium break-words">${this.escapeHtml(item.title)}</p>
                </div>
                <div class="flex justify-end gap-2 mt-2">
                    <button class="btn-sub bg-indigo-50 text-indigo-600" onclick="app.openEditModal('${item.id}', '${escapedTitle}')">수정</button>
                    <button class="btn-sub bg-red-50 text-red-600" onclick="app.handleDelete('${item.id}', '${escapedTitle}')">삭제</button>
                </div>
                <div class="mt-3 pt-3 border-t border-gray-100">
                    <input type="text" value="${this.escapeHtml(memo)}" placeholder="오늘 메모 입력"
                        class="w-full text-sm px-3 py-1.5 border border-dashed border-gray-200 rounded-lg text-gray-600 mb-2"
                        oninput="app.handleDailyMemoChange('${item.id}', this.value)">
                    <div class="flex gap-1.5">${history}</div>
                    <div class="flex justify-between items-center mt-2">
                        ${streakLabel}
                        <span class="text-xs text-gray-400">최근 7일 ${weekly.checkedCount}/${weekly.total} (${weekly.rate}%)</span>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * HTML 이스케이프 처리
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * 화면 렌더링
     */
    render() {
        if (this.currentCategory === 'daily') {
            this.renderDaily();
            return;
        }
        this.renderStandardList();
    }

    /**
     * 해야할일 / 하고싶은 것 / 원하는 것 / 좋아하는 것 렌더링
     */
    renderStandardList() {
        const category = this.currentCategory;
        const items = this.getOrderedItems(category);

        if (items.length === 0) {
            this.itemListContainer.innerHTML = '';
            this.emptyStateText.textContent = CATEGORIES[category].empty;
            this.emptyState.classList.remove('hidden');
            return;
        }

        this.emptyState.classList.add('hidden');

        let dividerInserted = false;
        this.itemListContainer.innerHTML = items.map(item => {
            let prefix = '';
            if (item.completed && !dividerInserted) {
                prefix = '<div class="divider-label">완료됨 (다음 접속부터 자동으로 맨 아래)</div>';
                dividerInserted = true;
            }
            return prefix + this.createItemHTML(item);
        }).join('');
    }

    /**
     * 일일활동 렌더링 (해야할일 중 미완료 항목을 그대로 미러링 + 진도율 요약 + 오늘 체크리스트)
     */
    renderDaily() {
        const items = GonPlanStorage.getActiveDailyHabits();
        const hint = `<p class="text-center text-xs text-gray-400 mb-3">해야할일에 등록한 항목이 완료되기 전까지 자동으로 여기 표시돼요.</p>`;

        if (items.length === 0) {
            this.itemListContainer.innerHTML = hint + this.createDailySummaryHTML();
            this.emptyStateText.textContent = '해야할일에 항목을 추가하면 여기에 자동으로 표시돼요.';
            this.emptyState.classList.remove('hidden');
            return;
        }

        this.emptyState.classList.add('hidden');
        this.itemListContainer.innerHTML =
            hint +
            this.createDailySummaryHTML() +
            this.createTodayLabelHTML() +
            items.map(item => this.createHabitCardHTML(item)).join('');
    }
}

// 앱 인스턴스 생성
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new GonPlanApp();
});
