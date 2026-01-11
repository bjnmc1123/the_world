/**
 * 试卷下载平台 - 主逻辑（修复样式版）
 */

// 全局配置
const CONFIG = {
    JSON_URL: './metadata.json',
    ITEMS_PER_PAGE: 12,
    FAVORITES_KEY: 'exam_favorites_v2',
    CDN_BASE: 'https://your-cdn-domain.com/exams'
};

// 状态管理类
class ExamPlatform {
    constructor() {
        this.state = {
            exams: [],
            filteredExams: [],
            displayedExams: [],
            favorites: new Set(),
            filters: {
                search: '',
                subject: '',
                difficulty: '',
                source: '',
                grade: '',
                favoritesOnly: false
            },
            pagination: {
                currentPage: 1,
                totalPages: 1
            },
            currentExam: null,
            isLoading: true,
            error: null
        };
        
        this.init();
    }
    
    async init() {
        try {
            // 显示主应用，隐藏加载状态
            this.hideLoading();
            
            // 设置当前年份
            this.setCurrentYear();
            
            // 加载用户收藏
            this.loadFavorites();
            
            // 加载试卷数据
            await this.loadExams();
            
            // 初始化UI
            this.initUI();
            
            // 绑定事件
            this.bindEvents();
            
            // 应用初始筛选
            this.applyFilters();
            
            // 渲染页面
            this.render();
            
        } catch (error) {
            console.error('初始化失败:', error);
            this.state.error = error.message;
            this.showError('加载失败: ' + error.message);
        }
    }
    
    hideLoading() {
        const loadingEl = document.getElementById('initial-loading');
        const appEl = document.getElementById('app');
        
        if (loadingEl) loadingEl.style.display = 'none';
        if (appEl) appEl.style.display = 'block';
    }
    
