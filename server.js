require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const fileIcon = require('file-icon-extractor');
const app = express();
const port = 3000;
const config = require('./config');
const configFilePath = path.join(__dirname, 'config.json');
const session = require('express-session');
const mongoose = require('mongoose');
const isDevelopment = process.env.NODE_ENV === 'development';
const logsDir = path.join(__dirname, 'logs');

// Criar diretório de logs se não existir
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir);
}

// Função para logging
function logSystem(message, type = 'info', data = null) {
    const now = new Date();
    const timestamp = now.toISOString();
    const logMessage = `[${timestamp}] ${type.toUpperCase()}: ${message}`;
    
    // Log no servidor sempre
    console.log(logMessage);
    if (data) console.log(data);

    // Armazenar logs em arquivo se for produção
    if (!isDevelopment) {
        const dateStr = now.toISOString().split('T')[0]; // YYYY-MM-DD
        const logFile = path.join(logsDir, `${dateStr}.log`);
        const logEntry = `${logMessage}${data ? '\nData: ' + JSON.stringify(data) : ''}\n`;
        
        try {
            fs.appendFileSync(logFile, logEntry);
        } catch (error) {
            console.error('Erro ao gravar log:', error);
        }
    }

    // Retornar o log apenas se for desenvolvimento
    return isDevelopment ? { message, type, data, timestamp } : null;
}

// Schema para configurações do usuário
const UserConfigSchema = new mongoose.Schema({
    userId: String,
    config: {
        searchPaths: [String],
        filters: [String],
        filterType: String,
        extensions: [String],
        sortBy: String,
        sortOrder: String
    }
});

const UserConfig = mongoose.model('UserConfig', UserConfigSchema);

// Middleware
app.use(cors());
app.use('/js', express.static(path.join(__dirname, 'public/js')));
app.use('/css', express.static(path.join(__dirname, 'public/css')));
app.use('/manifest.json', express.static(path.join(__dirname, 'public/manifest.json')));
app.use('/icons', express.static(path.join(__dirname, 'public/icons')));
app.use('/service-worker.js', express.static(path.join(__dirname, 'public/js/service-worker.js')));
app.set('view engine', 'ejs');
app.use(express.json());
app.use(session({
    secret: 'sua_chave_secreta',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false } // Use true em produção com HTTPS
}));

// Adicione estas configurações após os middlewares
app.use((req, res, next) => {
    if (req.path.endsWith('.css')) {
        res.type('text/css');
    } else if (req.path.endsWith('.js')) {
        res.type('application/javascript');
    }
    next();
});

function loadConfig() {
    try {
        const configFile = fs.readFileSync(configFilePath, 'utf-8');
        return JSON.parse(configFile);
    } catch (err) {
        console.error('Erro ao carregar as configurações:', err);
        return null;
    }
}

function saveConfig(config) {
    try {
        const configJSON = JSON.stringify(config, null, 2);
        fs.writeFileSync(configFilePath, configJSON, 'utf-8');
    } catch (err) {
        console.error('Erro ao salvar as configurações:', err);
    }
}

// Função para extrair o ícone do arquivo com tratamento de erro
async function extractFileIcon(filePath) {
    try {
        const iconBuffer = await fileIcon.extract(filePath);
        if (iconBuffer) {
            return `data:image/png;base64,${iconBuffer.toString('base64')}`;
        }
    } catch (error) {
        // Apenas log em modo desenvolvimento
        if (isDevelopment) {
            console.debug(`Ícone não disponível para: ${path.basename(filePath)}`);
        }
    }
    return null;
}

