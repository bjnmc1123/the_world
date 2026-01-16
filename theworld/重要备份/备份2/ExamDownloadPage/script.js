/**
 * 试卷下载平台 - 最终修复版
 */

// 全局配置常量
const CONFIG = {
    CONFIG_URL: 'config.json',
    DATA_URL: 'metadata.json',
    FAVORITES_KEY: 'exam_favorites_v5'
};

// 状态管理类
class ExamPlatform {
    constructor() {
        this.state = {
            config: null,
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
            error: null,
            examStats: {
                totalCount: 0,
                subjects: new Set(),
                difficulties: new Set(),
                sources: new Set()
            }
        };
        
        this.modalInstance = null;
        this.isRendering = false;
        this.renderTimeout = null;
        
        this.init();
    }
    
    async init() {
        try {
            // 隐藏初始加载状态，显示主应用
            this.hideLoading();
            
            // 加载配置
            await this.loadConfig();
            
            // 启动开屏特效
            await this.showSplashScreen();
            
            // 加载试卷数据
            await this.loadExams();
            
            // 加载用户收藏
            this.loadFavorites();
            
            // 初始化UI
            this.initUI();
            
            // 绑定事件
            this.bindEvents();
            
            // 应用初始筛选
            this.applyFilters();
            
            // 渲染页面
            this.render();
            
            // 确保主应用完全显示
            this.ensureAppDisplayed();
            
            // 确保布局正确
            this.ensureLayout();
            
        } catch (error) {
            console.error('初始化失败:', error);
            this.state.error = error.message;
            this.showError('加载失败: ' + error.message);
        }
    }
    
    // 新增：确保布局正确，页脚在底部
    ensureLayout() {
        // 设置body的最小高度
        document.body.style.minHeight = '100vh';
        document.body.style.display = 'flex';
        document.body.style.flexDirection = 'column';
        
        // 确保应用容器撑开
        const appEl = document.getElementById('app');
        if (appEl) {
            appEl.style.flex = '1';
            appEl.style.display = 'flex';
            appEl.style.flexDirection = 'column';
        }
        
        // 确保主内容区撑开
        const mainEl = document.querySelector('main.container');
        if (mainEl) {
            mainEl.style.flex = '1 0 auto';
        }
        
        // 确保页脚在底部
        const footerEl = document.querySelector('footer');
        if (footerEl) {
            footerEl.style.marginTop = 'auto';
        }
    }
    
    async showSplashScreen() {
        return new Promise((resolve) => {
            const splashConfig = this.state.config?.splashScreen;
            
            // 检查是否启用开屏特效
            if (!splashConfig || !splashConfig.enabled) {
                resolve();
                return;
            }
            
            // 确保主应用容器被隐藏
            const appEl = document.getElementById('app');
            if (appEl) {
                appEl.style.display = 'none';
            }
            
            // 创建开屏特效元素
            const splashScreen = document.createElement('div');
            splashScreen.className = 'splash-screen';
            splashScreen.style.backgroundColor = splashConfig.backgroundColor || '#4a6cf7';
            
            splashScreen.innerHTML = `
                <div class="splash-content">
                    <div class="spiral-container">
                        <div class="spiral" style="border-top-color: ${splashConfig.spiralColor || '#ffffff'}"></div>
                        <div class="spiral" style="border-right-color: ${splashConfig.spiralColor || '#ffffff'}"></div>
                        <div class="spiral" style="border-bottom-color: ${splashConfig.spiralColor || '#ffffff'}"></div>
                        <div class="spiral" style="border-left-color: ${splashConfig.spiralColor || '#ffffff'}"></div>
                    </div>
                    <div class="splash-logo" style="color: ${splashConfig.textColor || '#ffffff'}">
                        <i class="fas fa-graduation-cap"></i>
                    </div>
                </div>
            `;
            
            document.body.appendChild(splashScreen);
            
            // 设置开屏特效持续时间
            const duration = splashConfig.duration || 1500;
            
            // 开屏特效结束后移除
            setTimeout(() => {
                splashScreen.classList.add('hidden');
                
                // 完全移除元素
                setTimeout(() => {
                    if (splashScreen.parentNode) {
                        splashScreen.parentNode.removeChild(splashScreen);
                    }
                    resolve();
                }, 500);
            }, duration);
        });
    }
    
