const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = 3000;

// 定义路径常量 (指向并列的 ExamDownloadPage 文件夹)
const DOWNLOAD_PATH = path.join(__dirname, '../ExamDownloadPage');
const METADATA_PATH = path.join(DOWNLOAD_PATH, 'metadata.json');
const UPLOAD_BASE_DIR = path.join(DOWNLOAD_PATH, 'uploads');

// 配置中间件
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 静态资源：提供前端展示页面访问
app.use(express.static(DOWNLOAD_PATH));

// 静态资源：提供上传文件访问
app.use('/uploads', express.static(path.join(UPLOAD_BASE_DIR)));

// 静态资源：提供后台管理页面访问 (访问 http://localhost:3000/admin)
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin.html'));
});

// API文档页面
app.get('/api-docs', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>API 文档</title>
            <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
            <style>
                body { padding: 20px; background: #f8f9fa; }
                .endpoint { background: white; padding: 15px; border-radius: 8px; margin-bottom: 15px; border-left: 4px solid #4a6cf7; }
            </style>
        </head>
        <body>
            <div class="container">
                <h1 class="mb-4">试卷系统 API 文档</h1>
                <div class="endpoint">
                    <h5>GET /api/exams</h5>
                    <p>获取所有试卷列表</p>
                    <code>curl http://localhost:${PORT}/api/exams</code>
                </div>
                <div class="endpoint">
                    <h5>GET /api/exams/:id</h5>
                    <p>获取指定ID的试卷</p>
                </div>
                <div class="endpoint">
                    <h5>POST /api/upload</h5>
                    <p>上传新试卷 (multipart/form-data)</p>
                    <p>字段: name, subject, difficulty, year, grade, author, description, examFile, previews, tags 等</p>
                </div>
                <div class="endpoint">
                    <h5>PUT /api/exams/:id/view</h5>
                    <p>增加试卷浏览量</p>
                </div>
                <div class="endpoint">
                    <h5>PUT /api/exams/:id/download</h5>
                    <p>增加试卷下载量</p>
                </div>
                <div class="endpoint">
                    <h5>GET /api/stats</h5>
                    <p>获取系统统计信息</p>
                </div>
            </div>
        </body>
        </html>
    `);
});

// 确保上传目录及其子目录存在
const subDirs = ['files', 'previews'];
subDirs.forEach(sub => {
    const fullPath = path.join(UPLOAD_BASE_DIR, sub);
    if (!fs.existsSync(fullPath)) {
        fs.mkdirSync(fullPath, { recursive: true });
    }
});

// 配置 Multer 文件存储逻辑
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        if (file.fieldname === 'examFile') {
            cb(null, path.join(UPLOAD_BASE_DIR, 'files'));
        } else {
            cb(null, path.join(UPLOAD_BASE_DIR, 'previews'));
        }
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const originalName = path.parse(file.originalname).name;
        const safeName = originalName.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 50);
        cb(null, safeName + '_' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ 
    storage,
    limits: {
        fileSize: 50 * 1024 * 1024, // 50MB限制
        files: 6 // 最多6个文件（1个试卷+最多5个预览图）
    },
    fileFilter: (req, file, cb) => {
        const allowedFileTypes = {
            'examFile': ['.pdf', '.doc', '.docx'],
            'previews': ['.jpg', '.jpeg', '.png', '.gif', '.webp']
        };
        
        const ext = path.extname(file.originalname).toLowerCase();
        const allowedExtensions = allowedFileTypes[file.fieldname] || [];
        
        if (allowedExtensions.length === 0 || allowedExtensions.includes(ext)) {
            cb(null, true);
        } else {
            cb(new Error(`文件类型不支持。${file.fieldname === 'examFile' ? '试卷文件' : '预览图'}仅支持: ${allowedExtensions.join(', ')}`));
        }
    }
});

// 辅助函数：读取metadata数据
function readMetadata() {
    try {
        if (!fs.existsSync(METADATA_PATH)) {
            // 如果文件不存在，创建默认结构
            const defaultData = {
                version: "1.1.0",
                lastUpdated: new Date().toISOString(),
                stats: {
                    totalExams: 0,
                    totalViews: 0,
                    totalDownloads: 0,
                    subjects: {}
                },
                exams: []
            };
            fs.writeFileSync(METADATA_PATH, JSON.stringify(defaultData, null, 2));
            return defaultData;
        }
        return JSON.parse(fs.readFileSync(METADATA_PATH, 'utf8'));
    } catch (e) {
        console.error("读取metadata失败:", e);
        return { version: "1.1.0", exams: [] };
    }
}

// 辅助函数：写入metadata数据
function writeMetadata(data) {
    try {
        // 更新统计信息
        data.stats = {
            totalExams: data.exams.length,
            totalViews: data.exams.reduce((sum, exam) => sum + (exam.views || 0), 0),
            totalDownloads: data.exams.reduce((sum, exam) => sum + (exam.downloads || 0), 0),
            lastUpdated: new Date().toISOString(),
            subjects: {}
        };
        
        // 统计各科目数量
        data.exams.forEach(exam => {
            if (exam.subject) {
                data.stats.subjects[exam.subject] = (data.stats.subjects[exam.subject] || 0) + 1;
            }
        });
        
        fs.writeFileSync(METADATA_PATH, JSON.stringify(data, null, 2));
        return true;
    } catch (e) {
        console.error("写入metadata失败:", e);
        return false;
    }
}

// 辅助函数：格式化文件大小
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// API: 获取系统统计信息
app.get('/api/stats', (req, res) => {
    try {
        const data = readMetadata();
        res.json({
            success: true,
            stats: data.stats,
            recentUploads: data.exams.slice(0, 5).map(exam => ({
                id: exam.id,
                name: exam.name,
                subject: exam.subject,
                uploadDate: exam.uploadDate
            }))
        });
    } catch (e) {
        res.status(500).json({ success: false, message: "获取统计信息失败" });
    }
});

// API: 获取所有试卷数据（支持分页和过滤）
app.get('/api/exams', (req, res) => {
    try {
        const data = readMetadata();
        const { page = 1, limit = 20, subject, grade, year, search } = req.query;
        
        let filteredExams = [...data.exams];
        
        // 应用过滤器
        if (subject) {
            filteredExams = filteredExams.filter(exam => exam.subject === subject);
        }
        if (grade) {
            filteredExams = filteredExams.filter(exam => exam.grade === grade);
        }
        if (year) {
            filteredExams = filteredExams.filter(exam => exam.year == year);
        }
        if (search) {
            const searchLower = search.toLowerCase();
            filteredExams = filteredExams.filter(exam => 
                exam.name.toLowerCase().includes(searchLower) || 
                exam.description.toLowerCase().includes(searchLower) ||
                (exam.tags && exam.tags.some(tag => tag.toLowerCase().includes(searchLower)))
            );
        }
        
        // 分页
        const startIndex = (page - 1) * limit;
        const endIndex = page * limit;
        const paginatedExams = filteredExams.slice(startIndex, endIndex);
        
        res.json({
            success: true,
            total: filteredExams.length,
            page: parseInt(page),
            limit: parseInt(limit),
            totalPages: Math.ceil(filteredExams.length / limit),
            exams: paginatedExams
        });
    } catch (e) {
        res.status(500).json({ success: false, message: "获取试卷数据失败" });
    }
});

// API: 获取单个试卷
app.get('/api/exams/:id', (req, res) => {
    try {
        const data = readMetadata();
        const exam = data.exams.find(e => e.id === req.params.id);
        
        if (exam) {
            // 增加浏览量
            exam.views = (exam.views || 0) + 1;
            writeMetadata(data);
            
            res.json({ success: true, exam });
        } else {
            res.status(404).json({ success: false, message: "试卷未找到" });
        }
    } catch (e) {
        res.status(500).json({ success: false, message: "获取试卷失败" });
    }
});

// API: 增加下载量
app.put('/api/exams/:id/download', (req, res) => {
    try {
        const data = readMetadata();
        const exam = data.exams.find(e => e.id === req.params.id);
        
        if (exam) {
            exam.downloads = (exam.downloads || 0) + 1;
            writeMetadata(data);
            
            res.json({ 
                success: true, 
                message: "下载量已更新",
                downloads: exam.downloads 
            });
        } else {
            res.status(404).json({ success: false, message: "试卷未找到" });
        }
    } catch (e) {
        res.status(500).json({ success: false, message: "更新下载量失败" });
    }
});

// API: 处理上传并更新 metadata
app.post('/api/upload', upload.fields([
    { name: 'examFile', maxCount: 1 },
    { name: 'previews', maxCount: 5 }
]), (req, res) => {
    try {
        // 检查必需的文件
        if (!req.files || !req.files['examFile']) {
            return res.status(400).json({ 
                success: false, 
                message: '请上传试卷文件' 
            });
        }

        const data = readMetadata();
        const body = req.body;
        
        const examFile = req.files['examFile'][0];
        const previews = req.files['previews'] || [];

        // 处理知识点（字符串转数组）
        let knowledgePoints = [];
        if (body.knowledgePoints) {
            knowledgePoints = body.knowledgePoints
                .split('\n')
                .map(point => point.trim())
                .filter(point => point.length > 0);
        }

        // 处理标签
        let tags = [];
        if (body.tags) {
            tags = body.tags.split(',').map(tag => tag.trim()).filter(tag => tag);
        }

        // 构建新的试卷条目
        const newExam = {
            id: `exam-${uuidv4().substring(0, 12)}`,
            name: body.name || '未命名试卷',
            description: body.description || '',
            subject: body.subject || '其他',
            difficulty: body.difficulty || '中等',
            views: 0,
            downloads: 0,
            source: body.source || "内部上传",
            // 存储路径相对于 ExamDownloadPage 的根目录，方便前端 script.js 直接引用
            fileUrl: `./uploads/files/${examFile.filename}`,
            fileSize: examFile.size,
            fileSizeFormatted: formatFileSize(examFile.size),
            fileFormat: path.extname(examFile.originalname).replace('.', '').toUpperCase(),
            previewImages: previews.map(p => `./uploads/previews/${p.filename}`),
            tags: tags,
            knowledgePoints: knowledgePoints,
            year: parseInt(body.year) || new Date().getFullYear(),
            grade: body.grade || '高三',
            author: body.author || "管理员",
            pageCount: parseInt(body.pageCount) || 1,
            questionCount: body.questionCount ? parseInt(body.questionCount) : null,
            totalScore: body.totalScore ? parseInt(body.totalScore) : null,
            hasAnswer: body.hasAnswer === 'true',
            answerIncluded: body.answerIncluded === 'true',
            isOriginal: body.isOriginal === 'true',
            recommendedTime: parseInt(body.recommendedTime) || 60,
            region: body.region || '',
            remarks: body.remarks || '',
            uploadDate: new Date().toISOString().split('T')[0],
            uploadTimestamp: Date.now(),
            lastModified: new Date().toISOString()
        };

        // 将新内容插入数组开头
        data.exams.unshift(newExam);
        
        // 写回 metadata.json
        if (writeMetadata(data)) {
            res.status(200).json({ 
                success: true, 
                message: '试卷资源发布成功！',
                exam: newExam,
                stats: data.stats
            });
        } else {
            res.status(500).json({ 
                success: false, 
                message: '保存数据失败' 
            });
        }
    } catch (error) {
        console.error("上传失败:", error);
        
        // 清理已上传的文件
        if (req.files) {
            Object.values(req.files).flat().forEach(file => {
                try {
                    fs.unlinkSync(file.path);
                } catch (e) {
                    console.error("清理文件失败:", file.path, e);
                }
            });
        }
        
        res.status(500).json({ 
            success: false, 
            message: error.message || '服务器内部错误' 
        });
    }
});

// API: 搜索试卷
app.get('/api/exams/search/:keyword', (req, res) => {
    try {
        const data = readMetadata();
        const keyword = req.params.keyword.toLowerCase();
        
        const results = data.exams.filter(exam => 
            exam.name.toLowerCase().includes(keyword) ||
            exam.description.toLowerCase().includes(keyword) ||
            (exam.tags && exam.tags.some(tag => tag.toLowerCase().includes(keyword))) ||
            (exam.knowledgePoints && exam.knowledgePoints.some(point => point.toLowerCase().includes(keyword)))
        );
        
        res.json({
            success: true,
            count: results.length,
            results: results.slice(0, 50) // 限制最多返回50条
        });
    } catch (e) {
        res.status(500).json({ success: false, message: "搜索失败" });
    }
});

// API: 获取科目列表
app.get('/api/subjects', (req, res) => {
    try {
        const data = readMetadata();
        const subjects = {};
        
        data.exams.forEach(exam => {
            if (exam.subject) {
                subjects[exam.subject] = (subjects[exam.subject] || 0) + 1;
            }
        });
        
        res.json({
            success: true,
            subjects: Object.entries(subjects).map(([name, count]) => ({ name, count }))
        });
    } catch (e) {
        res.status(500).json({ success: false, message: "获取科目列表失败" });
    }
});

// 错误处理中间件
app.use((err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ 
                success: false, 
                message: '文件大小超过限制（最大50MB）' 
            });
        }
        if (err.code === 'LIMIT_FILE_COUNT') {
            return res.status(400).json({ 
                success: false, 
                message: '上传文件数量超过限制' 
            });
        }
    }
    
    console.error('服务器错误:', err);
    res.status(500).json({ 
        success: false, 
        message: err.message || '服务器内部错误' 
    });
});

// 404处理
app.use((req, res) => {
    res.status(404).json({ 
        success: false, 
        message: `路由 ${req.method} ${req.url} 未找到` 
    });
});

// 启动服务器
app.listen(PORT, () => {
    console.log(`================================================`);
    console.log(`📚 试卷系统后端启动成功！`);
    console.log(`📍 端口: ${PORT}`);
    console.log(`🌐 前端展示页面: http://localhost:${PORT}`);
    console.log(`⚙️  后台管理页面: http://localhost:${PORT}/admin`);
    console.log(`📊 API文档: http://localhost:${PORT}/api-docs`);
    console.log(`📁 数据文件: ${METADATA_PATH}`);
    console.log(`📂 上传目录: ${UPLOAD_BASE_DIR}`);
    console.log(`================================================`);
    
    // 检查并创建必要目录
    if (!fs.existsSync(UPLOAD_BASE_DIR)) {
        fs.mkdirSync(UPLOAD_BASE_DIR, { recursive: true });
        subDirs.forEach(sub => {
            fs.mkdirSync(path.join(UPLOAD_BASE_DIR, sub), { recursive: true });
        });
        console.log(`✅ 已创建上传目录`);
    }
});