// Função para listar arquivos com metadados
async function getFiles(config) {
    try {
        let allFiles = [];
        
        for (const directoryPath of config.searchPaths) {
            try {
                const files = fs.readdirSync(directoryPath);
                const filesInDir = await Promise.all(files.map(async fileName => {
                    try {
                        const filePath = path.join(directoryPath, fileName);
                        const stats = fs.statSync(filePath);
                        
                        // Retorna informações básicas do arquivo primeiro
                        return {
                            name: fileName,
                            path: directoryPath,
                            creationDate: stats.birthtime.toISOString(),
                            lastModified: stats.mtime.toISOString(),
                            extension: path.extname(fileName),
                            isDirectory: stats.isDirectory(),
                            icon: null // Inicialmente null
                        };
                    } catch (fileError) {
                        console.error(`Erro ao processar arquivo ${fileName}:`, fileError);
                        return null;
                    }
                }));

                // Filtrar arquivos que falharam no processamento
                allFiles = allFiles.concat(filesInDir.filter(file => file !== null));
            } catch (dirError) {
                console.error(`Erro ao ler diretório ${directoryPath}:`, dirError);
            }
        }

        // Aplicar filtros primeiro
        let filteredFiles = allFiles.filter(file => {
            if (config.extensions.length === 0) return true;
            return config.extensions.includes(file.extension);
        });

        // Depois, aplica os filtros de nome
        if (config.filters && config.filters.length > 0) {
            filteredFiles = filteredFiles.filter(file => {
                return config.filters.some(filter => {
                    const filterTerm = filter.trim();
                    if (!filterTerm) return true;

                    if (config.filterType === 'contains') {
                        return file.name.toLowerCase().includes(filterTerm.toLowerCase());
                    } else if (config.filterType === 'startsWith') {
                        return file.name.toLowerCase().startsWith(filterTerm.toLowerCase());
                    }
                    return true;
                });
            });
        }

        // Ordena os arquivos
        if (config.sortBy && config.sortOrder) {
            filteredFiles.sort((a, b) => {
                const aValue = config.sortBy === 'creationDate' ? new Date(a.creationDate) : new Date(a.lastModified);
                const bValue = config.sortBy === 'creationDate' ? new Date(b.creationDate) : new Date(b.lastModified);
                
                if (config.sortOrder === 'asc') {
                    return aValue - bValue;
                } else if (config.sortOrder === 'desc') {
                    return bValue - aValue;
                } else if (config.sortOrder === 'alphabetical') {
                    return a.name.localeCompare(b.name);
                }
            });
        }

        const oneDayAgo = new Date();
        oneDayAgo.setHours(oneDayAgo.getHours() - 24);

        // Separa os arquivos em recentes e outros
        const recentFiles = filteredFiles.filter(file => new Date(file.lastModified) >= oneDayAgo);
        const otherFiles = filteredFiles.filter(file => new Date(file.lastModified) < oneDayAgo);

        // Agora extrai os ícones apenas para os arquivos que serão exibidos
        const extractIconsForFiles = async (files) => {
            return Promise.all(files.map(async file => {
                if (!file.isDirectory && !file.icon) {
                    try {
                        const filePath = path.join(file.path, file.name);
                        const iconBuffer = await fileIcon.extract(filePath);
                        if (iconBuffer) {
                            file.icon = `data:image/png;base64,${iconBuffer.toString('base64')}`;
                        }
                    } catch (error) {
                        if (isDevelopment) {
                            console.debug(`Ícone não disponível para: ${file.name}`);
                        }
                    }
                }
                return file;
            }));
        };

        // Extrai ícones apenas para os arquivos que serão exibidos
        const recentFilesWithIcons = await extractIconsForFiles(recentFiles);
        const otherFilesWithIcons = await extractIconsForFiles(otherFiles);

        return { 
            recentFiles: recentFilesWithIcons, 
            otherFiles: otherFilesWithIcons 
        };
    } catch (error) {
        console.error('Erro ao obter arquivos:', error);
        return { recentFiles: [], otherFiles: [] };
    }
}

function formatDate(date) {
    if (!date || isNaN(new Date(date))) {
        return 'Data inválida';
    }
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(date).toLocaleDateString('pt-BR', options);
}

// Adicione esta função antes da rota '/'
function getFileIcon(file) {
    if (file.icon) {
        return `<img src="${file.icon}" alt="Ícone" style="width: 32px; height: 32px; margin-bottom: 10px;">`;
    }
    
    const extension = path.extname(file.name).toLowerCase();
    switch (extension) {
        case '.exe':
            return '<i class="fas fa-cog fa-2x mb-2"></i>';
        case '.ear':
            return '<i class="fas fa-archive fa-2x mb-2"></i>';
        case '.bat':
            return '<i class="fas fa-terminal fa-2x mb-2"></i>';
        case '.pdf':
            return '<i class="fas fa-file-pdf fa-2x mb-2"></i>';
        default:
            return '<i class="fas fa-file fa-2x mb-2"></i>';
    }
}

// Carrega a configuração padrão
function loadDefaultConfig() {
    try {
        const configFile = fs.readFileSync(configFilePath, 'utf-8');
        return JSON.parse(configFile);
    } catch (err) {
        console.error('Erro ao carregar as configurações padrão:', err);
        return null;
    }
}

app.get('/', async (req, res) => {
    try {
        const userConfig = req.session.userConfig || loadDefaultConfig();
        const { recentFiles, otherFiles } = await getFiles(userConfig);

        res.render('index', {
            recentFiles,
            otherFiles,
            config: userConfig,
            formatDate,
            getFileIcon,
            isDevelopment,
        });
    } catch (error) {
        console.error('Erro ao carregar dados:', error);
        res.status(500).send('Erro interno do servidor');
    }
});