    ensureAppDisplayed() {
        const appEl = document.getElementById('app');
        if (appEl) {
            appEl.style.display = 'block';
            appEl.style.opacity = '1';
        }
    }
    
    async loadConfig() {
        try {
            const response = await fetch(CONFIG.CONFIG_URL);
            if (!response.ok) {
                throw new Error(`无法加载配置文件: ${response.status}`);
            }
            this.state.config = await response.json();
            
            // 应用页面配置
            this.applyPageConfig();
            
        } catch (error) {
            console.error('加载配置失败:', error.message);
            this.state.config = this.getDefaultConfig();
            this.applyPageConfig();
            this.showWarning('正在使用默认配置，请检查config.json文件');
        }
    }
    
    getDefaultConfig() {
        return {
            pageTitle: '试卷资源中心',
            siteName: '试卷资源中心',
            header: {
                title: '试卷资源中心',
                subtitle: '点我返回主页',
                icon: 'fas fa-graduation-cap'
            },
            mainSection: {
                title: '试卷资源下载',
                description: '精选优质试卷，助力学习进步',
                emptyState: {
                    icon: 'fas fa-file-search',
                    title: '未找到相关试卷',
                    message: '尝试调整搜索关键词或筛选条件',
                    buttonText: '重置所有筛选'
                }
            },
            footer: {
                backgroundColor: '#1a1a1a',
                backgroundOpacity: 0.5,
                textColor: '#ffffff',
                copyrightText: '© 2024 试卷资源中心',
                additionalText: '致力于提供优质教育资源的平台，所有资源仅供学习交流使用。',
                contactInfo: '',
                disclaimer: ''
            },
            uiConfig: {
                itemsPerPage: 12,
                backgroundImage: 'none',
                backgroundOpacity: 0.08,
                navbar: {
                    backgroundColor: '#4a6cf7',
                    backgroundOpacity: 1
                }
            },
            quickFilters: [
                { text: '全部', filter: 'all' },
                { text: '数学', filter: 'subject:数学' },
                { text: '英语', filter: 'subject:英语' },
                { text: '物理', filter: 'subject:物理' },
                { text: '化学', filter: 'subject:化学' }
            ],
            availableGrades: ['高一', '高二', '高三'],
            splashScreen: {
                enabled: true,
                duration: 1500,
                backgroundColor: '#4a6cf7',
                textColor: '#ffffff',
                spiralColor: '#ffffff'
            }
        };
    }
    
    applyPageConfig() {
        const config = this.state.config;
        
        // 设置页面标题
        document.title = config.pageTitle || '试卷资源中心';
        
        // 更新导航栏
        const navbarBrand = document.querySelector('.navbar-brand');
        if (navbarBrand) {
            navbarBrand.innerHTML = `
                <i class="${config.header.icon || 'fas fa-graduation-cap'} me-2"></i>
                ${config.header.title || '试卷资源中心'} 
                <span class="small fw-normal">${config.header.subtitle || ''}</span>
            `;
        }
        
        // 更新主标题
        const mainTitle = document.querySelector('main h1');
        const mainDesc = document.querySelector('main .text-muted');
        if (mainTitle && config.mainSection.title) {
            mainTitle.textContent = config.mainSection.title;
        }
        if (mainDesc && config.mainSection.description) {
            mainDesc.textContent = config.mainSection.description;
        }
        
        // 更新快速筛选按钮
        this.initQuickFilters();
        
        // 更新空状态
        const emptyStateEl = document.getElementById('empty-state');
        if (emptyStateEl && config.mainSection.emptyState) {
            const emptyState = config.mainSection.emptyState;
            emptyStateEl.innerHTML = `
                <div class="col-12 text-center py-5">
                    <i class="${emptyState.icon} fa-3x text-muted mb-3"></i>
                    <h4 class="text-muted">${emptyState.title}</h4>
                    <p class="text-muted">${emptyState.message}</p>
                    <button class="btn btn-outline-primary" id="reset-all-filters">${emptyState.buttonText}</button>
                </div>
            `;
        }
        
        // 更新页脚
        this.updateFooter();
        
        // 设置背景
        this.setBackground();
        
        // 设置导航栏样式
        this.setNavbarStyle();
        
        // 设置开屏动画样式
        this.setSplashScreenStyle();
    }
    