    async loadExams() {
        try {
            console.log('正在加载试卷数据...');
            
            const response = await fetch(CONFIG.JSON_URL, {
                cache: 'no-cache',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            
            // 验证数据格式
            if (!data || !Array.isArray(data.exams)) {
                throw new Error('数据格式不正确');
            }
            
            this.state.exams = data.exams;
            console.log(`成功加载 ${this.state.exams.length} 份试卷`);
            
            // 更新页面统计
            this.updateStats(data);
            
        } catch (error) {
            console.warn('加载数据失败，使用示例数据:', error.message);
            
            // 使用示例数据
            this.state.exams = this.getSampleData();
            
            // 显示警告
            this.showWarning('正在使用示例数据演示，请检查metadata.json文件');
        }
    }
    
    getSampleData() {
        return [
            {
                id: 'sample-1',
                name: '2024年高考数学模拟试卷',
                description: '包含函数、几何、概率统计等综合题目，适合高三复习',
                subject: '数学',
                difficulty: '中等',
                views: 1234,
                downloads: 856,
                source: '名校模拟',
                fileUrl: '#',
                fileSize: 5123456,
                fileFormat: 'pdf',
                previewImages: [
                    'https://via.placeholder.com/400x300/4a6cf7/ffffff?text=数学试卷预览'
                ],
                tags: ['模拟题', '综合卷', '高考'],
                year: 2024,
                grade: '高三',
                author: '北京四中',
                pageCount: 12,
                hasAnswer: true,
                answerIncluded: true,
                recommendedTime: 120,
                uploadDate: '2024-01-20'
            },
            {
                id: 'sample-2',
                name: '高中英语阅读理解专项训练',
                description: '精选科技、文化、社会等多主题英语阅读文章',
                subject: '英语',
                difficulty: '中等',
                views: 987,
                downloads: 654,
                source: '教育机构',
                fileUrl: '#',
                fileSize: 3245678,
                fileFormat: 'pdf',
                previewImages: [
                    'https://via.placeholder.com/400x300/28a745/ffffff?text=英语阅读理解'
                ],
                tags: ['阅读理解', '专项训练', '词汇积累'],
                year: 2024,
                grade: '高二',
                author: '新东方',
                pageCount: 8,
                hasAnswer: true,
                answerIncluded: true,
                recommendedTime: 90,
                uploadDate: '2024-01-19'
            },
            {
                id: 'sample-3',
                name: '高中物理力学专题测试',
                description: '涵盖牛顿力学、能量守恒、动量定理等核心知识点',
                subject: '物理',
                difficulty: '困难',
                views: 632,
                downloads: 412,
                source: '重点中学',
                fileUrl: '#',
                fileSize: 2854321,
                fileFormat: 'pdf',
                previewImages: [
                    'https://via.placeholder.com/400x300/ff6b6b/ffffff?text=物理力学测试'
                ],
                tags: ['力学', '专题测试', '物理核心'],
                year: 2024,
                grade: '高二',
                author: '黄冈中学',
                pageCount: 10,
                hasAnswer: true,
                answerIncluded: true,
                recommendedTime: 100,
                uploadDate: '2024-01-18'
            },
            {
                id: 'sample-4',
                name: '高中化学有机化学专题',
                description: '包含烃类、醇、醛、酸等有机化合物的系统讲解和练习',
                subject: '化学',
                difficulty: '中等',
                views: 542,
                downloads: 321,
                source: '重点中学',
                fileUrl: '#',
                fileSize: 4123456,
                fileFormat: 'pdf',
                previewImages: [
                    'https://via.placeholder.com/400x300/17a2b8/ffffff?text=化学有机专题'
                ],
                tags: ['有机化学', '专题训练', '化学'],
                year: 2024,
                grade: '高三',
                author: '华中师大一附中',
                pageCount: 15,
                hasAnswer: true,
                answerIncluded: true,
                recommendedTime: 110,
                uploadDate: '2024-01-17'
            }
        ];
    }
    
    updateStats(data) {
        // 更新试卷总数
        const totalCount = document.getElementById('total-count');
        if (totalCount) {
            totalCount.textContent = this.state.exams.length;
        }
        
        // 更新最后更新时间
        const lastUpdate = document.getElementById('last-update');
        if (lastUpdate) {
            const updateDate = data.lastUpdated ? 
                new Date(data.lastUpdated).toLocaleDateString('zh-CN') : 
                new Date().toLocaleDateString('zh-CN');
            lastUpdate.textContent = `最后更新: ${updateDate}`;
        }
    }
    
    setCurrentYear() {
        const yearEl = document.getElementById('current-year');
        if (yearEl) {
            yearEl.textContent = new Date().getFullYear();
        }
    }
    
    showWarning(message) {
        // 创建一个警告提示
        const alertEl = document.createElement('div');
        alertEl.className = 'alert alert-warning alert-dismissible fade show mt-3';
        alertEl.innerHTML = `
            <i class="fas fa-exclamation-triangle me-2"></i>
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        
        const container = document.querySelector('.container');
        if (container) {
            container.insertBefore(alertEl, container.firstChild);
        }
    }
    
    showError(message) {
        const appEl = document.getElementById('app');
        if (!appEl) return;
        
        appEl.innerHTML = `
            <div class="container py-5">
                <div class="alert alert-danger">
                    <h4 class="alert-heading"><i class="fas fa-exclamation-triangle me-2"></i>加载失败</h4>
                    <p>${message}</p>
                    <hr>
                    <button class="btn btn-danger" onclick="location.reload()">
                        <i class="fas fa-redo me-1"></i>刷新页面
                    </button>
                </div>
            </div>
        `;
    }
    
    loadFavorites() {
        try {
            const saved = localStorage.getItem(CONFIG.FAVORITES_KEY);
            if (saved) {
                const favorites = JSON.parse(saved);
                this.state.favorites = new Set(favorites);
            }
        } catch (error) {
            console.warn('加载收藏失败:', error);
        }
    }
    
    saveFavorites() {
        try {
            const favorites = Array.from(this.state.favorites);
            localStorage.setItem(CONFIG.FAVORITES_KEY, JSON.stringify(favorites));
        } catch (error) {
            console.warn('保存收藏失败:', error);
        }
    }
    
    toggleFavorite(examId) {
        if (this.state.favorites.has(examId)) {
            this.state.favorites.delete(examId);
        } else {
            this.state.favorites.add(examId);
        }
        this.saveFavorites();
        
        // 更新UI
        this.updateFavoriteButtons();
        
        // 如果"仅显示收藏"开启，重新筛选
        if (this.state.filters.favoritesOnly) {
            this.applyFilters();
            this.render();
        }
    }
    
    updateFavoriteButtons() {
        // 更新卡片上的收藏按钮
        document.querySelectorAll('.exam-favorite-btn').forEach(btn => {
            const examId = btn.dataset.examId;
            if (examId) {
                const isFavorite = this.state.favorites.has(examId);
                btn.classList.toggle('active', isFavorite);
                btn.innerHTML = `<i class="${isFavorite ? 'fas' : 'far'} fa-star"></i>`;
            }
        });
        
        // 更新模态框中的收藏按钮
        const modalFavoriteBtn = document.getElementById('modal-favorite-btn');
        if (modalFavoriteBtn && this.state.currentExam) {
            const isFavorite = this.state.favorites.has(this.state.currentExam.id);
            modalFavoriteBtn.innerHTML = `
                <i class="${isFavorite ? 'fas' : 'far'} fa-star me-1"></i>
                ${isFavorite ? '已收藏' : '收藏'}
            `;
        }
    }
    
    initUI() {
        // 初始化筛选选项
        this.initFilterOptions();
    }
    
    initFilterOptions() {
        // 收集所有可能的选项
        const subjects = new Set();
        const difficulties = new Set();
        const sources = new Set();
        
        this.state.exams.forEach(exam => {
            subjects.add(exam.subject);
            difficulties.add(exam.difficulty);
            sources.add(exam.source);
        });
        
        // 更新筛选器选项
        this.updateSelectOptions('filter-subject', Array.from(subjects));
        this.updateSelectOptions('filter-difficulty', Array.from(difficulties));
        this.updateSelectOptions('filter-source', Array.from(sources));
    }
    
    updateSelectOptions(selectId, options) {
        const select = document.getElementById(selectId);
        if (!select) return;
        
        // 清空现有选项（保留第一个空选项）
        while (select.options.length > 1) {
            select.remove(1);
        }
        
        // 添加新选项
        options.sort().forEach(option => {
            const optionEl = document.createElement('option');
            optionEl.value = option;
            optionEl.textContent = option;
            select.appendChild(optionEl);
        });
    }
    
    updateFiltersFromUI() {
        this.state.filters = {
            search: document.getElementById('search-input').value.trim().toLowerCase(),
            subject: document.getElementById('filter-subject').value,
            difficulty: document.getElementById('filter-difficulty').value,
            source: document.getElementById('filter-source').value,
            grade: document.getElementById('filter-grade').value,
            favoritesOnly: document.getElementById('favorites-only').checked
        };
    }
    
    applyFilters() {
        this.updateFiltersFromUI();
        const filters = this.state.filters;
        
        this.state.filteredExams = this.state.exams.filter(exam => {
            // 搜索过滤
            if (filters.search) {
                const searchTerm = filters.search.toLowerCase();
                const searchable = [
                    exam.name,
                    exam.description,
                    exam.subject,
                    exam.tags?.join(' ')
                ].join(' ').toLowerCase();
                
                if (!searchable.includes(searchTerm)) {
                    return false;
                }
            }
            
            // 科目过滤
            if (filters.subject && exam.subject !== filters.subject) {
                return false;
            }
            
            // 难度过滤
            if (filters.difficulty && exam.difficulty !== filters.difficulty) {
                return false;
            }
            
            // 来源过滤
            if (filters.source && exam.source !== filters.source) {
                return false;
            }
            
            // 年级过滤
            if (filters.grade && exam.grade !== filters.grade) {
                return false;
            }
            
            // 收藏过滤
            if (filters.favoritesOnly && !this.state.favorites.has(exam.id)) {
                return false;
            }
            
            return true;
        });
        
        // 排序：收藏优先，下载量高优先
        this.state.filteredExams.sort((a, b) => {
            const aFavorite = this.state.favorites.has(a.id);
            const bFavorite = this.state.favorites.has(b.id);
            
            if (aFavorite && !bFavorite) return -1;
            if (!aFavorite && bFavorite) return 1;
            
            return b.downloads - a.downloads;
        });
        
        // 更新分页
        this.updatePagination();
    }
    
    updatePagination() {
        const totalExams = this.state.filteredExams.length;
        const totalPages = Math.ceil(totalExams / CONFIG.ITEMS_PER_PAGE);
        
        this.state.pagination = {
            currentPage: 1,
            totalPages: Math.max(1, totalPages)
        };
    }
    
    goToPage(page) {
        if (page < 1 || page > this.state.pagination.totalPages) return;
        
        this.state.pagination.currentPage = page;
        this.renderExamsGrid();
        
        // 滚动到顶部
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    
    render() {
        this.renderExamsGrid();
        this.renderPagination();
    }
    
    renderExamsGrid() {
        const gridEl = document.getElementById('exams-grid');
        const emptyStateEl = document.getElementById('empty-state');
        const paginationEl = document.getElementById('pagination-container');
        
        if (!gridEl) return;
        
        // 计算当前页显示的数据
        const { currentPage, totalPages } = this.state.pagination;
        const startIndex = (currentPage - 1) * CONFIG.ITEMS_PER_PAGE;
        const endIndex = startIndex + CONFIG.ITEMS_PER_PAGE;
        this.state.displayedExams = this.state.filteredExams.slice(startIndex, endIndex);
        
        // 显示/隐藏空状态
        if (this.state.displayedExams.length === 0) {
            gridEl.innerHTML = '';
            if (emptyStateEl) emptyStateEl.classList.remove('d-none');
            if (paginationEl) paginationEl.classList.add('d-none');
            return;
        }
        
        if (emptyStateEl) emptyStateEl.classList.add('d-none');
        if (paginationEl && totalPages > 1) {
            paginationEl.classList.remove('d-none');
        }
        
        // 生成试卷卡片
        gridEl.innerHTML = this.state.displayedExams.map((exam, index) => {
            return this.createExamCard(exam, index);
        }).join('');
        
        // 添加图片加载处理
        this.initImageLoading();
    }
    
    createExamCard(exam, index) {
        const isFavorite = this.state.favorites.has(exam.id);
        const fileSizeMB = (exam.fileSize / 1024 / 1024).toFixed(1);
        const previewImage = exam.previewImages && exam.previewImages[0] ? exam.previewImages[0] : '';
        
        return `
            <div class="exam-card" data-exam-id="${exam.id}">
                <div class="exam-image-container" id="image-container-${exam.id}">
                    <img src="${previewImage}" 
                         alt="${exam.name}"
                         class="exam-image"
                         loading="lazy"
                         onload="this.classList.add('loaded'); this.parentElement.classList.add('loaded')"
                         onerror="this.style.display='none'">
                    <button class="exam-favorite-btn ${isFavorite ? 'active' : ''}" 
                            data-exam-id="${exam.id}"
                            aria-label="${isFavorite ? '取消收藏' : '收藏'}">
                        <i class="${isFavorite ? 'fas' : 'far'} fa-star"></i>
                    </button>
                </div>
                <div class="exam-content">
                    <h3 class="exam-title">${exam.name}</h3>
                    <p class="exam-description">${exam.description}</p>
                    <div class="exam-tags">
                        <span class="exam-tag">${exam.subject}</span>
                        <span class="exam-tag">${exam.difficulty}</span>
                        ${exam.grade ? `<span class="exam-tag">${exam.grade}</span>` : ''}
                        ${exam.tags && exam.tags.slice(0, 2).map(tag => 
                            `<span class="exam-tag">${tag}</span>`
                        ).join('')}
                    </div>
                    <div class="exam-meta">
                        <div class="exam-meta-item">
                            <i class="fas fa-university"></i>
                            <span>${exam.source}</span>
                        </div>
                        <div class="exam-meta-item">
                            <i class="fas fa-download"></i>
                            <span>${fileSizeMB} MB</span>
                        </div>
                    </div>
                    <button class="exam-view-btn" data-exam-id="${exam.id}">
                        查看详情
                    </button>
                </div>
            </div>
        `;
    }
    
    initImageLoading() {
        // 处理图片加载
        setTimeout(() => {
            document.querySelectorAll('.exam-image').forEach(img => {
                if (img.complete) {
                    img.classList.add('loaded');
                    if (img.parentElement) {
                        img.parentElement.classList.add('loaded');
                    }
                }
            });
        }, 100);
    }
    
    renderPagination() {
        const paginationEl = document.getElementById('pagination');
        if (!paginationEl) return;
        
        const { currentPage, totalPages } = this.state.pagination;
        
        if (totalPages <= 1) {
            paginationEl.innerHTML = '';
            return;
        }
        
        let paginationHTML = '';
        
        // 上一页按钮
        paginationHTML += `
            <li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
                <a class="page-link" href="#" onclick="examPlatform.goToPage(${currentPage - 1}); return false;">
                    <i class="fas fa-chevron-left"></i>
                </a>
            </li>
        `;
        
        // 页码按钮
        const maxVisiblePages = 5;
        let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
        let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
        
        if (endPage - startPage + 1 < maxVisiblePages) {
            startPage = Math.max(1, endPage - maxVisiblePages + 1);
        }
        
        if (startPage > 1) {
            paginationHTML += `
                <li class="page-item">
                    <a class="page-link" href="#" onclick="examPlatform.goToPage(1); return false;">1</a>
                </li>
                ${startPage > 2 ? '<li class="page-item disabled"><span class="page-link">...</span></li>' : ''}
            `;
        }
        
        for (let i = startPage; i <= endPage; i++) {
            paginationHTML += `
                <li class="page-item ${i === currentPage ? 'active' : ''}">
                    <a class="page-link" href="#" onclick="examPlatform.goToPage(${i}); return false;">${i}</a>
                </li>
            `;
        }
        
        if (endPage < totalPages) {
            paginationHTML += `
                ${endPage < totalPages - 1 ? '<li class="page-item disabled"><span class="page-link">...</span></li>' : ''}
                <li class="page-item">
                    <a class="page-link" href="#" onclick="examPlatform.goToPage(${totalPages}); return false;">${totalPages}</a>
                </li>
            `;
        }
        
        // 下一页按钮
        paginationHTML += `
            <li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
                <a class="page-link" href="#" onclick="examPlatform.goToPage(${currentPage + 1}); return false;">
                    <i class="fas fa-chevron-right"></i>
                </a>
            </li>
        `;
        
        paginationEl.innerHTML = paginationHTML;
    }
    
    showExamDetails(examId) {
        const exam = this.state.exams.find(e => e.id === examId);
        if (!exam) return;
        
        this.state.currentExam = exam;
        
        // 更新模态框内容
        this.updateModalContent(exam);
        
        // 显示模态框
        const modal = new bootstrap.Modal(document.getElementById('exam-modal'));
        modal.show();
    }
    
    updateModalContent(exam) {
        const modalTitle = document.getElementById('modal-title');
        const modalBody = document.getElementById('modal-body');
        
        if (!modalTitle || !modalBody) return;
        
        const isFavorite = this.state.favorites.has(exam.id);
        const fileSizeMB = (exam.fileSize / 1024 / 1024).toFixed(2);
        
        // 更新标题
        modalTitle.textContent = exam.name;
        
        // 构建模态框内容
        modalBody.innerHTML = `
            <div class="modal-images">
                ${exam.previewImages && exam.previewImages.length > 0 ? 
                    exam.previewImages.map((img, index) => `
                        <div class="modal-image">
                            <img src="${img}" 
                                 alt="${exam.name} - 预览图 ${index + 1}"
                                 class="img-fluid rounded"
                                 loading="lazy"
                                 onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjVmN2ZhIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzY2NiIgdGV4dC1hbmNob3I9Im1pZGRsZSI+5Zu+54mH6K6w5b2VPC90ZXh0Pjwvc3ZnPg=='">
                        </div>
                    `).join('') : 
                    '<div class="text-center text-muted py-4">暂无预览图</div>'
                }
            </div>
            
            <div class="modal-details-grid">
                <div class="detail-item">
                    <i class="fas fa-book detail-icon"></i>
                    <div>
                        <small class="text-muted d-block">科目</small>
                        <strong>${exam.subject}</strong>
                    </div>
                </div>
                <div class="detail-item">
                    <i class="fas fa-chart-line detail-icon"></i>
                    <div>
                        <small class="text-muted d-block">难度</small>
                        <strong>${exam.difficulty}</strong>
                    </div>
                </div>
                <div class="detail-item">
                    <i class="fas fa-user-graduate detail-icon"></i>
                    <div>
                        <small class="text-muted d-block">年级</small>
                        <strong>${exam.grade || '通用'}</strong>
                    </div>
                </div>
                <div class="detail-item">
                    <i class="fas fa-calendar-alt detail-icon"></i>
                    <div>
                        <small class="text-muted d-block">年份</small>
                        <strong>${exam.year}</strong>
                    </div>
                </div>
                <div class="detail-item">
                    <i class="fas fa-university detail-icon"></i>
                    <div>
                        <small class="text-muted d-block">来源</small>
                        <strong>${exam.source}</strong>
                    </div>
                </div>
                ${exam.author ? `
                    <div class="detail-item">
                        <i class="fas fa-user-edit detail-icon"></i>
                        <div>
                            <small class="text-muted d-block">作者</small>
                            <strong>${exam.author}</strong>
                        </div>
                    </div>
                ` : ''}
                <div class="detail-item">
                    <i class="fas fa-file-alt detail-icon"></i>
                    <div>
                        <small class="text-muted d-block">页数</small>
                        <strong>${exam.pageCount || '未知'}</strong>
                    </div>
                </div>
                <div class="detail-item">
                    <i class="fas fa-clock detail-icon"></i>
                    <div>
                        <small class="text-muted d-block">建议用时</small>
                        <strong>${exam.recommendedTime || '未知'}分钟</strong>
                    </div>
                </div>
                <div class="detail-item">
                    <i class="fas fa-download detail-icon"></i>
                    <div>
                        <small class="text-muted d-block">下载次数</small>
                        <strong>${exam.downloads.toLocaleString()}</strong>
                    </div>
                </div>
                <div class="detail-item">
                    <i class="fas fa-file detail-icon"></i>
                    <div>
                        <small class="text-muted d-block">文件格式</small>
                        <strong>${exam.fileFormat.toUpperCase()}</strong>
                    </div>
                </div>
                <div class="detail-item">
                    <i class="fas fa-weight detail-icon"></i>
                    <div>
                        <small class="text-muted d-block">文件大小</small>
                        <strong>${fileSizeMB} MB</strong>
                    </div>
                </div>
            </div>
            
            <div class="modal-tags">
                ${exam.tags.map(tag => `<span class="badge bg-light text-dark border">${tag}</span>`).join('')}
            </div>
            
            <div class="modal-description">
                <h6 class="mb-2">试卷描述</h6>
                <p class="mb-0">${exam.description}</p>
            </div>
        `;
        
        // 更新收藏按钮
        const favoriteBtn = document.getElementById('modal-favorite-btn');
        if (favoriteBtn) {
            favoriteBtn.innerHTML = `
                <i class="${isFavorite ? 'fas' : 'far'} fa-star me-1"></i>
                ${isFavorite ? '已收藏' : '收藏'}
            `;
        }
        
        // 绑定模态框按钮事件
        this.bindModalButtons();
    }
    
    bindModalButtons() {
        const modal = document.getElementById('exam-modal');
        const exam = this.state.currentExam;
        if (!exam) return;
        
        // 收藏按钮
        const favoriteBtn = modal.querySelector('#modal-favorite-btn');
        if (favoriteBtn) {
            favoriteBtn.onclick = () => {
                this.toggleFavorite(exam.id);
            };
        }
        
        // 分享按钮
        const shareBtn = modal.querySelector('#modal-share-btn');
        if (shareBtn) {
            shareBtn.onclick = () => this.shareExam(exam);
        }
        
        // 下载按钮
        const downloadBtn = modal.querySelector('#modal-download-btn');
        if (downloadBtn) {
            downloadBtn.onclick = () => this.downloadExam(exam);
        }
    }
    
    shareExam(exam) {
        const shareUrl = `${window.location.origin}${window.location.pathname}?exam=${exam.id}`;
        
        // 复制到剪贴板
        navigator.clipboard.writeText(shareUrl).then(() => {
            this.showToast('链接已复制到剪贴板');
        }).catch(err => {
            console.error('复制失败:', err);
            
            // 降级方案
            const textArea = document.createElement('textarea');
            textArea.value = shareUrl;
            document.body.appendChild(textArea);
            textArea.select();
            
            try {
                document.execCommand('copy');
                this.showToast('链接已复制到剪贴板');
            } catch (err) {
                alert('复制失败，请手动复制链接: ' + shareUrl);
            }
            
            document.body.removeChild(textArea);
        });
    }
    
    downloadExam(exam) {
        if (!exam.fileUrl || exam.fileUrl === '#') {
            this.showToast('文件链接暂不可用');
            return;
        }
        
        // 创建下载链接
        const link = document.createElement('a');
        link.href = exam.fileUrl;
        link.download = `${exam.name}.${exam.fileFormat}`;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        
        // 添加到页面并触发点击
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // 更新下载次数（本地模拟）
        exam.downloads = (exam.downloads || 0) + 1;
        this.showToast('开始下载试卷...');
    }
    
    showToast(message) {
        const toastEl = document.getElementById('share-toast');
        if (!toastEl) return;
        
        const toastBody = toastEl.querySelector('.toast-body');
        if (toastBody) {
            toastBody.textContent = message;
        }
        
        const toast = new bootstrap.Toast(toastEl);
        toast.show();
    }
    
    bindEvents() {
        // 搜索输入
        const searchInput = document.getElementById('search-input');
        if (searchInput) {
            let searchTimeout;
            searchInput.addEventListener('input', (e) => {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => {
                    this.applyFilters();
                    this.render();
                }, 300);
            });
        }
        
        // 清空搜索
        const clearSearchBtn = document.getElementById('clear-search');
        if (clearSearchBtn) {
            clearSearchBtn.addEventListener('click', () => {
                if (searchInput) searchInput.value = '';
                this.applyFilters();
                this.render();
            });
        }
        
        // 高级筛选按钮
        const toggleFilterBtn = document.getElementById('toggle-advanced-filters');
        if (toggleFilterBtn) {
            toggleFilterBtn.addEventListener('click', () => {
                const panel = document.getElementById('advanced-filters-panel');
                if (panel) {
                    panel.classList.toggle('show');
                    toggleFilterBtn.innerHTML = panel.classList.contains('show') ? 
                        '<i class="fas fa-times me-2"></i>收起筛选' : 
                        '<i class="fas fa-filter me-2"></i>高级筛选';
                }
            });
        }
        
        // 应用筛选按钮
        const applyFiltersBtn = document.getElementById('apply-filters');
        if (applyFiltersBtn) {
            applyFiltersBtn.addEventListener('click', () => {
                this.applyFilters();
                this.render();
            });
        }
        
        // 重置筛选按钮
        const resetFiltersBtn = document.getElementById('reset-filters');
        if (resetFiltersBtn) {
            resetFiltersBtn.addEventListener('click', () => {
                this.resetFilters();
            });
        }
        
        // 重置所有筛选
        const resetAllFiltersBtn = document.getElementById('reset-all-filters');
        if (resetAllFiltersBtn) {
            resetAllFiltersBtn.addEventListener('click', () => {
                this.resetFilters();
            });
        }
        
        // 仅显示收藏开关
        const favoritesOnly = document.getElementById('favorites-only');
        if (favoritesOnly) {
            favoritesOnly.addEventListener('change', () => {
                this.applyFilters();
                this.render();
            });
        }
        
        // 快速筛选标签
        document.addEventListener('click', (e) => {
            if (e.target.closest('#quick-filters .btn')) {
                const btn = e.target.closest('#quick-filters .btn');
                const filter = btn.dataset.filter;
                
                if (filter === 'all') {
                    this.resetFilters();
                } else {
                    this.applyQuickFilter(filter);
                }
                
                // 更新按钮状态
                document.querySelectorAll('#quick-filters .btn').forEach(b => {
                    b.classList.remove('active');
                });
                btn.classList.add('active');
            }
            
            // 查看详情按钮
            if (e.target.closest('.exam-view-btn')) {
                const examId = e.target.closest('.exam-view-btn').dataset.examId;
                if (examId) {
                    this.showExamDetails(examId);
                }
            }
            
            // 卡片点击
            if (e.target.closest('.exam-card') && !e.target.closest('.exam-favorite-btn')) {
                const examId = e.target.closest('.exam-card').dataset.examId;
                if (examId) {
                    this.showExamDetails(examId);
                }
            }
            
            // 收藏按钮
            if (e.target.closest('.exam-favorite-btn')) {
                const examId = e.target.closest('.exam-favorite-btn').dataset.examId;
                if (examId) {
                    this.toggleFavorite(examId);
                    e.stopPropagation();
                }
            }
        });
        
        // URL参数处理
        window.addEventListener('popstate', () => this.handleUrlParams());
        this.handleUrlParams();
    }
    
    applyQuickFilter(filter) {
        const [type, value] = filter.split(':');
        
        switch(type) {
            case 'subject':
                document.getElementById('filter-subject').value = value;
                break;
            case 'tag':
                document.getElementById('search-input').value = value;
                break;
        }
        
        this.applyFilters();
        this.render();
    }
    
    resetFilters() {
        // 重置筛选值
        this.state.filters = {
            search: '',
            subject: '',
            difficulty: '',
            source: '',
            grade: '',
            favoritesOnly: false
        };
        
        // 重置UI
        const searchInput = document.getElementById('search-input');
        if (searchInput) searchInput.value = '';
        
        const filterIds = ['filter-subject', 'filter-difficulty', 'filter-source', 'filter-grade'];
        filterIds.forEach(id => {
            const element = document.getElementById(id);
            if (element) element.value = '';
        });
        
        const favoritesOnly = document.getElementById('favorites-only');
        if (favoritesOnly) favoritesOnly.checked = false;
        
        // 重置快速筛选按钮
        document.querySelectorAll('#quick-filters .btn').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.filter === 'all') {
                btn.classList.add('active');
            }
        });
        
        this.applyFilters();
        this.render();
    }
    
    handleUrlParams() {
        const urlParams = new URLSearchParams(window.location.search);
        const examId = urlParams.get('exam');
        
        if (examId) {
            // 延迟执行，等待数据加载完成
            setTimeout(() => {
                this.showExamDetails(examId);
            }, 500);
        }
    }
}

// 初始化应用
let examPlatform;

document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM已加载，正在初始化应用...');
    
    try {
        examPlatform = new ExamPlatform();
        window.examPlatform = examPlatform; // 暴露到全局，便于调试
        
        console.log('应用初始化完成');
    } catch (error) {
        console.error('应用初始化失败:', error);
        
        // 显示错误页面
        const appEl = document.getElementById('app');
        if (appEl) {
            appEl.innerHTML = `
                <div class="container py-5">
                    <div class="alert alert-danger">
                        <h4 class="alert-heading">应用程序错误</h4>
                        <p>${error.message}</p>
                        <button class="btn btn-danger" onclick="location.reload()">重新加载</button>
                    </div>
                </div>
            `;
            appEl.style.display = 'block';
        }
    }
});