// Rota para obter a lista de arquivos
app.get('/files', async (req, res) => {
    try {
        const userConfig = req.session.userConfig || loadDefaultConfig();
        const { recentFiles, otherFiles } = await getFiles(userConfig);
        const limit = parseInt(req.query.limit, 10) || Infinity;

        logSystem('Arquivos carregados com sucesso', 'info', {
            recentFilesCount: recentFiles.length,
            otherFilesCount: otherFiles.length,
            limit
        });

        res.json({
            recentFiles: recentFiles.slice(0, limit),
            otherFiles: otherFiles.slice(0, limit),
            debug: isDevelopment ? {
                nextCheck: new Date(Date.now() + (userConfig.notificationInterval || 30) * 60 * 1000),
                currentConfig: userConfig
            } : null
        });
    } catch (error) {
        logSystem('Erro ao carregar arquivos', 'error', error);
        res.status(500).json({ error: 'Erro ao carregar arquivos' });
    }
});

// Rota para salvar as configurações
app.post('/config', (req, res) => {
    try {
        const newConfig = req.body;
        req.session.userConfig = newConfig; // Salva na sessão do usuário
        res.status(200).send('Configurações salvas com sucesso.');
    } catch (error) {
        console.error('Erro ao salvar configurações:', error);
        res.status(500).send('Erro ao salvar configurações.');
    }
});

// Rota para download de arquivos
app.get('/download/:fileName', (req, res) => {
    const fileName = decodeURIComponent(req.params.fileName);
    console.log('Iniciando download do arquivo:', fileName);


    const userConfig = req.session.userConfig || loadConfig();
    const searchPaths = userConfig.searchPaths; 

    let filePath;
    let fileFound = false;

    // Procura o arquivo em todos os diretórios configurados
    for (const directory of searchPaths) {
        try {
            const potentialPath = path.join(directory, fileName);
            if (fs.existsSync(potentialPath)) {
                filePath = potentialPath;
                fileFound = true;
                break;
            }
        } catch (error) {
            console.error(`Erro ao verificar diretório ${directory}:`, error);
        }
    }

    if (!fileFound) {
        console.error('Arquivo não encontrado em nenhum dos diretórios:', fileName);
        return res.status(404).json({ error: 'Arquivo não encontrado' });
    }

    try {
        // Verifica se o arquivo existe e obtém suas informações
        const stats = fs.statSync(filePath);
        
        if (!stats.isFile()) {
            console.error('O caminho não corresponde a um arquivo:', filePath);
            return res.status(404).json({ error: 'Arquivo não encontrado' });
        }

        // Configura os cabeçalhos de resposta
        res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);
        res.setHeader('Content-Length', stats.size);
        res.setHeader('Content-Type', 'application/octet-stream');

        // Cria um stream de leitura do arquivo
        const fileStream = fs.createReadStream(filePath);

        // Manipula eventos do stream
        fileStream.on('error', (error) => {
            console.error('Erro ao ler o arquivo:', error);
            if (!res.headersSent) {
                res.status(500).json({ error: 'Erro ao ler o arquivo' });
            }
        });

        // Pipe o stream para a resposta
        fileStream.pipe(res);

        console.log('Download iniciado:', fileName);

    } catch (error) {
        console.error('Erro ao processar o download:', error);
        if (!res.headersSent) {
            res.status(500).json({ error: 'Erro ao processar o download' });
        }
    }
});

// Função para limpar logs antigos (manter apenas últimos 30 dias)
function cleanOldLogs() {
    if (isDevelopment) return;

    try {
        const files = fs.readdirSync(logsDir);
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        files.forEach(file => {
            const filePath = path.join(logsDir, file);
            const fileDate = new Date(file.split('.')[0]); // YYYY-MM-DD.log

            if (fileDate < thirtyDaysAgo) {
                fs.unlinkSync(filePath);
                console.log(`Log antigo removido: ${file}`);
            }
        });
    } catch (error) {
        console.error('Erro ao limpar logs antigos:', error);
    }
}

// Iniciar o servidor
app.listen(port, '0.0.0.0', () => {
    console.log(`Servidor rodando na porta ${port}`);
  });

if (!isDevelopment) {
    // Limpar logs antigos na inicialização
    cleanOldLogs();

    // Agendar limpeza diária de logs
    setInterval(cleanOldLogs, 24 * 60 * 60 * 1000);
}