    setNavbarStyle() {
        const navbarConfig = this.state.config?.uiConfig?.navbar;
        if (!navbarConfig) return;
        
        // 将十六进制颜色转换为RGBA
        const rgb = this.hexToRgb(navbarConfig.backgroundColor || '#4a6cf7');
        const opacity = navbarConfig.backgroundOpacity || 1;
        
        // 设置完整的rgba颜色到CSS变量
        const rgbaColor = `rgba(${rgb}, ${opacity})`;
        document.documentElement.style.setProperty('--navbar-bg-color', rgbaColor);
        
        // 直接设置导航栏背景色，使用 !important
        const navbar = document.querySelector('.navbar');
        if (navbar) {
            // 使用 setProperty 来添加 !important
            navbar.style.setProperty('background-color', rgbaColor, 'important');
        }
    }
    
    setSplashScreenStyle() {
        const splashConfig = this.state.config?.splashScreen;
        if (!splashConfig) return;
        
        // 设置开屏动画的CSS变量
        document.documentElement.style.setProperty('--splash-bg-color', splashConfig.backgroundColor || '#4a6cf7');
        document.documentElement.style.setProperty('--splash-text-color', splashConfig.textColor || '#ffffff');
        document.documentElement.style.setProperty('--splash-spiral-color', splashConfig.spiralColor || '#ffffff');
    }
    
    updateFooter() {
        const config = this.state.config?.footer;
        if (!config) return;
        
        // 获取页脚元素
        const footer = document.querySelector('footer');
        const footerRow = document.querySelector('footer .row');
        
        if (!footer || !footerRow) return;
        
        // 清空现有的内容
        footerRow.innerHTML = '';
        
        // 计算透明度并设置完整的RGBA颜色
        const opacity = config.backgroundOpacity || 0.5;
        const rgb = this.hexToRgb(config.backgroundColor || '#1a1a1a');
        
        // 设置完整的rgba颜色到CSS变量
        const rgbaColor = `rgba(${rgb}, ${opacity})`;
        document.documentElement.style.setProperty('--footer-bg-color', rgbaColor);
        document.documentElement.style.setProperty('--footer-text-color', config.textColor || '#ffffff');
        
        // 直接设置页脚背景色，使用 !important
        footer.style.setProperty('background-color', rgbaColor, 'important');
        footer.style.color = config.textColor || '#ffffff';
        footer.style.marginTop = 'auto';
        
        // 收集所有可用的文本内容
        const textItems = [];
        
        // 版权信息（包含手动填写的时间，直接使用copyrightText）
        const copyrightText = config.copyrightText || '© 2024 试卷资源中心';
        if (copyrightText.trim()) {
            textItems.push(copyrightText);
        }
        
        // 附加文本
        if (config.additionalText && config.additionalText.trim()) {
            textItems.push(config.additionalText);
        }
        
        // 联系信息
        if (config.contactInfo && config.contactInfo.trim()) {
            textItems.push(config.contactInfo);
        }
        
        // 免责声明
        if (config.disclaimer && config.disclaimer.trim()) {
            textItems.push(config.disclaimer);
        }
        
        // 创建页脚内容容器
        const footerContent = document.createElement('div');
        footerContent.className = 'footer-content';
        
        // 添加文本项
        textItems.forEach((text, index) => {
            if (text.trim()) {
                const p = document.createElement('p');
                
                // 第一行添加first-line类，其他行添加other-line类
                if (index === 0) {
                    p.className = 'first-line fw-medium';
                } else {
                    p.className = 'other-line';
                }
                
                p.style.color = config.textColor || '#ffffff';
                p.innerHTML = text;
                footerContent.appendChild(p);
            }
        });
        
        // 添加到页脚行
        footerRow.appendChild(footerContent);
    }
    
