// 카테고리별 라벨/문구 정의
const CATEGORIES = {
    todo: { label: '해야할일', placeholder: '할 일을 입력하세요...', empty: '아직 등록한 할 일이 없습니다.' },
    wish: { label: '하고싶은 것', placeholder: '하고 싶은 일을 입력하세요...', empty: '아직 등록한 하고 싶은 일이 없습니다.' },
    want: { label: '원하는 것', placeholder: '원하는 것을 입력하세요...', empty: '아직 등록한 원하는 것이 없습니다.' },
    like: { label: '좋아하는 것', placeholder: '좋아하는 것을 입력하세요...', empty: '아직 등록한 좋아하는 것이 없습니다.' }
};

// 메인 애플리케이션 로직
class GonPlanApp {
    constructor() {
        this.currentCategory = 'todo';
        this.editingId = null;
        this.init();
    }

    /**
     * 앱 초기화
     */
    init() {
        this.cacheElements();
        this.bindEvents();
        this.render();
    }

    /**
     * DOM 요소 캐싱
     */
    cacheElements() {
        this.itemForm = document.getElementById('itemForm');
        this.itemInput = document.getElementById('itemInput');

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

        this.itemInput.placeholder = CATEGORIES[category].placeholder;
        this.render();
    }

    /**
     * 새 항목 추가 처리
     */
    handleAdd(e) {
        e.preventDefault();

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
     * 완료 상태 토글
     */
    handleToggle(id) {
        GonPlanStorage.toggleComplete(id);
        this.render();
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
     * 항목 HTML 생성
     */
    createItemHTML(item) {
        const titleClass = item.completed ? 'item-title completed' : 'item-title';
        const checkIcon = item.completed ? '✓' : '';
        const checkboxClass = item.completed
            ? 'bg-indigo-600 border-indigo-600 text-white'
            : 'bg-white border-gray-300';

        return `
            <div class="item-row bg-white rounded-lg shadow p-4 flex items-center gap-3">
                <button
                    class="item-checkbox flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center ${checkboxClass}"
                    onclick="app.handleToggle('${item.id}')"
                >
                    <span class="text-sm font-bold">${checkIcon}</span>
                </button>

                <p class="${titleClass} flex-1 text-gray-800 break-words">${this.escapeHtml(item.title)}</p>

                <div class="flex gap-2 flex-shrink-0">
                    <button
                        class="px-3 py-1 bg-indigo-50 text-indigo-600 rounded hover:bg-indigo-100 transition-colors text-sm font-medium"
                        onclick="app.openEditModal('${item.id}', '${this.escapeHtml(item.title).replace(/'/g, "\\'")}')"
                    >
                        수정
                    </button>
                    <button
                        class="px-3 py-1 bg-red-50 text-red-600 rounded hover:bg-red-100 transition-colors text-sm font-medium"
                        onclick="app.handleDelete('${item.id}', '${this.escapeHtml(item.title).replace(/'/g, "\\'")}')"
                    >
                        삭제
                    </button>
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
        const items = GonPlanStorage.getItemsByCategory(this.currentCategory);

        if (items.length === 0) {
            this.itemListContainer.innerHTML = '';
            this.emptyStateText.textContent = CATEGORIES[this.currentCategory].empty;
            this.emptyState.classList.remove('hidden');
            return;
        }

        this.emptyState.classList.add('hidden');
        this.itemListContainer.innerHTML = items.map(item => this.createItemHTML(item)).join('');
    }
}

// 앱 인스턴스 생성
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new GonPlanApp();
});