    hexToRgb(hex) {
        // 移除#号
        hex = hex.replace('#', '');
        
        // 解析RGB值
        let r, g, b;
        
        if (hex.length === 3) {
            r = parseInt(hex[0] + hex[0], 16);
            g = parseInt(hex[1] + hex[1], 16);
            b = parseInt(hex[2] + hex[2], 16);
        } else if (hex.length === 6) {
            r = parseInt(hex.substring(0, 2), 16);
            g = parseInt(hex.substring(2, 4), 16);
            b = parseInt(hex.substring(4, 6), 16);
        } else {
            return '26, 26, 26'; // 默认值
        }
        
        return `${r}, ${g}, ${b}`;
    }
    
    setBackground() {
        const uiConfig = this.state.config?.uiConfig;
        if (uiConfig?.backgroundImage && uiConfig.backgroundImage !== 'none') {
            document.documentElement.style.setProperty(
                '--background-image', 
                `url('${uiConfig.backgroundImage}')`
            );
            
            const opacity = uiConfig.backgroundOpacity || 0.08;
            document.documentElement.style.setProperty('--background-opacity', opacity.toString());
            document.body.classList.add('has-background');
        }
    }
    
    initQuickFilters() {
        const quickFilters = this.state.config?.quickFilters;
        const container = document.getElementById('quick-filters');
        if (!container || !quickFilters) return;
        
        container.innerHTML = quickFilters.map(filter => `
            <button type="button" class="btn btn-sm btn-outline-primary ${filter.filter === 'all' ? 'active' : ''}" 
                    data-filter="${filter.filter}">${filter.text}</button>
        `).join('');
    }
    
    async loadExams() {
        try {
            console.log('正在从metadata.json加载试卷数据...');
            
            const response = await fetch(CONFIG.DATA_URL, {
                cache: 'no-cache',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error(`无法加载数据文件: ${response.status} ${response.statusText}`);
            }
            
            const data = await response.json();
            
            if (!data || !Array.isArray(data.exams)) {
                throw new Error('数据格式不正确：metadata.json中缺少exams数组');
            }
            
            if (data.exams.length === 0) {
                this.showWarning('metadata.json中没有试卷数据，请添加试卷到exams数组中');
            }
            
            this.state.exams = data.exams;
            this.state.examStats.totalCount = data.exams.length;
            
            // 收集统计数据
            this.collectExamStats();
            
            // 更新总数显示
            this.updateTotalCount();
            
            console.log(`成功从metadata.json加载 ${this.state.exams.length} 份试卷`);
            
        } catch (error) {
            console.error('加载试卷数据失败:', error.message);
            this.state.exams = [];
            this.state.examStats.totalCount = 0;
            this.collectExamStats();
            this.updateTotalCount();
            
            // 显示详细错误信息
            this.showError(`
                <h5>无法加载试卷数据</h5>
                <p>错误信息: ${error.message}</p>
                <p>请检查：</p>
                <ol>
                    <li>metadata.json文件是否存在</li>
                    <li>metadata.json格式是否正确（必须包含exams数组）</li>
                    <li>服务器是否允许访问metadata.json文件</li>
                </ol>
                <div class="mt-3">
                    <button class="btn btn-primary me-2" onclick="location.reload()">重新加载</button>
                    <a href="metadata.json" target="_blank" class="btn btn-outline-secondary">查看metadata.json</a>
                </div>
            `);
            
            // 抛出错误，停止后续初始化
            throw error;
        }
    }
    
    collectExamStats() {
        const stats = this.state.examStats;
        stats.subjects.clear();
        stats.difficulties.clear();
        stats.sources.clear();
        
        this.state.exams.forEach(exam => {
            if (exam.subject) stats.subjects.add(exam.subject);
            if (exam.difficulty) stats.difficulties.add(exam.difficulty);
            if (exam.source) stats.sources.add(exam.source);
        });
    }
    
    updateTotalCount() {
        const totalEl = document.getElementById('total-count');
        if (totalEl) {
            totalEl.textContent = this.state.examStats.totalCount.toLocaleString();
        }
    }
    
    showWarning(message) {
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
                    ${message}
                </div>
            </div>
        `;
        appEl.style.display = 'block';
    }
    
    hideLoading() {
        const loadingEl = document.getElementById('initial-loading');
        if (loadingEl) loadingEl.style.display = 'none';
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
        this.initFilterOptions();
        this.initGradeOptions();
    }
    
    initFilterOptions() {
        // 收集所有可能的选项
        const subjects = Array.from(this.state.examStats.subjects);
        const difficulties = Array.from(this.state.examStats.difficulties);
        const sources = Array.from(this.state.examStats.sources);
        
        // 更新筛选器选项
        this.updateSelectOptions('filter-subject', subjects);
        this.updateSelectOptions('filter-difficulty', difficulties);
        this.updateSelectOptions('filter-source', sources);
    }
    
    initGradeOptions() {
        const gradeSelect = document.getElementById('filter-grade');
        if (!gradeSelect) return;
        
        const availableGrades = this.state.config?.availableGrades || ['高一', '高二', '高三'];
        
        // 清空现有选项（保留第一个）
        while (gradeSelect.options.length > 1) {
            gradeSelect.remove(1);
        }
        
        // 添加配置的年级选项
        availableGrades.forEach(grade => {
            const option = document.createElement('option');
            option.value = grade;
            option.textContent = grade;
            gradeSelect.appendChild(option);
        });
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
        const itemsPerPage = this.state.config?.uiConfig?.itemsPerPage || 12;
        const totalExams = this.state.filteredExams.length;
        const totalPages = Math.ceil(totalExams / itemsPerPage);
        
        this.state.pagination = {
            currentPage: Math.min(this.state.pagination.currentPage, Math.max(1, totalPages)),
            totalPages: Math.max(1, totalPages)
        };
    }
    
    goToPage(page) {
        if (page < 1 || page > this.state.pagination.totalPages) return;
        
        this.state.pagination.currentPage = page;
        this.scheduleRender();
        
        // 平滑滚动到顶部，但不要立即执行，让浏览器有时间处理渲染
        setTimeout(() => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }, 50);
    }
    
    scheduleRender() {
        // 如果已经在渲染中，取消之前的渲染
        if (this.renderTimeout) {
            clearTimeout(this.renderTimeout);
        }
        
        // 如果当前正在渲染，等待一小段时间再重新渲染
        if (this.isRendering) {
            this.renderTimeout = setTimeout(() => {
                this.render();
            }, 100);
        } else {
            this.render();
        }
    }
    
    render() {
        this.isRendering = true;
        
        // 使用requestAnimationFrame确保在下一个动画帧渲染，避免卡顿
        requestAnimationFrame(() => {
            this.renderExamsGrid();
            this.renderPagination();
            this.isRendering = false;
        });
    }
    
    renderExamsGrid() {
        const gridEl = document.getElementById('exams-grid');
        const emptyStateEl = document.getElementById('empty-state');
        const paginationEl = document.getElementById('pagination-container');
        
        if (!gridEl) return;
        
        // 计算当前页显示的数据
        const itemsPerPage = this.state.config?.uiConfig?.itemsPerPage || 12;
        const { currentPage, totalPages } = this.state.pagination;
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
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
        
        // 生成试卷卡片 - 使用DocumentFragment批量添加DOM节点
        const fragment = document.createDocumentFragment();
        const container = document.createElement('div');
        container.style.display = 'contents'; // 保持grid布局
        
        this.state.displayedExams.forEach((exam, index) => {
            const examCard = this.createExamCardElement(exam, index);
            container.appendChild(examCard);
        });
        
        fragment.appendChild(container);
        
        // 清空现有内容并添加新内容
        gridEl.innerHTML = '';
        gridEl.appendChild(fragment);
        
        // 添加图片加载处理
        this.initImageLoading();
    }
    
    createExamCard(exam, index) {
        const isFavorite = this.state.favorites.has(exam.id);
        const fileSizeMB = exam.fileSize ? (exam.fileSize / 1024 / 1024).toFixed(1) : '0';
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
                            <span>${exam.source || '未知来源'}</span>
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
    
    createExamCardElement(exam, index) {
        const isFavorite = this.state.favorites.has(exam.id);
        const fileSizeMB = exam.fileSize ? (exam.fileSize / 1024 / 1024).toFixed(1) : '0';
        const previewImage = exam.previewImages && exam.previewImages[0] ? exam.previewImages[0] : '';
        
        const card = document.createElement('div');
        card.className = 'exam-card';
        card.dataset.examId = exam.id;
        
        card.innerHTML = `
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
                        <span>${exam.source || '未知来源'}</span>
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
        `;
        
        return card;
    }
    
    initImageLoading() {
        // 处理图片加载 - 使用requestIdleCallback在浏览器空闲时执行
        if ('requestIdleCallback' in window) {
            requestIdleCallback(() => {
                this.processLoadedImages();
            });
        } else {
            setTimeout(() => {
                this.processLoadedImages();
            }, 100);
        }
    }
    
    processLoadedImages() {
        document.querySelectorAll('.exam-image').forEach(img => {
            if (img.complete) {
                img.classList.add('loaded');
                if (img.parentElement) {
                    img.parentElement.classList.add('loaded');
                }
            }
        });
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
                <a class="page-link" href="#" data-page="${currentPage - 1}">
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
                    <a class="page-link" href="#" data-page="1">1</a>
                </li>
                ${startPage > 2 ? '<li class="page-item disabled"><span class="page-link">...</span></li>' : ''}
            `;
        }
        
        for (let i = startPage; i <= endPage; i++) {
            paginationHTML += `
                <li class="page-item ${i === currentPage ? 'active' : ''}">
                    <a class="page-link" href="#" data-page="${i}">${i}</a>
                </li>
            `;
        }
        
        if (endPage < totalPages) {
            paginationHTML += `
                ${endPage < totalPages - 1 ? '<li class="page-item disabled"><span class="page-link">...</span></li>' : ''}
                <li class="page-item">
                    <a class="page-link" href="#" data-page="${totalPages}">${totalPages}</a>
                </li>
            `;
        }
        
        // 下一页按钮
        paginationHTML += `
            <li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
                <a class="page-link" href="#" data-page="${currentPage + 1}">
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
        
        // 获取模态框元素
        const modalElement = document.getElementById('exam-modal');
        if (!modalElement) return;
        
        // 修复模态框关闭问题：先清除现有的模态框实例
        if (this.modalInstance) {
            this.modalInstance.hide();
            this.modalInstance.dispose();
        }
        
        // 创建新的模态框实例
        this.modalInstance = new bootstrap.Modal(modalElement, {
            backdrop: true,
            keyboard: true
        });
        
        // 添加事件监听器来清理模态框关闭时的状态
        modalElement.addEventListener('hidden.bs.modal', () => {
            // 清理状态
            this.state.currentExam = null;
            
            // 清理背景遮罩
            const backdrops = document.querySelectorAll('.modal-backdrop');
            backdrops.forEach(backdrop => backdrop.remove());
            
            // 恢复body样式
            document.body.classList.remove('modal-open');
            document.body.style.overflow = 'auto';
            document.body.style.paddingRight = '0';
        });
        
        // 显示模态框
        this.modalInstance.show();
    }
    
    updateModalContent(exam) {
        const modalTitle = document.getElementById('modal-title');
        const modalBody = document.getElementById('modal-body');
        
        if (!modalTitle || !modalBody) return;
        
        const isFavorite = this.state.favorites.has(exam.id);
        const fileSizeMB = exam.fileSize ? (exam.fileSize / 1024 / 1024).toFixed(2) : '0';
        
        // 更新标题
        modalTitle.textContent = exam.name;
        
        // 构建模态框内容 - 动态显示存在的字段
        const detailItems = [];
        
        // 动态添加字段
        const fieldMap = [
            { key: 'subject', icon: 'fas fa-book', label: '科目', value: exam.subject },
            { key: 'difficulty', icon: 'fas fa-chart-line', label: '难度', value: exam.difficulty },
            { key: 'grade', icon: 'fas fa-user-graduate', label: '年级', value: exam.grade || '通用' },
            { key: 'year', icon: 'fas fa-calendar-alt', label: '年份', value: exam.year },
            { key: 'source', icon: 'fas fa-university', label: '来源', value: exam.source },
            { key: 'author', icon: 'fas fa-user-edit', label: '作者', value: exam.author },
            { key: 'pageCount', icon: 'fas fa-file-alt', label: '页数', value: exam.pageCount || '未知' },
            { key: 'recommendedTime', icon: 'fas fa-clock', label: '建议用时', value: exam.recommendedTime ? `${exam.recommendedTime}分钟` : '未知' },
            { key: 'downloads', icon: 'fas fa-download', label: '下载次数', value: exam.downloads?.toLocaleString() },
            { key: 'fileFormat', icon: 'fas fa-file', label: '文件格式', value: exam.fileFormat?.toUpperCase() },
            { key: 'fileSize', icon: 'fas fa-weight', label: '文件大小', value: `${fileSizeMB} MB` },
            { key: 'uploadDate', icon: 'fas fa-calendar-plus', label: '上传日期', value: exam.uploadDate },
            { key: 'hasAnswer', icon: 'fas fa-check-circle', label: '包含答案', value: exam.hasAnswer ? '是' : '否' }
        ];
        
        fieldMap.forEach(field => {
            if (field.value !== undefined && field.value !== null && field.value !== '') {
                detailItems.push(`
                    <div class="detail-item">
                        <i class="${field.icon} detail-icon"></i>
                        <div>
                            <small class="text-muted d-block">${field.label}</small>
                            <strong>${field.value}</strong>
                        </div>
                    </div>
                `);
            }
        });
        
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
                ${detailItems.join('')}
            </div>
            
            ${exam.tags && exam.tags.length > 0 ? `
                <div class="modal-tags">
                    ${exam.tags.map(tag => `<span class="badge bg-light text-dark border">${tag}</span>`).join('')}
                </div>
            ` : ''}
            
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
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(shareUrl).then(() => {
                this.showToast('链接已复制到剪贴板');
            }).catch(err => {
                this.fallbackCopyToClipboard(shareUrl);
            });
        } else {
            this.fallbackCopyToClipboard(shareUrl);
        }
    }
    
    fallbackCopyToClipboard(text) {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        
        try {
            const successful = document.execCommand('copy');
            if (successful) {
                this.showToast('链接已复制到剪贴板');
            } else {
                alert('复制失败，请手动复制链接: ' + text);
            }
        } catch (err) {
            alert('复制失败，请手动复制链接: ' + text);
        }
        
        document.body.removeChild(textArea);
    }
    
    downloadExam(exam) {
        if (!exam.fileUrl || exam.fileUrl === '#') {
            this.showToast('文件链接暂不可用');
            return;
        }
        
        // 创建一个新的窗口打开PDF文件
        window.open(exam.fileUrl, '_blank');
        
        // 更新下载次数（本地模拟）
        exam.downloads = (exam.downloads || 0) + 1;
        this.showToast('正在打开试卷...');
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
                    this.scheduleRender();
                }, 300);
            });
        }
        
        // 清空搜索
        const clearSearchBtn = document.getElementById('clear-search');
        if (clearSearchBtn) {
            clearSearchBtn.addEventListener('click', () => {
                if (searchInput) searchInput.value = '';
                this.applyFilters();
                this.scheduleRender();
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
                this.scheduleRender();
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
                this.scheduleRender();
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
            
            // 分页按钮点击
            if (e.target.closest('.page-link') && e.target.closest('.page-link').dataset.page) {
                e.preventDefault();
                const page = parseInt(e.target.closest('.page-link').dataset.page);
                if (!isNaN(page)) {
                    this.goToPage(page);
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
        this.scheduleRender();
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
        this.scheduleRender();
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