// Helper function for safe DOM element access
function safeElement(element, operation) {
    if (element && typeof element === 'object') {
        try {
            return operation(element);
        } catch (error) {
            console.warn('DOM operation failed:', error);
            return null;
        }
    }
    return null;
}

// DOM Elements - declare as global variables
let setupSection;
let gameSection;
let notesSection;
let scienceFact;
let currentPhase;
let timerDisplay;
let timerElement;
let survivalCounter;
let survivalDaysElement;
let sporeCountElement;
let fungusControls;
let hostControls;
let infectionControls;
let movementControls;
let loadingOverlay;
let resultScreen;
let resultTitle;
let resultMessage;
let resultStats;
let resultScienceFacts;
let hostIndicator;
let switchSideBtn;
let nestIndicator;
let energyLevelElement;
let currentLayerElement;
let realTimeCounter;
let realTimeDisplay;
let stepCountElement;
let infectionStageElement; // New element for infection stage display
let stageNumberElement; // New element for stage number
let aiCommentaryBtn;
let aiCommentaryPanel;
let aiCommentaryMeta;
let aiCommentaryContent;
let loadingText;
let healthDaysElement;
let ragQuestionInput;
let ragAskBtn;
let ragAnswerPanel;
let ragAnswerMeta;
let ragAnswerContent;
let infectionSpeedBtn;
let autoDemoSpeedBtn;
const stageGuideRagCache = new Map();
let stageGuideHydrationToken = 0;

const autoDemo = {
    active: false,
    token: 0,
    timers: [],
    savedSimulationSpeed: 30000,
    hostHistory: [],
    lastHostAction: null,
    noProgressCount: 0,
    lastDistanceToNest: null,
    lastSporeValidationSummary: '',
    infectedHostHistory: [],
    speedMultiplier: 1
};

// Game state variables
let gameState = {
    currentPhase: 'setup',
    playerSide: 'fungus',
    hostType: 'camponotus',
    environment: 'rainforest',
    fungusType: 'unilateralis',
    spores: [],
    hostPosition: { x: 0, y: 0, layer: 0 }, // Will be set randomly
    nestPosition: { x: 0, y: 0, layer: 0 }, // Will be set randomly
    stepsTaken: 0,
    maxSteps: 15,
    // 兼容旧逻辑保留字段（感染新规则不再使用它们作为唯一时间来源）
    survivalDays: 15,
    maxSurvivalDays: 15,
    timer: null,
    timeRemaining: 60,
    simulationTimer: null,
    simulationSpeed: 30000,
    isPaused: false,
    gameDay: 0,
    nutrition: 'high',
    energy: 0,
    foodItems: [],
    isInfectionMode: false,
    sporesVisible: true,
    infectionStep: 0,
    currentInfectionStage: 0,
    stageStartTime: 0,
    isHostControllable: true, // Track if host can be controlled

    // 感染阶段新规则：生存 15 天获胜 + 生命值衰减
    infectionGoalDays: 15,
    infectionDaysSurvived: 0,
    infectionHealthDays: 0,
    infectionPenaltyCyclesApplied: 0,
    infectionLastTickTs: 0
};

// Initialize the game
document.addEventListener('DOMContentLoaded', () => {
    // Initialize DOM elements
    setupSection = document.getElementById('setup-section');
    gameSection = document.getElementById('game-section');
    notesSection = document.getElementById('rag-qa-section');
    scienceFact = document.getElementById('science-fact');
    currentPhase = document.getElementById('current-phase');
    timerDisplay = document.getElementById('timer-display');
    timerElement = document.getElementById('timer');
    survivalCounter = document.getElementById('survival-counter');
    survivalDaysElement = document.getElementById('survival-days');
    sporeCountElement = document.getElementById('spore-count');
    fungusControls = document.getElementById('fungus-controls');
    hostControls = document.getElementById('host-controls');
    infectionControls = document.getElementById('infection-controls');
    movementControls = document.getElementById('movement-controls');
    loadingOverlay = document.getElementById('loading-overlay');
    resultScreen = document.getElementById('result-screen');
    resultTitle = document.getElementById('result-title');
    resultMessage = document.getElementById('result-message');
    resultStats = document.getElementById('result-stats');
    resultScienceFacts = document.getElementById('result-science-facts');
    hostIndicator = document.getElementById('host-indicator');
    switchSideBtn = document.getElementById('switch-side-btn');
    nestIndicator = document.getElementById('nest-indicator');
    energyLevelElement = document.getElementById('energy-level');
    currentLayerElement = document.getElementById('current-layer');
    realTimeCounter = document.getElementById('real-time-counter');
    realTimeDisplay = document.getElementById('real-time-display');
    stepCountElement = document.getElementById('step-count');
    infectionStageElement = document.getElementById('infection-stage');
    stageNumberElement = document.getElementById('stage-number');
    aiCommentaryBtn = document.getElementById('ai-commentary-btn');
    aiCommentaryPanel = document.getElementById('ai-commentary-panel');
    aiCommentaryMeta = document.getElementById('ai-commentary-meta');
    aiCommentaryContent = document.getElementById('ai-commentary-content');
    loadingText = document.getElementById('loading-text');
    healthDaysElement = document.getElementById('health-days');
    ragQuestionInput = document.getElementById('rag-question-input');
    ragAskBtn = document.getElementById('rag-ask-btn');
    ragAnswerPanel = document.getElementById('rag-answer-panel');
    ragAnswerMeta = document.getElementById('rag-answer-meta');
    ragAnswerContent = document.getElementById('rag-answer-content');
    infectionSpeedBtn = document.getElementById('infection-speed-btn');
    autoDemoSpeedBtn = document.getElementById('auto-demo-speed-btn');
    updateSpeedControlVisibility();
    
    // Initialize map first
    initializeMap();
    
    // Update environment options
    updateEnvironmentOptions('camponotus');
    
    // Debug: Ensure grid elements exist
    const grids = document.querySelectorAll('.grid');
    if (grids.length === 0) {
        console.error('No grid elements found!');
    } else {
        console.log('Grid elements initialized:', grids.length);
    }
    
    // Don't call verifyMinimumDistance here - it will be called when positions are actually set
    initSiteNavigation();
});

const NAV_SECTION_IDS = ['home-section', 'setup-section', 'rag-qa-section', 'game-section'];

function initSiteNavigation() {
    const navToggle = document.getElementById('nav-toggle');
    const navMobilePanel = document.getElementById('nav-mobile-panel');
    const navScrollTop = document.getElementById('nav-scroll-top');
    const navTriggers = document.querySelectorAll('[data-nav-target]');

    navTriggers.forEach((trigger) => {
        trigger.addEventListener('click', (event) => {
            const targetId = trigger.getAttribute('data-nav-target');
            if (!targetId) return;

            event.preventDefault();
            navigateToSection(targetId);
        });
    });

    if (navToggle && navMobilePanel) {
        navToggle.addEventListener('click', () => {
            const isOpen = navMobilePanel.classList.toggle('is-open');
            navMobilePanel.hidden = !isOpen;
            navToggle.setAttribute('aria-expanded', String(isOpen));
            navToggle.setAttribute('aria-label', isOpen ? '关闭菜单' : '打开菜单');
        });
    }

    if (navScrollTop) {
        navScrollTop.addEventListener('click', () => {
            navigateToSection('home-section');
        });
    }

    window.addEventListener('scroll', updateActiveNavLink, { passive: true });
    window.addEventListener('resize', updateActiveNavLink);
    updateActiveNavLink();
}

function navigateToSection(sectionId) {
    const target = document.getElementById(sectionId);
    if (!target) return;

    if (sectionId === 'game-section' && gameSection && gameSection.classList.contains('hidden')) {
        navigateToSection('setup-section');
        return;
    }

    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setActiveNavLink(sectionId);
    closeMobileNav();
}

function closeMobileNav() {
    const navToggle = document.getElementById('nav-toggle');
    const navMobilePanel = document.getElementById('nav-mobile-panel');
    if (!navToggle || !navMobilePanel) return;

    navMobilePanel.classList.remove('is-open');
    navMobilePanel.hidden = true;
    navToggle.setAttribute('aria-expanded', 'false');
    navToggle.setAttribute('aria-label', '打开菜单');
}

function setActiveNavLink(sectionId) {
    document.querySelectorAll('[data-nav-target]').forEach((link) => {
        const isActive = link.getAttribute('data-nav-target') === sectionId;
        link.classList.toggle('active', isActive);
    });
}

function updateActiveNavLink() {
    const navOffset = 120;
    let currentSection = NAV_SECTION_IDS[0];

    NAV_SECTION_IDS.forEach((sectionId) => {
        const section = document.getElementById(sectionId);
        if (!section) return;
        if (section.classList.contains('hidden')) return;

        const top = section.getBoundingClientRect().top;
        if (top - navOffset <= 0) {
            currentSection = sectionId;
        }
    });

    if (gameSection && gameSection.classList.contains('hidden') && currentSection === 'game-section') {
        currentSection = 'setup-section';
    }

    setActiveNavLink(currentSection);
}


// Keyboard movement controls for host phase
function isKeyboardControlEnabled() {
    if (!gameSection || gameSection.classList.contains('hidden')) return false;
    if (gameState.currentPhase !== 'host') return false;
    if (!gameState.isHostControllable) return false;
    if (resultScreen && !resultScreen.classList.contains('hidden')) return false;
    return true;
}

document.addEventListener('keydown', (event) => {
    // Avoid interfering with text input or native shortcuts
    const target = event.target;
    const tag = (target && target.tagName) ? target.tagName.toLowerCase() : '';
    if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
    if (event.metaKey || event.ctrlKey || event.altKey) return;
    if (!isKeyboardControlEnabled()) return;

    const key = (event.key || '').toLowerCase();
    if (!['w', 'a', 's', 'd'].includes(key)) return;

    // Avoid a single long press causing too many steps too quickly
    if (event.repeat) return;

    event.preventDefault();

    // Layer switch: Shift + W/S
    if (event.shiftKey && key === 'w') {
        changeLayer(1);
        return;
    }
    if (event.shiftKey && key === 's') {
        changeLayer(-1);
        return;
    }

    // Plane movement: WASD
    if (key === 'w') moveHost('up');
    else if (key === 's') moveHost('down');
    else if (key === 'a') moveHost('left');
    else if (key === 'd') moveHost('right');
});

// Update environment options based on host type
function updateEnvironmentOptions(hostType) {
    const alpineOption = document.getElementById('alpine-option');
    const envSelect = document.getElementById('environment-type');
    
    if (hostType === 'ghost_moth') {
        // Show alpine meadow option for ghost moth
        if (alpineOption) {
            alpineOption.style.display = 'block';
        }
        // Set default to alpine meadow for ghost moth
        if (envSelect) {
            envSelect.value = 'alpine_meadow';
        }
    } else {
        // Hide alpine meadow for other hosts
        if (alpineOption) {
            alpineOption.style.display = 'none';
        }
        // Set default to rainforest for other hosts
        if (envSelect) {
            envSelect.value = 'rainforest';
        }
    }
}

// Handle host type change
function onHostChange(hostType) {
    updateEnvironmentOptions(hostType);
}

// Calculate distance between two positions
function calculateDistance(pos1, pos2) {
    return Math.sqrt(
        Math.pow(pos1.x - pos2.x, 2) + 
        Math.pow(pos1.y - pos2.y, 2)
    );
}

// Verify minimum distance requirement
function verifyMinimumDistance() {
    // Only verify if positions have been properly initialized (not at origin)
    if (gameState.hostPosition.x === 0 && gameState.hostPosition.y === 0) {
        return; // Skip verification for uninitialized positions
    }
    
    const distance = calculateDistance(gameState.hostPosition, gameState.nestPosition);
    // 规则：游戏开始时宿主与巢穴距离 >10 步 且 <=15 步
    const minStepsExclusive = 10;
    const maxStepsInclusive = 15;
    const stepSize = 5;
    const minDistanceExclusive = minStepsExclusive * stepSize;
    const maxDistanceInclusive = maxStepsInclusive * stepSize;
    
    if (!(distance > minDistanceExclusive && distance <= maxDistanceInclusive)) {
        console.warn(
            `Distance (${distance.toFixed(1)} units) is out of range ` +
            `(${minDistanceExclusive.toFixed(1)}, ${maxDistanceInclusive.toFixed(1)}]`
        );
        const fixedNest = generateNestPositionInStepRange(gameState.hostPosition, minStepsExclusive, maxStepsInclusive, stepSize);
        if (fixedNest) {
            gameState.nestPosition = fixedNest;
            console.log('Adjusted nest position to match step-range rule');
        }
    }
    
    const updatedDistance = calculateDistance(gameState.hostPosition, gameState.nestPosition);
    const actualSteps = updatedDistance / stepSize;
    console.log(`Host-Nest Distance: ${updatedDistance.toFixed(1)} units (${actualSteps.toFixed(1)} steps)`);
}

// Host type change handler
function onHostChange(hostType) {
    gameState.hostType = hostType;
    updateEnvironmentOptions(hostType);
    
    const fungusSelect = document.getElementById('fungus-type');
    const envSelect = document.getElementById('environment-type');
    
    if (hostType === 'ghost_moth') {
        // Lock to alpine environment and O. sinensis
        envSelect.innerHTML = '';
        const alpineOpt = document.createElement('option');
        alpineOpt.value = 'alpine';
        alpineOpt.textContent = '🏔️ 高山草甸（自动锁定）';
        alpineOpt.selected = true;
        envSelect.appendChild(alpineOpt);
        
        fungusSelect.value = 'sinensis';
        fungusSelect.disabled = true;
        
        showScienceFact('🔬 科学事实：冬虫夏草（O. sinensis）只感染鬼天蛾科幼虫，从不感染蚂蚁！');
        document.body.classList.add('alpine-theme');
    } else {
        // Restore normal environments
        envSelect.innerHTML = '';
        addEnvironmentOption('rainforest', '🌧️ 热带雨林');
        addEnvironmentOption('jungle', '🌿 丛林');
        addEnvironmentOption('dry_forest', '🌵 热带季雨林');
        
        fungusSelect.disabled = false;
        document.body.classList.remove('alpine-theme');
        hideScienceFact();
    }
}

function addEnvironmentOption(value, text) {
    const envSelect = document.getElementById('environment-type');
    const option = document.createElement('option');
    option.value = value;
    option.textContent = text;
    envSelect.appendChild(option);
}

function updateEnvironmentOptions(hostType) {
    // This function is called when host type changes
    // The actual logic is handled in onHostChange
}

function showScienceFact(message) {
    scienceFact.textContent = message;
    scienceFact.classList.remove('hidden');
}

function hideScienceFact() {
    scienceFact.classList.add('hidden');
}

// Side change handler
function onSideChange(side) {
    gameState.playerSide = side;
    
    // Update UI based on selected side
    const hostTypeSelect = document.getElementById('host-type');
    const envSelect = document.getElementById('environment-type');
    const fungusSelect = document.getElementById('fungus-type');
    
    if (side === 'host') {
        // When playing as host, we might want to pre-configure some defaults
        hostTypeSelect.disabled = false;
        envSelect.disabled = false;
        fungusSelect.disabled = false;
    } else {
        // When playing as fungus, all options are available
        hostTypeSelect.disabled = false;
        envSelect.disabled = false;
        fungusSelect.disabled = false;
    }
}

// Start the game
function startGame(options = {}) {
    if (autoDemo.active && !options.fromAutoDemo) return;
    const envSelect = document.getElementById('environment-type');
    const fungusSelect = document.getElementById('fungus-type');
    const sideSelect = document.getElementById('player-side');
    
    gameState.environment = envSelect.value;
    gameState.fungusType = fungusSelect.value;
    gameState.playerSide = sideSelect.value;
    
    // Initialize random positions for host and nest
    initializeRandomPositions();
    
    // Hide setup and notes sections
    if (setupSection) setupSection.classList.add('hidden');
    if (notesSection) notesSection.classList.add('hidden');
    
    if (gameSection) {
        gameSection.classList.remove('hidden');
        navigateToSection('game-section');
    }
    
    // Start appropriate phase based on selected side
    if (gameState.playerSide === 'fungus') {
        startFungusPhase();
    } else {
        // If playing as host, we need to have spores already deployed
        randomSporeDeploymentForHost();
        // Hide spores from host view
        toggleSporeVisibility(false);
        // Show host and nest for host player
        showHostIndicator();
        showNestIndicator();
        startHostPhase();
    }
}

// Initialize the 3-layer map
function initializeMap() {
    for (let layer = 0; layer <= 2; layer++) {
        const grid = document.querySelector(`#layer-${layer} .grid`);
        if (grid) {
            grid.addEventListener('click', (e) => handleMapClick(e, layer));
        } else {
            console.error(`Grid not found for layer ${layer}`);
        }
    }
}

// Handle map clicks for spore placement
function handleMapClick(event, layer) {
    if (gameState.currentPhase !== 'fungus') return;
    if (gameState.spores.length >= 10) {
        alert('孢子数量已达上限（10个）');
        return;
    }
    
    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;
    
    const spore = { layer, x, y };
    gameState.spores.push(spore);
    renderSpore(spore);
    updateSporeCount();
}

// Render a single spore on the map
function renderSpore(spore) {
    const grid = document.querySelector(`#layer-${spore.layer} .grid`);
    const sporeElement = document.createElement('div');
    sporeElement.className = `spore spore-layer-${spore.layer}`;
    if (gameState.hostType === 'ghost_moth') {
        sporeElement.classList.add('spore-ghost-moth');
    }
    sporeElement.style.left = `${spore.x}%`;
    sporeElement.style.top = `${spore.y}%`;
    grid.appendChild(sporeElement);
}

// Update spore count display
function updateSporeCount() {
    sporeCountElement.textContent = gameState.spores.length;
}

// Clear all spores from the map
function clearSpores() {
    for (let layer = 0; layer <= 2; layer++) {
        const grid = document.querySelector(`#layer-${layer} .grid`);
        grid.innerHTML = '';
    }
    gameState.spores = [];
    updateSporeCount();
}

// AI Generate Spores using GLM-5 API
async function generateAISpores() {
    showLoading(true);
    
    try {
        const context = buildFungusAIStrategyContext();
        
        const response = await callGLMAPI(context);
        const deployments = normalizeSporeDeployments(parseDeployments(response), context);
        
        if (deployments && deployments.length > 0) {
            clearSpores();
            deployments.forEach(spore => {
                gameState.spores.push(spore);
                renderSpore(spore);
            });
            updateSporeCount();
        }
    } catch (error) {
        console.error('AI生成孢子失败:', error);
        if (autoDemo.active) {
            throw error;
        }
        let errorMessage = 'AI生成失败，请重试或手动部署孢子';
        if (error.message.includes('CORS错误')) {
            errorMessage = error.message;
        }
        alert(errorMessage);
    } finally {
        showLoading(false);
    }
}

function buildFungusAIStrategyContext() {
    const nestPosition = gameState.nestPosition || { x: 70, y: 70, layer: 0 };
    return {
        hostType: getHostTypeName(gameState.hostType),
        environment: getEnvironmentName(gameState.environment),
        fungusType: getFungusTypeName(gameState.fungusType),
        hostTypeKey: gameState.hostType,
        mapSize: { width: 100, height: 100 },
        layerNames: ['地面层', '植被层', '树冠层'],
        maxSteps: gameState.maxSteps,
        stepSize: 5,
        nestPosition: {
            x: round1(nestPosition.x ?? 70),
            y: round1(nestPosition.y ?? 70),
            layer: Number(nestPosition.layer ?? 0)
        },
        fairnessRule: '真菌方不能预判或提前知道宿主出生点；不要使用宿主出生点、精确路线或隐藏宿主信息布阵。'
    };
}

// Call GLM-5 API
async function callGLMAPI(context) {
    const prompt = `
你是一个虫草菌（Ophiocordyceps）部署策略专家。你的目标是在不知道宿主出生点的公平规则下，做区域覆盖式孢子布阵。

【地图与移动规则（关键）】
- 地图：100x100，3层（0=地面，1=植被，2=树冠）
- 宿主移动：每步沿上下左右移动（步长≈5），可切换层级
- 你只知道巢穴位置、地图规则、宿主类型、环境和真菌类型
- 公平性限制：不能预判、猜测或提前知道宿主出生点；不能输出依赖精确宿主出生点的布阵说明

【硬性约束（必须严格满足）】
1) 只输出 JSON，禁止输出任何解释/多余文字/Markdown/代码块标记。
2) 必须生成且仅生成 10 个孢子：deployments 数组长度必须为 10。
3) “未知出生点覆盖”：围绕巢穴外围、地图四个方向入口、不同层级做覆盖式布阵，不要围绕某个已知起点布雷。
4) “巢穴周边拦截”：至少 5 个孢子应分布在巢穴周边约 12~35 坐标单位的环形区域内，覆盖上下左右和斜向接近方向。
5) “层级分散”：除特殊宿主外，不能全部堆在一层，至少覆盖 2 个层级；优先覆盖巢穴层，并用其他层做换层干扰。
6) 坐标范围：x、y 均为 0~100（可带 1 位小数），layer 只能是 0/1/2。
7) 反聚集：同一层内任意两个孢子之间的欧式距离尽量 ≥ 16（至少 ≥ 12），避免一团集中导致绕开很容易。
8) 避免重复：不同层间不能有重复的坐标。
9) 特殊宿主限制：如果宿主类型是“鬼天蛾”（ghost_moth），所有孢子必须部署在地面层（layer 0）。

【游戏上下文（输入）】
- 宿主类型: ${context.hostType}
- 环境: ${context.environment}
- 真菌类型: ${context.fungusType}
- 巢穴位置: ${JSON.stringify(context.nestPosition)}
- 地图大小: ${JSON.stringify(context.mapSize)}
- 层级信息: ${JSON.stringify(context.layerNames)}
- 最大步数: ${context.maxSteps}
- 公平性规则: ${context.fairnessRule}

【输出格式（严格）】
{"deployments":[{"layer":0,"x":50.0,"y":50.0}, ... 共10个 ]}
`;
    
    try {
        const endpoint = 'http://127.0.0.1:8002/api/generate';
        const timeoutMs = 90000;

        async function postJson(url, body, timeout) {
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), timeout);
            try {
                const resp = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body),
                    signal: controller.signal
                });
                return resp;
            } finally {
                clearTimeout(timer);
            }
        }

        // Flask 转发服务常见入参格式不统一：有的直接透传上游模型接口，
        // 有的只收 prompt（model 写死在服务端），还有的用 OpenAI-like messages。
        // 这里按优先级逐个尝试，提高兼容性。
        const candidates = [
            // 1) GLM-5 调用 generate（常见）
            {
                model: 'glm-5',
                prompt,
                stream: false,
                think: false,
                options: { temperature: 0.7 }
            },
            // 2) Flask 简化版：只传 prompt（model 可能由服务端固定）
            { prompt, stream: false },
            // 3) OpenAI ChatCompletions 风格（一些转发器会这么做）
            {
                model: 'glm-5',
                messages: [{ role: 'user', content: prompt }],
                stream: false,
                temperature: 0.7
            }
        ];

        let lastHttpError = null;
        for (const body of candidates) {
            const response = await postJson(endpoint, body, timeoutMs);

            // 400/422 往往是“字段不对”，继续尝试下一个候选格式
            if (!response.ok) {
                const status = response.status;
                const text = await response.text().catch(() => '');
                const err = new Error(`HTTP ${status}: ${text || response.statusText}`);
                lastHttpError = err;
                if (status === 400 || status === 401 || status === 404 || status === 405 || status === 415 || status === 422) {
                    continue;
                }
                throw err;
            }

            const contentType = (response.headers.get('content-type') || '').toLowerCase();
            if (contentType.includes('application/json')) {
                return await response.json();
            }

            // 兼容服务端返回纯文本（直接就是 LLM 输出）
            const text = await response.text();
            return { response: text };
        }

        throw lastHttpError || new Error('请求失败：Flask 转发服务未接受任何已知请求格式');
    } catch (error) {
        // fetch 失败 / 超时 / 断网 等在浏览器里经常都表现为 TypeError / AbortError
        if (error && (error.name === 'AbortError')) {
            throw new Error(
                '请求超时：无法在指定时间内连接到 Flask 转发服务。\n' +
                '请确保：\n' +
                '1. Flask 服务正在运行（并监听 0.0.0.0:8002）\n' +
                '2. 访问地址可达（同一局域网/防火墙放行）：http://127.0.0.1:8002\n' +
                '3. 路由存在：/api/generate\n'
            );
        }
        if (error && (error.name === 'TypeError' || `${error}`.includes('TypeError'))) {
            throw new Error(
                '网络错误：浏览器无法连接到 Flask 转发服务。\n' +
                '请检查：\n' +
                '1. IP/端口是否正确：http://127.0.0.1:8002\n' +
                '2. 服务端是否允许跨域（CORS）\n' +
                '3. 服务端是否可从当前机器访问（防火墙/路由/VPN）\n'
            );
        }
        throw error;
    }
}

// Parse deployments from API response
function parseDeployments(response) {
    // 兼容多种返回格式：
    // - GLM-5 调用：{ response: "..." }
    // - 自定义：{ deployments: [...] } 或 { deployments: {deployments:[...]} }
    // - OpenAI-like：{ choices:[{message:{content:"..."}}] }
    let deployments =
        response?.deployments ??
        response?.response ??
        response?.choices?.[0]?.message?.content ??
        response?.choices?.[0]?.text;
    
    // If it's a string, try to extract JSON
    if (typeof deployments === 'string') {
        const jsonMatch = deployments.match(/(\[.*\]|\{.*\})/s);
        if (jsonMatch) {
            try {
                const parsed = JSON.parse(jsonMatch[0]);
                if (Array.isArray(parsed)) {
                    return parsed;
                } else if (parsed && parsed.deployments) {
                    return parsed.deployments;
                }
            } catch (e) {
                console.error('JSON解析失败:', e);
            }
        }
    }
    
    // If it's already an array, return it
    if (Array.isArray(deployments)) {
        return deployments;
    }
    
    // If it's an object with deployments property
    if (deployments && deployments.deployments) {
        return deployments.deployments;
    }
    
    return [];
}

function clampNumber(value, min, max, fallback = 0) {
    const number = Number(value);
    if (!Number.isFinite(number)) return fallback;
    return Math.max(min, Math.min(max, number));
}

function normalizeLayer(value, fallback = 0) {
    const layer = Math.round(Number(value));
    if (layer === 0 || layer === 1 || layer === 2) return layer;
    return fallback;
}

function getSporeStrategyContext(context = {}) {
    const nestPosition = context.nestPosition || gameState.nestPosition || { x: 70, y: 70, layer: 0 };
    const hostTypeKey = context.hostTypeKey || gameState.hostType;
    return {
        nestPosition: {
            x: clampNumber(nestPosition.x, 0, 100, 70),
            y: clampNumber(nestPosition.y, 0, 100, 70),
            layer: normalizeLayer(nestPosition.layer, 0)
        },
        hostType: hostTypeKey,
        isGhostMoth: hostTypeKey === 'ghost_moth'
    };
}

function getPrimarySporeLayers(ctx) {
    if (ctx.isGhostMoth) return [0];
    return [ctx.nestPosition.layer];
}

function getOtherSporeLayers(primaryLayers) {
    return [0, 1, 2].filter((layer) => !primaryLayers.includes(layer));
}

function sporeDistance(a, b) {
    const dx = (a.x || 0) - (b.x || 0);
    const dy = (a.y || 0) - (b.y || 0);
    return Math.sqrt(dx * dx + dy * dy);
}

function distanceToSegment(point, a, b) {
    const px = point.x;
    const py = point.y;
    const ax = a.x;
    const ay = a.y;
    const bx = b.x;
    const by = b.y;
    const dx = bx - ax;
    const dy = by - ay;
    const lengthSq = dx * dx + dy * dy;
    if (lengthSq === 0) return Math.sqrt((px - ax) ** 2 + (py - ay) ** 2);
    const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lengthSq));
    const x = ax + t * dx;
    const y = ay + t * dy;
    return Math.sqrt((px - x) ** 2 + (py - y) ** 2);
}

function distanceToNestDefenseZone(point, ctx) {
    return sporeDistance(point, ctx.nestPosition);
}

function isNearNestDefenseZone(spore, ctx, minRadius = 10, maxRadius = 38) {
    const distance = distanceToNestDefenseZone(spore, ctx);
    return distance >= minRadius && distance <= maxRadius;
}

function jitterSpore(spore, amount = 7) {
    return {
        layer: spore.layer,
        x: clampNumber(spore.x + (Math.random() * 2 - 1) * amount, 2, 98, spore.x),
        y: clampNumber(spore.y + (Math.random() * 2 - 1) * amount, 2, 98, spore.y)
    };
}

function isTooCloseToSameLayer(spore, spores, minDistance = 12) {
    return spores.some((existing) => existing.layer === spore.layer && sporeDistance(existing, spore) < minDistance);
}

function repairSporeSpacing(spore, spores, ctx) {
    let repaired = spore;
    for (let attempt = 0; attempt < 10; attempt++) {
        if (!isTooCloseToSameLayer(repaired, spores)) return repaired;
        repaired = jitterSpore(repaired, 6 + attempt * 1.5);
        if (ctx.isGhostMoth) repaired.layer = 0;
    }
    return repaired;
}

function buildCoverageSpore(layer, ctx, angleDeg, radius = 24) {
    const radians = angleDeg * Math.PI / 180;
    const nest = ctx.nestPosition;
    return {
        layer,
        x: clampNumber(nest.x + Math.cos(radians) * radius, 3, 97, 50),
        y: clampNumber(nest.y + Math.sin(radians) * radius, 3, 97, 50)
    };
}

function buildFallbackSporeDeployment(context = {}) {
    const ctx = getSporeStrategyContext(context);
    const primaryLayers = getPrimarySporeLayers(ctx);
    const otherLayers = ctx.isGhostMoth ? [] : getOtherSporeLayers(primaryLayers);
    const targetLayers = ctx.isGhostMoth ? [0] : [...primaryLayers, ...otherLayers];
    const coveragePattern = [
        { angle: 0, radius: 18 },
        { angle: 45, radius: 25 },
        { angle: 90, radius: 18 },
        { angle: 135, radius: 28 },
        { angle: 180, radius: 18 },
        { angle: 225, radius: 25 },
        { angle: 270, radius: 18 },
        { angle: 315, radius: 28 },
        { angle: 20, radius: 36 },
        { angle: 200, radius: 36 }
    ];
    const spores = [];

    coveragePattern.forEach((point, index) => {
        const layer = targetLayers[index % targetLayers.length];
        spores.push(repairSporeSpacing(buildCoverageSpore(layer, ctx, point.angle, point.radius), spores, ctx));
    });

    return spores.slice(0, 10).map((spore) => ({
        layer: spore.layer,
        x: round1(spore.x),
        y: round1(spore.y)
    }));
}

function balanceSporeLayers(spores, ctx) {
    if (ctx.isGhostMoth) {
        return spores.map((spore) => ({ ...spore, layer: 0 }));
    }

    const layers = getLayerCounts(spores);
    const occupiedLayers = Object.values(layers).filter((count) => count > 0).length;
    if (occupiedLayers > 1) return spores;

    const primaryLayers = getPrimarySporeLayers(ctx);
    const otherLayers = getOtherSporeLayers(primaryLayers);
    const targetLayers = [...primaryLayers, ...otherLayers].slice(0, 3);
    return spores.map((spore, index) => (
        index < targetLayers.length
            ? { ...spore, layer: targetLayers[index] }
            : spore
    ));
}

function normalizeSporeDeployments(deployments, context = {}) {
    const ctx = getSporeStrategyContext(context);
    const fallback = buildFallbackSporeDeployment(context);
    const raw = Array.isArray(deployments) ? deployments : [];
    const normalized = [];
    let repairedCount = 0;

    raw.forEach((item, index) => {
        if (!item || typeof item !== 'object') {
            repairedCount += 1;
            return;
        }
        const fallbackSpore = fallback[index % fallback.length];
        const spore = {
            layer: ctx.isGhostMoth ? 0 : normalizeLayer(item.layer, fallbackSpore.layer),
            x: clampNumber(item.x, 0, 100, fallbackSpore.x),
            y: clampNumber(item.y, 0, 100, fallbackSpore.y)
        };
        const repaired = repairSporeSpacing(spore, normalized, ctx);
        if (repaired !== spore || repaired.x !== spore.x || repaired.y !== spore.y) repairedCount += 1;
        normalized.push({
            layer: repaired.layer,
            x: round1(repaired.x),
            y: round1(repaired.y)
        });
    });

    while (normalized.length < 10) {
        const repaired = repairSporeSpacing(fallback[normalized.length % fallback.length], normalized, ctx);
        normalized.push({
            layer: repaired.layer,
            x: round1(repaired.x),
            y: round1(repaired.y)
        });
        repairedCount += 1;
    }

    let finalSpores = balanceSporeLayers(normalized.slice(0, 10), ctx);
    const defenseZoneCount = finalSpores.filter((spore) => isNearNestDefenseZone(spore, ctx)).length;
    if (defenseZoneCount < 5) {
        finalSpores = fallback;
        repairedCount += 10;
    }

    autoDemo.lastSporeValidationSummary = repairedCount > 0
        ? `公平布阵校验：未读取宿主出生点，已自动修复 ${repairedCount} 个布阵点，保证 10 个孢子、多方向覆盖和层级分散。`
        : '公平布阵校验通过：未读取宿主出生点，10 个孢子已按巢穴周边、多方向覆盖和层级分散布置。';

    return finalSpores;
}

// Random spore deployment
function randomSporeDeployment() {
    clearSpores();
    const spores = buildFallbackSporeDeployment(buildFungusAIStrategyContext());

    spores.forEach((spore) => {
        gameState.spores.push(spore);
        renderSpore(spore);
    });
    updateSporeCount();
}

// Random spore deployment specifically for host play
function randomSporeDeploymentForHost() {
    clearSpores();
    const spores = buildFallbackSporeDeployment(buildFungusAIStrategyContext());

    spores.forEach((spore) => {
        gameState.spores.push(spore);
        renderSpore(spore);
    });
    updateSporeCount();
}

function ensureValidSporeDeployment() {
    if (gameState.spores.length === 10) return true;

    const originalCount = gameState.spores.length;
    const repairedSpores = normalizeSporeDeployments(gameState.spores, buildFungusAIStrategyContext());
    clearSpores();
    repairedSpores.forEach((spore) => {
        gameState.spores.push(spore);
        renderSpore(spore);
    });
    updateSporeCount();

    const message = originalCount === 0
        ? '已使用公平 fallback 自动生成 10 个孢子。'
        : `已将 ${originalCount} 个孢子自动修复/补齐为 10 个孢子。`;
    autoDemo.lastSporeValidationSummary = `${autoDemo.lastSporeValidationSummary || '公平布阵校验完成。'} ${message}`;
    if (!autoDemo.active && scienceFact) {
        scienceFact.textContent = message;
        scienceFact.classList.remove('hidden');
    }

    return gameState.spores.length === 10;
}

// Confirm spore deployment and move to host phase
function confirmSporeDeployment() {
    if (!ensureValidSporeDeployment()) {
        alert('孢子部署校验失败，请重试或使用随机布阵。');
        return;
    }
    
    // Hide spores from host view (only fungus can see spores)
    toggleSporeVisibility(false);
    
    // Show host and nest for host player
    showHostIndicator();
    showNestIndicator();
    
    startHostPhase();
}

// Switch sides during gameplay
function switchSides() {
    if (gameState.currentPhase === 'fungus') {
        // Switch from fungus to host
        if (gameState.spores.length === 0) {
            alert('请先部署孢子再切换到宿主方！');
            return;
        }
        // 切到宿主视角：孢子永远隐藏
        toggleSporeVisibility(false);
        // 感染后不再显示巢穴
        if (gameState.isInfectionMode) {
            removeNestIndicatorFromMap();
        }
        startHostPhase();
    } else if (gameState.currentPhase === 'host') {
        // Switch from host to fungus - show spores to fungus
        toggleSporeVisibility(true);
        // 感染后巢穴永远隐藏（不管什么视角）
        if (gameState.isInfectionMode) {
            removeNestIndicatorFromMap();
        }
        startFungusPhase();
    }
    
    // Update button text based on current side
    updateSwitchSideButtonText();
}

// Update switch side button text
function updateSwitchSideButtonText() {
    if (switchSideBtn) {
        if (gameState.currentPhase === 'fungus') {
            switchSideBtn.textContent = '🔄 切换到宿主方';
        } else if (gameState.currentPhase === 'host') {
            switchSideBtn.textContent = '🔄 切换到真菌方';
        }
    }
}

// Start fungus phase
function startFungusPhase() {
    gameState.currentPhase = 'fungus';
    currentPhase.textContent = '【真菌方回合】部署孢子';
    fungusControls.classList.remove('hidden');
    hostControls.classList.add('hidden');
    infectionControls.classList.add('hidden');
    timerDisplay.classList.remove('hidden');
    survivalCounter.classList.add('hidden');
    
    if (switchSideBtn) {
        switchSideBtn.classList.remove('hidden');
        updateSwitchSideButtonText();
    }
    
    // Show spores to fungus player
    toggleSporeVisibility(true);
    
    // Start 60-second timer with proper bounds checking
    gameState.timeRemaining = 60;
    safeElement(timerElement, (el) => {
        el.textContent = gameState.timeRemaining;
    });
    gameState.timer = setInterval(() => {
        gameState.timeRemaining = Math.max(0, gameState.timeRemaining - 1);
        safeElement(timerElement, (el) => {
            el.textContent = gameState.timeRemaining;
        });
        
        if (gameState.timeRemaining <= 0) {
            clearInterval(gameState.timer);
            if (gameState.spores.length === 0) {
                randomSporeDeployment();
            }
            // Hide spores from host, show host and nest
            toggleSporeVisibility(false);
            showHostIndicator();
            showNestIndicator();
            startHostPhase();
        }
    }, 1000);
}

// Start host phase
function startHostPhase() {
    clearInterval(gameState.timer);
    timerDisplay.classList.add('hidden');
    
    gameState.currentPhase = 'host';
    currentPhase.textContent = '【宿主方回合】15步内抵达巢穴或避免感染';
    fungusControls.classList.add('hidden');
    hostControls.classList.remove('hidden');
    infectionControls.classList.add('hidden');
    
    if (switchSideBtn) {
        switchSideBtn.classList.remove('hidden');
        updateSwitchSideButtonText();
    }
    
    // 宿主视角：孢子永远隐藏
    toggleSporeVisibility(false);

    // 宿主位置可见；巢穴仅在未感染时可见
    showHostIndicator();
    if (!gameState.isInfectionMode) {
        showNestIndicator();
    } else {
        removeNestIndicatorFromMap();
    }
    
    // Update energy display
    safeElement(energyLevelElement, (el) => {
        el.textContent = gameState.energy;
    });
    
    // Update layer display text based on current host layer
    if (currentLayerElement) {
        const layerNames = ['地面层', '植被层', '树冠层'];
        currentLayerElement.textContent = layerNames[gameState.hostPosition.layer] || '地面层';
    }
    
    // Initialize step counter
    gameState.stepsTaken = 0;
    safeElement(document.getElementById('step-count'), (el) => {
        el.textContent = gameState.stepsTaken;
    });
}

// Remove strategy selection functions as they are no longer needed
// The game will automatically enter survival mode when host touches a spore

// Check if there's a spore at the current position
function checkForSporeAtPosition(position) {
    return gameState.spores.some(spore => 
        spore.layer === position.layer &&
        Math.abs(spore.x - position.x) < 5 &&
        Math.abs(spore.y - position.y) < 5
    );
}

// Find nearest spore to a position
function findNearestSpore(position) {
    let nearest = gameState.spores[0];
    let minDistance = Infinity;
    
    gameState.spores.forEach(spore => {
        const distance = Math.sqrt(
            Math.pow(spore.x - position.x, 2) + 
            Math.pow(spore.y - position.y, 2)
        );
        if (distance < minDistance) {
            minDistance = distance;
            nearest = spore;
        }
    });
    
    return nearest;
}

// Setup movement controls
function setupMovementControls() {
    // Movement is already handled by moveHost function
}

// Move host with controllability check
function moveHost(direction) {
    // Check if host is controllable
    if (!gameState.isHostControllable) {
        if (scienceFact) {
            scienceFact.textContent = '⚠️ 第4阶段：宿主暂时无法移动！';
            scienceFact.classList.remove('hidden');
            setTimeout(() => {
                if (scienceFact) {
                    scienceFact.classList.add('hidden');
                }
            }, 2000);
        }
        return;
    }
    
    const stepSize = 5;
    
    switch (direction) {
        case 'up':
            gameState.hostPosition.y = Math.max(0, gameState.hostPosition.y - stepSize);
            break;
        case 'down':
            gameState.hostPosition.y = Math.min(100, gameState.hostPosition.y + stepSize);
            break;
        case 'left':
            gameState.hostPosition.x = Math.max(0, gameState.hostPosition.x - stepSize);
            break;
        case 'right':
            gameState.hostPosition.x = Math.min(100, gameState.hostPosition.x + stepSize);
            break;
    }
    
    // Ensure stepsTaken doesn't go negative
    gameState.stepsTaken = Math.max(0, gameState.stepsTaken + 1);
    if (stepCountElement) {
        stepCountElement.textContent = gameState.stepsTaken;
    }
    updateHostIndicator();
    
    // Check for spore encounter (automatic survival mode)
    if (!gameState.isInfectionMode && checkForSporeAtPosition(gameState.hostPosition)) {
        enterInfectionMode();
        return;
    }
    
    // Check for food encounter
    checkForFoodAtPosition();
    
    // 巢穴只在未感染的回巢阶段可触发；感染后巢穴会被移除且不再作为胜利条件。
    if (!gameState.isInfectionMode) {
        const distanceToNest = calculateDistance(gameState.hostPosition, gameState.nestPosition);
        if (distanceToNest < 8) { // Reduced threshold to 8 units (1.6 steps) for more precise detection
            // Normal avoidance victory - ensure minimum steps for realistic gameplay
            if (gameState.stepsTaken >= 10) {
                showResult('host_victory', '规避胜利！宿主在15步内安全抵达巢穴', {
                    steps: gameState.stepsTaken,
                    strategy: '规避'
                });
            } else {
                // If reached nest in less than 10 steps, force additional movement or convert to different victory
                if (scienceFact) {
                    scienceFact.textContent = '⚠️ 检测到异常：宿主在少于10步内抵达巢穴。请继续移动以完成完整规避路径。';
                    scienceFact.classList.remove('hidden');
                    setTimeout(() => {
                        if (scienceFact) {
                            scienceFact.classList.add('hidden');
                        }
                    }, 3000);
                }
                // Don't trigger victory yet - require minimum 10 steps for avoidance strategy
                return;
            }
            return;
        }
    }
    
    // Check if steps exceeded - enter survival mode instead of defeat
    if (!gameState.isInfectionMode && gameState.stepsTaken >= gameState.maxSteps) {
        // Show warning for automatic survival mode
        if (scienceFact) {
            scienceFact.textContent = '⚠️ 规避失败！宿主未能在15步内抵达巢穴，自动进入感染生存模式。';
            scienceFact.classList.remove('hidden');
            
            // Auto-hide the warning after 5 seconds
            setTimeout(() => {
                if (scienceFact) {
                    scienceFact.classList.add('hidden');
                }
            }, 5000);
        }
        
        // Automatically enter survival mode when step limit is reached
        enterInfectionMode();
        return;
    }
    
    // If already infected, check for additional step-based survival time reduction
    if (gameState.isInfectionMode) {
        checkInfectedStepPenalty();
    }
}

// Update host indicator position
function updateHostIndicator() {
    const grid = document.querySelector(`#layer-${gameState.hostPosition.layer} .grid`);
    if (!grid) {
        console.error('Grid not found for host layer:', gameState.hostPosition.layer);
        return;
    }

    // 使用百分比定位，保证与“实际坐标(0-100)”一致（避免边框/缩放造成的像素偏移）
    hostIndicator.style.left = `${gameState.hostPosition.x}%`;
    hostIndicator.style.top = `${gameState.hostPosition.y}%`;
    
    // Ensure host indicator is positioned within the correct grid
    hostIndicator.style.transform = 'translate(-50%, -50%)';
    hostIndicator.style.position = 'absolute';
    
    // Move host indicator to the correct grid container
    grid.appendChild(hostIndicator);
}

// Update nest indicator position
function updateNestIndicator() {
    const grid = document.querySelector(`#layer-${gameState.nestPosition.layer} .grid`);
    if (!grid) {
        console.error('Grid not found for nest layer:', gameState.nestPosition.layer);
        return;
    }

    // 使用百分比定位，保证与“实际坐标(0-100)”一致（避免边框/缩放造成的像素偏移）
    nestIndicator.style.left = `${gameState.nestPosition.x}%`;
    nestIndicator.style.top = `${gameState.nestPosition.y}%`;
    
    // Ensure nest indicator is positioned within the correct grid
    nestIndicator.style.transform = 'translate(-50%, -50%)';
    nestIndicator.style.position = 'absolute';
    
    // Move nest indicator to the correct grid container
    grid.appendChild(nestIndicator);
}

// Show host indicator
function showHostIndicator() {
    if (hostIndicator) {
        hostIndicator.classList.remove('hidden');
        hostIndicator.textContent = '🪳'; // Host emoji
        updateHostIndicator();
    }
}

// Show nest indicator
function showNestIndicator() {
    if (nestIndicator) {
        // 感染后不再显示巢穴（任意视角）
        if (gameState.isInfectionMode) {
            removeNestIndicatorFromMap();
            return;
        }
        nestIndicator.classList.remove('hidden');
        nestIndicator.textContent = '🏠'; // Nest emoji
        updateNestIndicator();
    }
}

function removeNestIndicatorFromMap() {
    if (!nestIndicator) return;
    nestIndicator.classList.add('hidden');
    if (nestIndicator.parentElement) {
        nestIndicator.parentElement.removeChild(nestIndicator);
    }
}

function toggleSporeVisibility(visible) {
    gameState.sporesVisible = visible;
    const sporeElements = document.querySelectorAll('.spore');
    sporeElements.forEach(spore => {
        if (visible) {
            spore.style.display = 'block';
        } else {
            spore.style.display = 'none';
        }
    });
}

// Enter infection mode when host touches spore or exceeds step limit
function enterInfectionMode() {
    gameState.isInfectionMode = true;
    gameState.infectionStep = gameState.stepsTaken;
    // 新规则：感染后不回巢穴；宿主需在感染状态下生存满 15 天获胜
    gameState.infectionGoalDays = 15;
    gameState.infectionDaysSurvived = 0;
    gameState.infectionPenaltyCyclesApplied = 0;
    gameState.infectionLastTickTs = 0;

    // 生命值（可被食物补充、可被移动惩罚削减）
    gameState.maxSurvivalDays = calculateMaxSurvivalDays();
    gameState.infectionHealthDays = gameState.maxSurvivalDays;
    gameState.gameDay = 0;
    gameState.currentInfectionStage = 1; // Start at stage 1
    gameState.stageStartTime = Date.now();
    gameState.isHostControllable = true;
    
    // Check for immediate death (alpine meadow with non-ghost moth)
    if (gameState.maxSurvivalDays <= 0) {
        showResult('fungus_victory', '感染胜利！宿主在高山草甸环境中立即死亡', {
            reason: '环境不适应',
            strategy: '环境致死'
        });
        return;
    }
    
    // Hide spores completely in infection mode (host shouldn't see them)
    toggleSporeVisibility(false);
    
    // 感染后巢穴从地图上移除，也不再参与触发或胜利判定。
    removeNestIndicatorFromMap();
    
    // Show warning message for infection phase start
    if (scienceFact) {
        scienceFact.textContent = '⚠️ 感染阶段开始！宿主已被真菌感染，不再返回巢穴。目标：在感染状态下生存满15天获得胜利。';
        scienceFact.classList.remove('hidden');
        
        // Auto-hide the warning after 5 seconds
        setTimeout(() => {
            if (scienceFact) {
                scienceFact.classList.add('hidden');
            }
        }, 5000);
    }
    
    // Generate initial food items
    generateFoodItems(3);
    
    // Switch to infection controls with safe DOM operations
    safeElement(currentPhase, (el) => {
        el.textContent = '【感染周期】8阶段生存倒计时';
    });
    
    safeElement(infectionControls, (el) => {
        infectionControls.classList.remove('hidden');
    });
    updateSpeedControlVisibility();
    
    safeElement(survivalCounter, (el) => {
        survivalCounter.classList.remove('hidden');
    });
    
    safeElement(survivalDaysElement, (el) => {
        el.textContent = gameState.infectionDaysSurvived.toFixed(1);
    });

    safeElement(healthDaysElement, (el) => {
        el.textContent = gameState.infectionHealthDays.toFixed(1);
    });
    
    // Show infection stage display
    if (infectionStageElement) {
        infectionStageElement.classList.remove('hidden');
    }
    
    // Show real-time counter
    if (realTimeCounter) {
        realTimeCounter.classList.remove('hidden');
    }
    
    // Update displays initially
    updateInfectionStageDisplay();
    updateRealTimeDisplay(Math.max(0, gameState.infectionGoalDays - gameState.infectionDaysSurvived));
    
    // Start infection loop (days survived + health decay)
    gameState.isPaused = false;
    startInfectionLoop();
}

// Remove duplicate calculateDistance function and keep the original one
// The original calculateDistance is already defined earlier in the file

function generateFoodItems(count) {
    gameState.foodItems = [];
    const foodContainer = document.createElement('div');
    foodContainer.id = 'food-container';
    document.body.appendChild(foodContainer);
    
    for (let i = 0; i < count; i++) {
        const layer = Math.floor(Math.random() * 3);
        const x = Math.random() * 100;
        const y = Math.random() * 100;
        const food = { layer, x, y, id: `food-${Date.now()}-${i}` };
        gameState.foodItems.push(food);
        renderFoodItem(food);
    }
}

// Render a food item on the map
function renderFoodItem(food) {
    const foodElement = document.createElement('div');
    foodElement.className = 'food-item';
    foodElement.id = food.id;
    foodElement.textContent = '🍎'; // Food emoji
    
    // Find the correct grid for this food item's layer
    const grid = document.querySelector(`#layer-${food.layer} .grid`);
    if (!grid) {
        console.error('Grid not found for food layer:', food.layer);
        return;
    }
    
    // Position relative to the grid
    const rect = grid.getBoundingClientRect();
    const left = (rect.width * food.x / 100);
    const top = (rect.height * food.y / 100);
    
    foodElement.style.left = `${left}px`;
    foodElement.style.top = `${top}px`;
    foodElement.style.position = 'absolute';
    foodElement.style.transform = 'translate(-50%, -50%)';
    
    // Append to the correct grid
    grid.appendChild(foodElement);
}

// Check for food at current position
function checkForFoodAtPosition() {
    const remainingFood = [];
    let foodCollected = false;
    
    gameState.foodItems.forEach(food => {
        if (food.layer === gameState.hostPosition.layer &&
            Math.abs(food.x - gameState.hostPosition.x) < 8 &&
            Math.abs(food.y - gameState.hostPosition.y) < 8) {
            // Collect food
            foodCollected = true;
            gameState.energy += 1;
            if (energyLevelElement) {
                energyLevelElement.textContent = gameState.energy;
            }
            // Add 0.5 days to survival time, but ensure it doesn't exceed maximum
            if (gameState.isInfectionMode) {
                const additionalDays = 0.5;
                const newHealth = gameState.infectionHealthDays + additionalDays;
                // Cap at reasonable maximum (e.g., 25 days health)
                gameState.infectionHealthDays = Math.min(25, newHealth);
                if (healthDaysElement) {
                    healthDaysElement.textContent = gameState.infectionHealthDays.toFixed(1);
                }
                // 更新“距离胜利”实时显示（以目标剩余天数为准）
                updateRealTimeDisplay(Math.max(0, gameState.infectionGoalDays - gameState.infectionDaysSurvived));
            }
            // Remove food element
            const foodElement = document.getElementById(food.id);
            if (foodElement) {
                foodElement.remove();
            }
        } else {
            remainingFood.push(food);
        }
    });
    
    gameState.foodItems = remainingFood;
    
    if (foodCollected) {
        // Generate new food item
        const spawnDelay = autoDemo.active ? getDemoDelay(2000) : 2000;
        const demoToken = autoDemo.token;
        const timerId = setTimeout(() => {
            if (autoDemo.active) {
                autoDemo.timers = autoDemo.timers.filter((item) => item !== timerId);
                if (demoToken !== autoDemo.token) return;
            }
            if (gameState.foodItems.length < 5) { // Max 5 food items
                const layer = Math.floor(Math.random() * 3);
                const x = Math.random() * 100;
                const y = Math.random() * 100;
                const newFood = { layer, x, y, id: `food-${Date.now()}` };
                gameState.foodItems.push(newFood);
                renderFoodItem(newFood);
            }
        }, spawnDelay);
        if (autoDemo.active) trackDemoTimer(timerId);
    }
}

function runSimulation() {
    if (gameState.isPaused || !gameState.isInfectionMode) return;
    
    gameState.simulationTimer = setTimeout(() => {
        gameState.gameDay += 1;
        gameState.survivalDays = Math.max(0, gameState.survivalDays - 1);
        survivalDaysElement.textContent = gameState.survivalDays.toFixed(1);
        
        // Trigger events at specific days
        if (gameState.gameDay === 7) {
            showEvent('⚠️ 子实体开始生长！');
        }
        if (gameState.gameDay === 12) {
            showEvent('⏰ 孢子即将成熟！');
        }
        
        // Check win condition
        if (gameState.survivalDays <= 0) {
            showResult('fungus_victory', `🍄 感染胜利！宿主在第${gameState.gameDay}天死亡`, {
                survivalDays: gameState.gameDay,
                strategy: '抵抗'
            });
            return;
        }
        
        // Continue simulation
        runSimulation();
    }, gameState.simulationSpeed);
}

// Pause simulation
function pauseSimulation() {
    gameState.isPaused = true;
    clearInterval(gameState.simulationTimer);
}

// Resume simulation
function resumeSimulation() {
    gameState.isPaused = false;
    if (gameState.isInfectionMode) {
        startInfectionLoop();
    } else {
        runSimulation();
    }
}

// Speed up simulation
function speedUpSimulation() {
    if (!autoDemo.active) {
        updateSpeedControlVisibility();
        if (scienceFact) {
            scienceFact.textContent = '玩家手动模式不提供 2 倍速；请正常完成感染抵抗。';
            scienceFact.classList.remove('hidden');
            setTimeout(() => {
                if (scienceFact) scienceFact.classList.add('hidden');
            }, 2500);
        }
        return;
    }

    autoDemo.speedMultiplier = getDemoSpeedMultiplier() > 1 ? 1 : 2;
    if (gameState.isInfectionMode) {
        gameState.simulationSpeed = getAutoDemoInfectionSpeedMs();
    }
    updateSpeedControlVisibility();
    setDemoStatus(`AI 对 AI 自动演示${getDemoSpeedMultiplier() > 1 ? '已切换到 2 倍速' : '已恢复 1 倍速'}`);
    return;
}

// Show event notification
function showEvent(message) {
    alert(message);
}

// Calculate maximum survival days based on host type, environment, and nutrition
function calculateMaxSurvivalDays() {
    let baseDays = 10; // Base survival days
    
    // Host type modifiers
    switch (gameState.hostType) {
        case 'camponotus':
            baseDays += 2; // +2 days
            break;
        case 'ponerine':
            baseDays += 1; // +1 day
            break;
        case 'atta':
            baseDays += 3; // +3 days (stronger immune system)
            break;
        case 'ghost_moth':
            baseDays += 5; // +5 days (larval stage advantage)
            break;
    }
    
    // Environment modifiers
    switch (gameState.environment) {
        case 'rainforest':
            baseDays -= 1; // -1 day (high humidity favors fungus)
            break;
        case 'jungle':
            baseDays -= 0.5; // -0.5 days
            break;
        case 'dry_forest':
            baseDays += 1; // +1 day (dry conditions hinder fungus)
            break;
        case 'alpine_meadow':
            if (gameState.hostType === 'ghost_moth') {
                baseDays += 2; // +2 days (cold temperatures slow infection, beneficial for ghost moth)
            } else {
                baseDays = 0; // Other hosts die immediately in alpine meadow
            }
            break;
    }
    
    // Nutrition level modifier
    if (gameState.nutrition === 'high') {
        baseDays += 2; // +2 days
    } else if (gameState.nutrition === 'medium') {
        baseDays += 1; // +1 day
    } // low nutrition: no bonus
    
    // Ensure minimum of 5 days and maximum of 25 days (except immediate death cases)
    if (baseDays <= 0) {
        return 0; // Immediate death
    }
    return Math.max(5, Math.min(25, baseDays));
}

// Show result screen
function showResult(resultType, message, stats) {
    clearInterval(gameState.timer);
    clearTimeout(gameState.simulationTimer);
    
    resultScreen.classList.remove('hidden');
    safeElement(resultMessage, (el) => {
        el.textContent = message;
    });
    
    if (resultType === 'host_victory') {
        safeElement(resultTitle, (el) => {
        el.textContent = '🏆 宿主方胜利！';
        el.style.color = '#27ae60';
    });
        resultTitle.style.color = '#27ae60';
    } else {
        safeElement(resultTitle, (el) => {
        el.textContent = '🍄 真菌方胜利！';
        el.style.color = '#c0392b';
    });
        resultTitle.style.color = '#c0392b';
    }
    
    // Display statistics
    let statsHTML = '<h3>📊 数据统计</h3>';
    statsHTML += `<p>• 宿主类型: ${getHostTypeName(gameState.hostType)}</p>`;
    statsHTML += `<p>• 环境: ${getEnvironmentName(gameState.environment)}</p>`;
    statsHTML += `<p>• 真菌类型: ${getFungusTypeName(gameState.fungusType)}</p>`;
    
    if (stats.strategy === '规避') {
        statsHTML += `<p>• 策略: ${stats.strategy}</p>`;
        statsHTML += `<p>• 步数: ${stats.steps}</p>`;
    } else if (stats.strategy === '抵抗') {
        statsHTML += `<p>• 策略: ${stats.strategy}</p>`;
        statsHTML += `<p>• 生存时长: ${stats.survivalDays}天</p>`;
    }
    
    safeElement(resultStats, (el) => {
        el.innerHTML = statsHTML;
    });
    safeElement(resultScienceFacts, (el) => {
        el.classList.add('hidden');
        el.innerHTML = '';
    });
}

// Helper functions for display names
function getHostTypeName(hostType) {
    const names = {
        camponotus: '木蚁 (Camponotus)',
        ponerine: '猛蚁 (Ponerine)',
        atta: '切叶蚁 (Atta)',
        ghost_moth: '鬼天蛾幼虫 (Thitarodes)'
    };
    return names[hostType] || hostType;
}

function getEnvironmentName(environment) {
    const names = {
        rainforest: '热带雨林',
        jungle: '丛林',
        dry_forest: '热带季雨林',
        alpine: '高山草甸'
    };
    return names[environment] || environment;
}

function getFungusTypeName(fungusType) {
    const names = {
        unilateralis: 'O. unilateralis',
        kimflemingiae: 'O. kimflemingiae',
        sinensis: 'O. sinensis (冬虫夏草)'
    };
    return names[fungusType] || fungusType;
}

// Show/hide loading overlay
function showLoading(show, message) {
    if (loadingText && typeof message === 'string' && message.trim()) {
        loadingText.textContent = message.trim();
    }
    loadingOverlay.classList.toggle('hidden', !show);
}

// Infection loop: host wins by surviving 15 days while infected.
function startInfectionLoop() {
    if (!gameState.isInfectionMode || gameState.isPaused) return;

    // Avoid multiple loops
    if (gameState.simulationTimer) {
        clearInterval(gameState.simulationTimer);
        gameState.simulationTimer = null;
    }

    gameState.infectionLastTickTs = Date.now();

    gameState.simulationTimer = setInterval(() => {
        if (gameState.isPaused || !gameState.isInfectionMode) return;

        const now = Date.now();
        const dt = Math.max(0, now - (gameState.infectionLastTickTs || now));
        gameState.infectionLastTickTs = now;

        const dayDelta = dt / (gameState.simulationSpeed || 30000);

        // Progress
        gameState.infectionDaysSurvived += dayDelta;
        gameState.infectionHealthDays = Math.max(0, gameState.infectionHealthDays - dayDelta);

        // Stage progress (purely informational): map 0~goalDays -> 1~8
        const rawStage = Math.min(8, Math.floor((gameState.infectionDaysSurvived / gameState.infectionGoalDays) * 8) + 1);
        let stage = rawStage;
        const stageInfo = getStageInfo(stage, gameState.fungusType, gameState.hostType);
        if (stageInfo && stageInfo.skipped) stage = 7; // sinensis / special skips 4-6
        if (stage !== gameState.currentInfectionStage) {
            gameState.currentInfectionStage = stage;
            updateInfectionStageDisplay();
        }

        // Update UI
        if (survivalDaysElement) {
            survivalDaysElement.textContent = gameState.infectionDaysSurvived.toFixed(1);
        }
        if (healthDaysElement) {
            healthDaysElement.textContent = gameState.infectionHealthDays.toFixed(1);
        }
        updateRealTimeDisplay(Math.max(0, gameState.infectionGoalDays - gameState.infectionDaysSurvived));

        // Lose condition: health depleted
        if (gameState.infectionHealthDays <= 0) {
            clearInterval(gameState.simulationTimer);
            gameState.simulationTimer = null;
            showResult('fungus_victory', `🍄 感染胜利！宿主未能撑过第${gameState.infectionGoalDays}天`, {
                survivalDays: gameState.infectionDaysSurvived.toFixed(1),
                strategy: '抵抗'
            });
            return;
        }

        // Win condition: survived long enough
        if (gameState.infectionDaysSurvived >= gameState.infectionGoalDays) {
            clearInterval(gameState.simulationTimer);
            gameState.simulationTimer = null;
            showResult('host_victory', '🏆 生存胜利！宿主在感染状态下坚持了15天', {
                survivalDays: gameState.infectionGoalDays,
                strategy: '抵抗'
            });
        }
    }, 250);
}

// =========================
// AI Commentary (infection)
// =========================
function getLayerCounts(items = []) {
    const counts = { 0: 0, 1: 0, 2: 0 };
    items.forEach((it) => {
        const layer = Number(it?.layer);
        if (layer === 0 || layer === 1 || layer === 2) counts[layer] += 1;
    });
    return counts;
}

function round1(n) {
    return Math.round(Number(n) * 10) / 10;
}

function dist2D(a, b) {
    const dx = (a.x ?? 0) - (b.x ?? 0);
    const dy = (a.y ?? 0) - (b.y ?? 0);
    return Math.sqrt(dx * dx + dy * dy);
}

function getNearestOnSameLayer(source, items = []) {
    const sameLayer = items.filter((it) => it?.layer === source?.layer);
    if (sameLayer.length === 0) return null;
    let best = sameLayer[0];
    let bestD = dist2D(source, best);
    for (let i = 1; i < sameLayer.length; i++) {
        const d = dist2D(source, sameLayer[i]);
        if (d < bestD) {
            bestD = d;
            best = sameLayer[i];
        }
    }
    return { item: best, distance: round1(bestD) };
}

function extractTextFromLLMResponse(response) {
    return (
        response?.response ??
        response?.choices?.[0]?.message?.content ??
        response?.choices?.[0]?.text ??
        ''
    );
}

function tryParseJsonObject(text) {
    if (!text || typeof text !== 'string') return null;
    const trimmed = text.trim();
    try {
        const parsed = JSON.parse(trimmed);
        if (parsed && typeof parsed === 'object') return parsed;
    } catch { /* ignore */ }

    const match = trimmed.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
        const parsed = JSON.parse(match[0]);
        if (parsed && typeof parsed === 'object') return parsed;
    } catch { /* ignore */ }
    return null;
}

function buildFunnyTwoLiner(snapshot) {
    const stage = snapshot?.infectionStage ?? snapshot?.currentInfectionStage ?? '?';
    const sd = snapshot?.daysSurvived ?? snapshot?.survivalDays ?? '?';
    const sp = snapshot?.summary?.sporeCountsByLayer || { 0: 0, 1: 0, 2: 0 };
    const fd = snapshot?.summary?.foodCountsByLayer || { 0: 0, 1: 0, 2: 0 };
    const nearestFood = snapshot?.summary?.nearestFoodSameLayer?.distance;
    const nearestSpore = snapshot?.summary?.nearestSporeSameLayer?.distance;

    const s1 = `当前是感染阶段${stage}：宿主一边数着还剩${sd}天，一边怀疑自己是不是踩到了“真菌版乐高”。`;
    const s2 = `孢子(0/1/2层)=${sp[0]}/${sp[1]}/${sp[2]}、食物=${fd[0]}/${fd[1]}/${fd[2]}；最近同层食物距${nearestFood ?? '？'}、孢子距${nearestSpore ?? '？'}——这局面，主打一个“跑不跑都刺激”。`;
    return `${s1}\n${s2}`;
}

// 与孢子生成共用的 Flask/GLM-5 转发配置
const AI_PROXY_ENDPOINT = 'http://127.0.0.1:8002/api/generate';
const AI_MODEL_NAME = 'glm-5';
const AI_TIMEOUT_MS = 90000;
const RAG_ASK_ENDPOINT = 'http://127.0.0.1:8002/api/rag/ask';
const RAG_HEALTH_ENDPOINT = 'http://127.0.0.1:8002/api/rag/health';

function getStageGuideCacheKey(stage, fungusType, hostType, environment) {
    return [stage, fungusType, hostType, environment].join('|');
}

function normalizeStageRagAnswer(answer) {
    if (!answer) return '';

    return String(answer)
        .replace(/^当前未配置 GLM 生成能力，先展示本地 RAG 检索到的最相关证据。[\r\n]*/u, '知识库证据：\n')
        .trim();
}

function buildStageGuideQuestion(stage, info) {
    const fungusName = getFungusTypeName(gameState.fungusType);
    const hostName = getHostTypeName(gameState.hostType);
    const envName = getEnvironmentName(gameState.environment);
    const skippedText = info.skipped
        ? '这个阶段在当前宿主/真菌组合里会被跳过，请解释为什么会跳过，以及课堂上应如何避免误讲。'
        : '请解释这个阶段的生物学机制、可观察表现、以及适合课堂讲解的重点。';

    return [
        `请解释 fungi simulator 中的感染阶段${stage}。`,
        `真菌：${fungusName}`,
        `宿主：${hostName}`,
        `环境：${envName}`,
        `阶段名称：${info.name}`,
        `阶段时间：${info.time}（${info.realTime}）`,
        `当前基础说明：${info.description}`,
        skippedText,
        '请只基于知识库证据回答，输出中文短段落。'
    ].join('\n');
}

async function fetchStageRagExplanation(stage, info) {
    const cacheKey = getStageGuideCacheKey(stage, gameState.fungusType, gameState.hostType, gameState.environment);
    if (stageGuideRagCache.has(cacheKey)) {
        return stageGuideRagCache.get(cacheKey);
    }

    const response = await fetch(RAG_ASK_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            question: buildStageGuideQuestion(stage, info),
            top_k: 2
        })
    });

    const data = await response.json();
    if (!response.ok) {
        throw new Error(data.message || data.error || `HTTP ${response.status}`);
    }

    const payload = {
        answer: normalizeStageRagAnswer(data.answer || ''),
        retrieved: data.retrieved || []
    };
    stageGuideRagCache.set(cacheKey, payload);
    return payload;
}

function buildStageGuideText(statusMessage = '') {
    const hostName = getHostTypeName(gameState.hostType);
    const fungusName = getFungusTypeName(gameState.fungusType);
    const envName = getEnvironmentName(gameState.environment);
    const current = Number(gameState.currentInfectionStage || 0);

    const lines = [];
    lines.push(`真菌：${fungusName}`);
    lines.push(`宿主：${hostName}`);
    lines.push(`环境：${envName}`);
    if (statusMessage) {
        lines.push(`RAG 状态：${statusMessage}`);
    }
    lines.push('');

    for (let i = 1; i <= 8; i++) {
        const info = getStageInfo(i, gameState.fungusType, gameState.hostType);
        const marker = i === current ? '👉 ' : '';
        const skipped = info.skipped ? '（跳过）' : '';
        const cacheKey = getStageGuideCacheKey(i, gameState.fungusType, gameState.hostType, gameState.environment);
        const ragData = stageGuideRagCache.get(cacheKey);

        lines.push(`${marker}阶段${i}｜${info.name}${skipped}`);
        lines.push(`时间：${info.time}（${info.realTime}）`);
        lines.push(`基础说明：${info.description}`);

        if (ragData && ragData.answer) {
            lines.push(`知识库补充：${ragData.answer}`);
        } else {
            lines.push('知识库补充：正在检索与生成中...');
        }

        lines.push('');
    }

    return lines.join('\n');
}

function renderStageGuidePanel(statusMessage = '') {
    const content = document.getElementById('stage-guide-content');
    if (!content) return;
    content.textContent = buildStageGuideText(statusMessage);
}

async function hydrateStageGuideWithRAG() {
    const myToken = ++stageGuideHydrationToken;
    renderStageGuidePanel('正在补充阶段知识...');

    let completed = 0;
    for (let i = 1; i <= 8; i++) {
        const info = getStageInfo(i, gameState.fungusType, gameState.hostType);
        try {
            await fetchStageRagExplanation(i, info);
        } catch (error) {
            const cacheKey = getStageGuideCacheKey(i, gameState.fungusType, gameState.hostType, gameState.environment);
            stageGuideRagCache.set(cacheKey, {
                answer: `知识库补充暂时不可用：${error.message || error}`,
                retrieved: []
            });
        }

        completed += 1;
        if (myToken !== stageGuideHydrationToken) return;

        const panel = document.getElementById('stage-guide-panel');
        if (!panel || panel.classList.contains('hidden')) return;

        renderStageGuidePanel(`已完成 ${completed}/8 个阶段`);
    }

    if (myToken === stageGuideHydrationToken) {
        renderStageGuidePanel('8/8 阶段知识已完成补充');
    }
}

async function enrichCurrentStageWithRAG(stage) {
    const currentStage = Number(stage);
    if (!scienceFact || !gameState.isInfectionMode) return;

    const info = getStageInfo(currentStage, gameState.fungusType, gameState.hostType);
    try {
        const ragData = await fetchStageRagExplanation(currentStage, info);
        if (!gameState.isInfectionMode || Number(gameState.currentInfectionStage) !== currentStage) return;

        let warningText = `⚠️ 阶段${currentStage}: ${info.name}\n`;
        warningText += `时间: ${info.time} (${info.realTime})\n`;
        warningText += `${info.description}`;
        if (ragData && ragData.answer) {
            warningText += `\n\n【知识库补充】\n${ragData.answer}`;
        }

        scienceFact.innerHTML = warningText.replace(/\n/g, '<br>');
        scienceFact.classList.remove('hidden');
    } catch (error) {
        console.warn('Failed to enrich current stage with RAG:', error);
    }
}

async function callLLM(prompt, { temperature = 0.4 } = {}) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);
    try {
        async function postJson(body) {
            return await fetch(AI_PROXY_ENDPOINT, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
                signal: controller.signal
            });
        }

        const candidates = [
            // 1) GLM-5 调用
            {
                model: AI_MODEL_NAME,
                prompt,
                stream: false,
                think: false,
                options: { temperature }
            },
            // 2) 简化版
            { prompt, stream: false, temperature },
            // 3) OpenAI-like
            {
                model: AI_MODEL_NAME,
                messages: [{ role: 'user', content: prompt }],
                stream: false,
                temperature
            }
        ];

        let lastHttpError = null;
        for (const body of candidates) {
            const response = await postJson(body);

            if (!response.ok) {
                const status = response.status;
                const text = await response.text().catch(() => '');
                const err = new Error(`HTTP ${status}: ${text || response.statusText}`);
                lastHttpError = err;
                if (status === 400 || status === 401 || status === 404 || status === 405 || status === 415 || status === 422) {
                    continue;
                }
                throw err;
            }

            const contentType = (response.headers.get('content-type') || '').toLowerCase();
            if (contentType.includes('application/json')) {
                return await response.json();
            }
            const text = await response.text();
            return { response: text };
        }

        throw lastHttpError || new Error('请求失败：服务未接受任何已知请求格式');
    } catch (error) {
        if (error && error.name === 'AbortError') {
            throw new Error(
                '请求超时：AI 解说服务响应过慢。\n' +
                `请确保转发服务可达：${AI_PROXY_ENDPOINT}\n`
            );
        }
        if (error && (error.name === 'TypeError' || `${error}`.includes('TypeError'))) {
            throw new Error(
                '网络错误：无法连接到 AI 解说服务。\n' +
                `请检查地址/端口/跨域：${AI_PROXY_ENDPOINT}\n`
            );
        }
        throw error;
    } finally {
        clearTimeout(timer);
    }
}

// =========================
// Auto Demo (AI vs AI)
// =========================
const AUTO_DEMO_STEP_DELAY_MS = 900;
const AUTO_DEMO_INFECTION_SPEED_MS = 6000;
const AUTO_DEMO_INFECTION_MAX_MS = 50000;
const AUTO_DEMO_INFECTED_HOST_DELAY_MS = 2400;
const AUTO_DEMO_INFECTED_HOST_MAX_ACTIONS = 10;

function isAutoDemoRunning() {
    return autoDemo.active;
}

function getDemoSpeedMultiplier() {
    return autoDemo.active ? Math.max(1, Number(autoDemo.speedMultiplier) || 1) : 1;
}

function getDemoDelay(ms) {
    return Math.max(80, Math.round(ms / getDemoSpeedMultiplier()));
}

function getAutoDemoInfectionSpeedMs() {
    return Math.max(1000, Math.round(AUTO_DEMO_INFECTION_SPEED_MS / getDemoSpeedMultiplier()));
}

function updateSpeedControlVisibility() {
    if (infectionSpeedBtn) {
        infectionSpeedBtn.classList.toggle('hidden', true);
        infectionSpeedBtn.disabled = true;
    }

    if (autoDemoSpeedBtn) {
        autoDemoSpeedBtn.classList.toggle('hidden', !autoDemo.active);
        autoDemoSpeedBtn.classList.toggle('is-active', getDemoSpeedMultiplier() > 1);
        autoDemoSpeedBtn.textContent = getDemoSpeedMultiplier() > 1 ? '2倍速中' : '2倍速';
        autoDemoSpeedBtn.setAttribute(
            'aria-pressed',
            getDemoSpeedMultiplier() > 1 ? 'true' : 'false'
        );
    }
}

function isDemoStoppedError(error) {
    return error && error.message === 'demo_stopped';
}

function trackDemoTimer(id) {
    autoDemo.timers.push(id);
    return id;
}

function clearDemoTimers() {
    autoDemo.timers.forEach((id) => {
        clearTimeout(id);
        clearInterval(id);
    });
    autoDemo.timers = [];
}

function demoSleep(ms) {
    return new Promise((resolve, reject) => {
        const token = autoDemo.token;
        const id = trackDemoTimer(setTimeout(() => {
            autoDemo.timers = autoDemo.timers.filter((item) => item !== id);
            if (!autoDemo.active || token !== autoDemo.token) {
                reject(new Error('demo_stopped'));
                return;
            }
            resolve();
        }, getDemoDelay(ms)));
    });
}

function setDemoStatus(message) {
    const statusEl = document.getElementById('auto-demo-status');
    if (statusEl) statusEl.textContent = message;
    const banner = document.getElementById('auto-demo-banner');
    if (banner) banner.classList.add('auto-demo-thinking');
}

function showDemoBanner(show) {
    const banner = document.getElementById('auto-demo-banner');
    if (!banner) return;
    banner.classList.toggle('hidden', !show);
    if (!show) banner.classList.remove('auto-demo-thinking');
}

function clearAutoDemoHighlights() {
    document.querySelectorAll('.auto-demo-action-highlight, .auto-demo-spore-highlight, .auto-demo-host-highlight')
        .forEach((el) => {
            el.classList.remove('auto-demo-action-highlight', 'auto-demo-spore-highlight', 'auto-demo-host-highlight');
        });
}

function getActionControlButton(action) {
    if (!action) return null;
    if (action.action === 'layer') {
        const onclick = action.delta > 0 ? "changeLayer(1)" : "changeLayer(-1)";
        return document.querySelector(`button[onclick="${onclick}"]`);
    }
    return document.querySelector(`button[onclick="moveHost('${action.direction}')"]`);
}

async function highlightHostDemoAction(action) {
    clearAutoDemoHighlights();
    const button = getActionControlButton(action);
    if (button) button.classList.add('auto-demo-action-highlight');
    if (hostIndicator) hostIndicator.classList.add('auto-demo-host-highlight');
    await demoSleep(320);
}

function highlightDemoSpores(duration = 1600) {
    const spores = document.querySelectorAll('.spore');
    spores.forEach((spore) => spore.classList.add('auto-demo-spore-highlight'));
    trackDemoTimer(setTimeout(() => {
        spores.forEach((spore) => spore.classList.remove('auto-demo-spore-highlight'));
    }, getDemoDelay(duration)));
}

function setDemoButtonsDisabled(disabled) {
    ['start-auto-demo-home-btn', 'start-auto-demo-setup-btn', 'start-game-btn'].forEach((id) => {
        const btn = document.getElementById(id);
        if (btn) btn.disabled = disabled;
    });
}

function prepareAutoDemoGame() {
    clearInterval(gameState.timer);
    clearInterval(gameState.simulationTimer);
    clearTimeout(gameState.simulationTimer);
    gameState.simulationTimer = null;
    gameState.timer = null;

    if (resultScreen) resultScreen.classList.add('hidden');
    hideScienceFact();

    Object.assign(gameState, {
        currentPhase: 'setup',
        playerSide: 'fungus',
        hostType: 'camponotus',
        environment: 'rainforest',
        fungusType: 'unilateralis',
        spores: [],
        stepsTaken: 0,
        isInfectionMode: false,
        isPaused: false,
        simulationSpeed: 30000,
        infectionDaysSurvived: 0,
        infectionHealthDays: 0,
        infectionPenaltyCyclesApplied: 0,
        infectionLastTickTs: 0,
        isHostControllable: true,
        sporesVisible: true,
        currentInfectionStage: 0,
        energy: 0,
        foodItems: [],
        gameDay: 0,
        infectionStep: 0
    });
    autoDemo.hostHistory = [];
    autoDemo.lastHostAction = null;
    autoDemo.noProgressCount = 0;
    autoDemo.lastDistanceToNest = null;
    autoDemo.lastSporeValidationSummary = '';
    autoDemo.infectedHostHistory = [];
    autoDemo.speedMultiplier = 1;
    updateSpeedControlVisibility();

    const playerSideSelect = document.getElementById('player-side');
    const hostTypeSelect = document.getElementById('host-type');
    const fungusSelect = document.getElementById('fungus-type');
    if (playerSideSelect) playerSideSelect.value = 'fungus';
    if (hostTypeSelect) {
        hostTypeSelect.value = 'camponotus';
        onHostChange('camponotus');
    }
    const envSelect = document.getElementById('environment-type');
    if (envSelect) envSelect.value = 'rainforest';
    if (fungusSelect) {
        fungusSelect.value = 'unilateralis';
        fungusSelect.disabled = false;
    }

    clearSpores();
    hideHostIndicator();
    if (nestIndicator) nestIndicator.classList.add('hidden');

    document.querySelectorAll('.food-item').forEach((el) => el.remove());
    clearAutoDemoHighlights();
    if (aiCommentaryPanel) aiCommentaryPanel.classList.add('hidden');
    const stageGuidePanel = document.getElementById('stage-guide-panel');
    if (stageGuidePanel) stageGuidePanel.classList.add('hidden');
}

function buildHostAISnapshot() {
    const hostPos = {
        x: round1(gameState.hostPosition.x),
        y: round1(gameState.hostPosition.y),
        layer: Number(gameState.hostPosition.layer)
    };
    const nestPos = {
        x: round1(gameState.nestPosition.x),
        y: round1(gameState.nestPosition.y),
        layer: Number(gameState.nestPosition.layer)
    };
    const distanceToNest = round1(calculateDistance(hostPos, nestPos));
    const recentHistory = autoDemo.hostHistory.slice(-5);
    const lastAction = autoDemo.lastHostAction;

    return {
        hostType: getHostTypeName(gameState.hostType),
        environment: getEnvironmentName(gameState.environment),
        fungusType: getFungusTypeName(gameState.fungusType),
        hostPosition: hostPos,
        nestPosition: nestPos,
        stepsTaken: gameState.stepsTaken,
        maxSteps: gameState.maxSteps,
        stepsRemaining: Math.max(0, gameState.maxSteps - gameState.stepsTaken),
        distanceToNest,
        lastAction,
        noProgressCount: autoDemo.noProgressCount,
        recentHistory,
        justChangedLayer: recentHistory.length > 0 && recentHistory[recentHistory.length - 1]?.action?.action === 'layer',
        layerNames: ['地面层', '植被层', '树冠层']
    };
}

function getProjectedHostPosition(action) {
    const stepSize = 5;
    const host = gameState.hostPosition;
    const projected = { ...host };
    if (!action || typeof action !== 'object') return projected;

    if (action.action === 'layer') {
        projected.layer = Math.max(0, Math.min(2, projected.layer + Number(action.delta || 0)));
        return projected;
    }

    switch (action.direction) {
        case 'up':
            projected.y = Math.max(0, projected.y - stepSize);
            break;
        case 'down':
            projected.y = Math.min(100, projected.y + stepSize);
            break;
        case 'left':
            projected.x = Math.max(0, projected.x - stepSize);
            break;
        case 'right':
            projected.x = Math.min(100, projected.x + stepSize);
            break;
    }
    return projected;
}

function getActionDistanceAfterMove(action) {
    return calculateDistance(getProjectedHostPosition(action), gameState.nestPosition);
}

function areOppositeDirections(a, b) {
    return (
        (a === 'up' && b === 'down') ||
        (a === 'down' && b === 'up') ||
        (a === 'left' && b === 'right') ||
        (a === 'right' && b === 'left')
    );
}

function getCandidateHostActions() {
    const actions = [
        { action: 'move', direction: 'up' },
        { action: 'move', direction: 'down' },
        { action: 'move', direction: 'left' },
        { action: 'move', direction: 'right' }
    ];
    if (gameState.hostPosition.layer < 2 && gameState.stepsTaken + 3 <= gameState.maxSteps) {
        actions.push({ action: 'layer', delta: 1 });
    }
    if (gameState.hostPosition.layer > 0 && gameState.stepsTaken + 3 <= gameState.maxSteps) {
        actions.push({ action: 'layer', delta: -1 });
    }
    return actions;
}

function isHostActionValid(action) {
    if (!action) return false;
    const before = gameState.hostPosition;
    const after = getProjectedHostPosition(action);

    if (action.action === 'layer') {
        const nextLayer = before.layer + action.delta;
        if (nextLayer < 0 || nextLayer > 2) return false;
        if (gameState.stepsTaken + 3 > gameState.maxSteps) return false;
        const recentLayerChanges = autoDemo.hostHistory.slice(-2).filter((item) => item.action?.action === 'layer').length;
        return recentLayerChanges < 2;
    }

    if (action.action === 'move') {
        if (before.x === after.x && before.y === after.y) return false;
        const previous = autoDemo.lastHostAction;
        if (previous?.action === 'move' && areOppositeDirections(previous.direction, action.direction) && autoDemo.noProgressCount > 0) {
            return false;
        }
        return true;
    }

    return false;
}

function getSmartFallbackHostMove() {
    const nest = gameState.nestPosition;
    const candidates = getCandidateHostActions()
        .filter(isHostActionValid)
        .map((action) => ({
            action,
            distance: getActionDistanceAfterMove(action)
        }))
        .sort((a, b) => {
            const aLayerPenalty = a.action.action === 'layer' ? 8 : 0;
            const bLayerPenalty = b.action.action === 'layer' ? 8 : 0;
            const aRepeatPenalty = JSON.stringify(a.action) === JSON.stringify(autoDemo.lastHostAction) ? 4 : 0;
            const bRepeatPenalty = JSON.stringify(b.action) === JSON.stringify(autoDemo.lastHostAction) ? 4 : 0;
            return (a.distance + aLayerPenalty + aRepeatPenalty) - (b.distance + bLayerPenalty + bRepeatPenalty);
        });

    if (candidates.length > 0) {
        if (autoDemo.noProgressCount >= 2 && candidates[1]) {
            return candidates[1].action;
        }
        return candidates[0].action;
    }

    if (gameState.hostPosition.layer !== nest.layer && gameState.stepsTaken + 3 <= gameState.maxSteps) {
        return { action: 'layer', delta: nest.layer > gameState.hostPosition.layer ? 1 : -1 };
    }

    return { action: 'move', direction: 'right' };
}

function getGreedyHostMove() {
    return getSmartFallbackHostMove();
}

function repairHostAction(action) {
    const normalized = normalizeHostAIAction(action);
    if (isHostActionValid(normalized)) return normalized;
    return getSmartFallbackHostMove();
}

function getHostActionStepCost(action) {
    return action?.action === 'layer' ? 3 : 1;
}

function getProjectedPositionForState(position, action) {
    const stepSize = 5;
    const projected = { ...position };
    if (!action || typeof action !== 'object') return projected;

    if (action.action === 'layer') {
        projected.layer = Math.max(0, Math.min(2, projected.layer + Number(action.delta || 0)));
        return projected;
    }

    switch (action.direction) {
        case 'up':
            projected.y = Math.max(0, projected.y - stepSize);
            break;
        case 'down':
            projected.y = Math.min(100, projected.y + stepSize);
            break;
        case 'left':
            projected.x = Math.max(0, projected.x - stepSize);
            break;
        case 'right':
            projected.x = Math.min(100, projected.x + stepSize);
            break;
    }
    return projected;
}

function getPlanInitialState() {
    return {
        hostPosition: { ...gameState.hostPosition },
        nestPosition: { ...gameState.nestPosition },
        stepsTaken: gameState.stepsTaken,
        maxSteps: gameState.maxSteps,
        history: autoDemo.hostHistory.slice(),
        lastAction: autoDemo.lastHostAction,
        noProgressCount: autoDemo.noProgressCount
    };
}

function getCandidateHostActionsForState(state) {
    const actions = [
        { action: 'move', direction: 'up' },
        { action: 'move', direction: 'down' },
        { action: 'move', direction: 'left' },
        { action: 'move', direction: 'right' }
    ];
    if (state.hostPosition.layer < 2 && state.stepsTaken + 3 <= state.maxSteps) {
        actions.push({ action: 'layer', delta: 1 });
    }
    if (state.hostPosition.layer > 0 && state.stepsTaken + 3 <= state.maxSteps) {
        actions.push({ action: 'layer', delta: -1 });
    }
    return actions;
}

function isHostActionValidForState(action, state) {
    if (!action) return false;
    const after = getProjectedPositionForState(state.hostPosition, action);

    if (action.action === 'layer') {
        const nextLayer = state.hostPosition.layer + action.delta;
        if (nextLayer < 0 || nextLayer > 2) return false;
        if (state.stepsTaken + 3 > state.maxSteps) return false;
        const recentLayerChanges = state.history.slice(-2).filter((item) => item.action?.action === 'layer').length;
        return recentLayerChanges < 2;
    }

    if (action.action === 'move') {
        if (state.hostPosition.x === after.x && state.hostPosition.y === after.y) return false;
        if (
            state.lastAction?.action === 'move' &&
            areOppositeDirections(state.lastAction.direction, action.direction) &&
            state.noProgressCount > 0
        ) {
            return false;
        }
        return true;
    }

    return false;
}

function getFallbackHostMoveForState(state) {
    const candidates = getCandidateHostActionsForState(state)
        .filter((action) => isHostActionValidForState(action, state))
        .map((action) => ({
            action,
            distance: calculateDistance(getProjectedPositionForState(state.hostPosition, action), state.nestPosition)
        }))
        .sort((a, b) => {
            const aLayerPenalty = a.action.action === 'layer' ? 8 : 0;
            const bLayerPenalty = b.action.action === 'layer' ? 8 : 0;
            const aRepeatPenalty = JSON.stringify(a.action) === JSON.stringify(state.lastAction) ? 4 : 0;
            const bRepeatPenalty = JSON.stringify(b.action) === JSON.stringify(state.lastAction) ? 4 : 0;
            return (a.distance + aLayerPenalty + aRepeatPenalty) - (b.distance + bLayerPenalty + bRepeatPenalty);
        });

    if (candidates.length > 0) {
        return state.noProgressCount >= 2 && candidates[1] ? candidates[1].action : candidates[0].action;
    }

    return null;
}

function applyHostActionToPlanState(state, action) {
    const beforeDistance = calculateDistance(state.hostPosition, state.nestPosition);
    const afterPosition = getProjectedPositionForState(state.hostPosition, action);
    const afterDistance = calculateDistance(afterPosition, state.nestPosition);
    const improved = afterDistance < beforeDistance - 0.1;

    state.hostPosition = afterPosition;
    state.stepsTaken += getHostActionStepCost(action);
    state.lastAction = action;
    state.noProgressCount = improved ? 0 : state.noProgressCount + 1;
    state.history.push({
        step: state.stepsTaken,
        action,
        beforeDistance: round1(beforeDistance),
        afterDistance: round1(afterDistance),
        improved
    });
    state.history = state.history.slice(-10);
}

function normalizeHostAIPlan(raw) {
    const actions = Array.isArray(raw) ? raw : raw?.actions;
    if (!Array.isArray(actions)) return [];
    return actions.map(normalizeHostAIAction).filter(Boolean);
}

function repairHostPlan(actions, horizon) {
    const state = getPlanInitialState();
    const repaired = [];
    const maxStepBudget = Math.min(
        state.maxSteps,
        state.stepsTaken + Math.max(0, Number(horizon) || 0)
    );
    const maxActions = Math.max(1, state.maxSteps * 2);
    let inputIndex = 0;

    while (state.stepsTaken < maxStepBudget && repaired.length < maxActions) {
        const candidate = actions[inputIndex++] || null;
        let action = isHostActionValidForState(candidate, state)
            ? candidate
            : getFallbackHostMoveForState(state);

        if (!action || !isHostActionValidForState(action, state)) break;
        if (state.stepsTaken + getHostActionStepCost(action) > maxStepBudget) {
            action = getFallbackHostMoveForState({
                ...state,
                maxSteps: maxStepBudget
            });
            if (!action || !isHostActionValidForState(action, { ...state, maxSteps: maxStepBudget })) break;
        }

        repaired.push(action);
        applyHostActionToPlanState(state, action);

        const reachedNest = calculateDistance(state.hostPosition, state.nestPosition) < 8;
        if (reachedNest && state.stepsTaken >= 10) break;
    }

    return repaired;
}

async function planHostMovesAI() {
    const snapshot = buildHostAISnapshot();
    const horizon = Math.max(1, snapshot.stepsRemaining);
    const prompt = `
你是 Fungi Simulator 中的“宿主方 AI”。你不知道任何孢子位置，只能根据已知信息提前规划完整回巢路线。

【目标】
从当前局面开始，提前思考最多 ${horizon} 步，在 ${snapshot.maxSteps} 步限制内尽量抵达巢穴。

【重要限制】
- 不能使用、猜测或要求孢子坐标。
- 平面移动每次消耗 1 步；换层消耗 3 步。
- 如果换层，delta 只能是 1 或 -1。
- 不要原地撞墙，不要来回抵消移动。

【输出要求】
只输出严格 JSON，不要 Markdown、不要解释。格式：
{"actions":[
  {"action":"move","direction":"up|down|left|right"},
  {"action":"layer","delta":1|-1}
]}

【当前局面 JSON】
${JSON.stringify(snapshot)}
`;

    try {
        const llmResp = await callLLM(prompt, { temperature: 0.25 });
        const text = extractTextFromLLMResponse(llmResp);
        const parsed = tryParseJsonObject(text);
        const repaired = repairHostPlan(normalizeHostAIPlan(parsed), horizon);
        if (repaired.length > 0) return repaired;
    } catch (error) {
        if (isDemoStoppedError(error)) throw error;
        console.warn('宿主 AI 多步规划失败，使用本地路线兜底:', error);
    }

    return repairHostPlan([], horizon);
}

async function playHostPlan(actions, token) {
    for (const action of actions) {
        if (!autoDemo.active || token !== autoDemo.token || isDemoGameEnded()) return 'stopped';
        if (gameState.isInfectionMode) return 'infected';
        if (gameState.stepsTaken >= gameState.maxSteps) return 'step_limit';

        setDemoStatus(`${getActionStatusHint(action)}（第 ${gameState.stepsTaken + 1}/${gameState.maxSteps} 步）`);
        await highlightHostDemoAction(action);
        if (!autoDemo.active || token !== autoDemo.token || isDemoGameEnded()) return 'stopped';

        applyHostDemoAction(action);
        await demoSleep(AUTO_DEMO_STEP_DELAY_MS);
        clearAutoDemoHighlights();

        if (gameState.isInfectionMode) return 'infected';
        if (isDemoGameEnded()) return 'finished';
    }

    return 'completed';
}

function formatHostAction(action) {
    if (action.action === 'layer') return action.delta > 0 ? '上层' : '下层';
    const names = { up: '向上', down: '向下', left: '向左', right: '向右' };
    return names[action.direction] || action.direction;
}

function recordHostAction(action, beforeDistance, afterDistance) {
    const improved = afterDistance < beforeDistance - 0.1;
    if (improved) {
        autoDemo.noProgressCount = 0;
    } else {
        autoDemo.noProgressCount += 1;
    }

    autoDemo.lastHostAction = action;
    autoDemo.lastDistanceToNest = afterDistance;
    autoDemo.hostHistory.push({
        step: gameState.stepsTaken,
        action,
        beforeDistance: round1(beforeDistance),
        afterDistance: round1(afterDistance),
        improved
    });
    autoDemo.hostHistory = autoDemo.hostHistory.slice(-10);
}

function getActionStatusHint(action) {
    const afterDistance = round1(getActionDistanceAfterMove(action));
    return `宿主 AI 选择${formatHostAction(action)}，预计距巢穴 ${afterDistance}`;
}

function buildAICommentarySnapshot() {
    const hostPos = { ...gameState.hostPosition, x: round1(gameState.hostPosition.x), y: round1(gameState.hostPosition.y) };
    const spores = (gameState.spores || []).map((s) => ({
        layer: s.layer,
        x: round1(s.x),
        y: round1(s.y)
    }));
    const foods = (gameState.foodItems || []).map((f) => ({
        layer: f.layer,
        x: round1(f.x),
        y: round1(f.y)
    }));
    const sporeCounts = getLayerCounts(spores);
    const foodCounts = getLayerCounts(foods);

    return {
        phase: 'infection',
        hostType: getHostTypeName(gameState.hostType),
        environment: getEnvironmentName(gameState.environment),
        fungusType: getFungusTypeName(gameState.fungusType),
        infectionStage: gameState.currentInfectionStage,
        daysSurvived: round1(gameState.infectionDaysSurvived),
        goalDays: gameState.infectionGoalDays,
        healthDays: round1(gameState.infectionHealthDays),
        energy: gameState.energy,
        stepsTaken: gameState.stepsTaken,
        maxSteps: gameState.maxSteps,
        hostPosition: hostPos,
        spores,
        foodItems: foods,
        summary: {
            sporeCountsByLayer: sporeCounts,
            foodCountsByLayer: foodCounts,
            nearestSporeSameLayer: getNearestOnSameLayer(hostPos, spores),
            nearestFoodSameLayer: getNearestOnSameLayer(hostPos, foods)
        }
    };
}

function buildAICommentaryMeta(snapshot) {
    const sporeCounts = snapshot.summary?.sporeCountsByLayer || { 0: 0, 1: 0, 2: 0 };
    const foodCounts = snapshot.summary?.foodCountsByLayer || { 0: 0, 1: 0, 2: 0 };
    return (
        `阶段：${gameState.currentInfectionStage}/8\n` +
        `宿主：${getHostTypeName(gameState.hostType)} | 真菌：${getFungusTypeName(gameState.fungusType)} | 环境：${getEnvironmentName(gameState.environment)}\n` +
        `已生存：${round1(gameState.infectionDaysSurvived)}/${gameState.infectionGoalDays} 天 | 剩余生命：${round1(gameState.infectionHealthDays)} 天 | 能量：${gameState.energy}\n` +
        `孢子分布(0/1/2层)：${sporeCounts[0]}/${sporeCounts[1]}/${sporeCounts[2]} | 食物分布(0/1/2层)：${foodCounts[0]}/${foodCounts[1]}/${foodCounts[2]}`
    );
}

function buildLocalAICommentary(snapshot) {
    const remainingGoalDays = Math.max(0, (snapshot.goalDays || 15) - (snapshot.daysSurvived || 0));
    const healthDays = Number(snapshot.healthDays || 0);
    const nearestFood = snapshot.summary?.nearestFoodSameLayer?.distance;
    const nearestSpore = snapshot.summary?.nearestSporeSameLayer?.distance;
    const predictedWinner = healthDays >= remainingGoalDays ? '宿主方' : '真菌方';
    const confidence = healthDays >= remainingGoalDays ? '0.62' : '0.68';

    return [
        '【当前局面】',
        buildFunnyTwoLiner(snapshot),
        '',
        '【概述】',
        `GLM-5 暂时不可用，已切换为本地规则解说。当前宿主处于感染阶段${snapshot.infectionStage}/8。`,
        '',
        '【分析要点】',
        `- 宿主已生存 ${snapshot.daysSurvived}/${snapshot.goalDays} 天，剩余生命约 ${snapshot.healthDays} 天。`,
        `- 距离胜利还需要坚持约 ${round1(remainingGoalDays)} 天，生命值与剩余目标天数是关键。`,
        `- 同层最近食物距离：${nearestFood ?? '暂无'}；同层最近孢子距离：${nearestSpore ?? '暂无'}。`,
        '',
        '【胜负预测】',
        `胜方：${predictedWinner}`,
        `置信度：${confidence}`,
        `时间尺度：约 ${round1(remainingGoalDays)} 天内见分晓`,
        `原因：生命值 ${healthDays >= remainingGoalDays ? '足以覆盖' : '不足以覆盖'} 剩余生存目标；移动会继续消耗生命值。`,
        '',
        '【宿主建议】',
        '- 优先寻找同层食物补充生命值。',
        '- 减少无意义移动，避免触发额外生命惩罚。',
        '- 如果需要换层，先确认收益大于步数成本。',
        '',
        '【真菌建议】',
        '- 继续利用时间压力消耗宿主生命值。',
        '- 观察宿主是否为了食物绕路。',
        '- 如果宿主频繁移动，感染方优势会扩大。'
    ].join('\n');
}

function renderAICommentary(snapshot, contentText) {
    if (aiCommentaryMeta) aiCommentaryMeta.textContent = buildAICommentaryMeta(snapshot);
    if (aiCommentaryContent) aiCommentaryContent.textContent = contentText;
    if (aiCommentaryPanel) aiCommentaryPanel.classList.remove('hidden');
}

function showAutoDemoCommentaryPlaceholder(message = '感染已触发，AI 正在生成局面解说…') {
    const snapshot = buildAICommentarySnapshot();
    if (aiCommentaryMeta) {
        aiCommentaryMeta.textContent = buildAICommentaryMeta(snapshot);
    }
    if (aiCommentaryContent) {
        aiCommentaryContent.textContent = message;
    }
    if (aiCommentaryPanel) {
        aiCommentaryPanel.classList.remove('hidden');
    }
}

function getWeightedFoodDistance(food, host = gameState.hostPosition) {
    const planarDistance = calculateDistance(host, food);
    const layerPenalty = Math.abs((food.layer ?? 0) - (host.layer ?? 0)) * 18;
    return round1(planarDistance + layerPenalty);
}

function getNearestFoodForInfectedHost() {
    const foods = gameState.foodItems || [];
    if (foods.length === 0) return null;

    const host = gameState.hostPosition;
    return foods
        .map((food) => ({
            ...food,
            distance: round1(calculateDistance(host, food)),
            weightedDistance: getWeightedFoodDistance(food, host),
            sameLayer: food.layer === host.layer
        }))
        .sort((a, b) => a.weightedDistance - b.weightedDistance)[0] || null;
}

function buildInfectedHostAISnapshot() {
    const hostPos = {
        x: round1(gameState.hostPosition.x),
        y: round1(gameState.hostPosition.y),
        layer: Number(gameState.hostPosition.layer)
    };
    const foods = (gameState.foodItems || []).map((food) => ({
        id: food.id,
        layer: food.layer,
        x: round1(food.x),
        y: round1(food.y),
        distance: round1(calculateDistance(hostPos, food)),
        weightedDistance: getWeightedFoodDistance(food, hostPos),
        sameLayer: food.layer === hostPos.layer
    })).sort((a, b) => a.weightedDistance - b.weightedDistance);
    const stepsSinceInfection = Math.max(0, gameState.stepsTaken - gameState.infectionStep);
    const nextPenaltyAt = (Math.floor(stepsSinceInfection / 3) + 1) * 3;

    return {
        phase: 'infected_host_survival',
        hostType: getHostTypeName(gameState.hostType),
        environment: getEnvironmentName(gameState.environment),
        fungusType: getFungusTypeName(gameState.fungusType),
        infectionStage: gameState.currentInfectionStage,
        daysSurvived: round1(gameState.infectionDaysSurvived),
        goalDays: gameState.infectionGoalDays,
        healthDays: round1(gameState.infectionHealthDays),
        remainingGoalDays: round1(Math.max(0, gameState.infectionGoalDays - gameState.infectionDaysSurvived)),
        hostPosition: hostPos,
        isHostControllable: gameState.isHostControllable,
        stepsTaken: gameState.stepsTaken,
        infectionStep: gameState.infectionStep,
        stepsSinceInfection,
        stepsUntilNextMovementPenalty: Math.max(0, nextPenaltyAt - stepsSinceInfection),
        movementPenalty: '感染后每多移动约3步，生命值减少0.5天',
        nearestFood: foods[0] || null,
        visibleFoodItems: foods.slice(0, 5),
        recentInfectedActions: autoDemo.infectedHostHistory.slice(-5),
        allowedActions: ['move', 'layer', 'wait']
    };
}

function normalizeInfectedHostAction(raw) {
    if (!raw || typeof raw !== 'object') return null;
    if (raw.action === 'wait') return { action: 'wait' };

    if (raw.action === 'move') {
        const direction = String(raw.direction || '').toLowerCase();
        if (['up', 'down', 'left', 'right'].includes(direction)) {
            return { action: 'move', direction };
        }
    }

    if (raw.action === 'layer') {
        const delta = Number(raw.delta);
        if (delta === 1 || delta === -1) {
            return { action: 'layer', delta };
        }
    }

    return null;
}

function isInfectedHostActionValid(action) {
    if (!action) return false;
    if (action.action === 'wait') return true;
    if (!gameState.isHostControllable) return false;

    if (action.action === 'layer') {
        const nextLayer = gameState.hostPosition.layer + action.delta;
        return nextLayer >= 0 && nextLayer <= 2;
    }

    if (action.action === 'move') {
        const before = gameState.hostPosition;
        const after = getProjectedHostPosition(action);
        return before.x !== after.x || before.y !== after.y;
    }

    return false;
}

function getMoveTowardPoint(target) {
    const host = gameState.hostPosition;
    const dx = (target.x ?? host.x) - host.x;
    const dy = (target.y ?? host.y) - host.y;

    if (Math.abs(dx) >= Math.abs(dy)) {
        if (Math.abs(dx) < 2 && Math.abs(dy) >= 2) {
            return { action: 'move', direction: dy >= 0 ? 'down' : 'up' };
        }
        return { action: 'move', direction: dx >= 0 ? 'right' : 'left' };
    }
    return { action: 'move', direction: dy >= 0 ? 'down' : 'up' };
}

function getMoveTowardPointFrom(position, target) {
    const dx = (target.x ?? position.x) - position.x;
    const dy = (target.y ?? position.y) - position.y;

    if (Math.abs(dx) >= Math.abs(dy)) {
        if (Math.abs(dx) < 2 && Math.abs(dy) >= 2) {
            return { action: 'move', direction: dy >= 0 ? 'down' : 'up' };
        }
        return { action: 'move', direction: dx >= 0 ? 'right' : 'left' };
    }
    return { action: 'move', direction: dy >= 0 ? 'down' : 'up' };
}

function getNearestFoodForPosition(position) {
    const foods = gameState.foodItems || [];
    if (foods.length === 0) return null;

    return foods
        .map((food) => ({
            ...food,
            distance: round1(calculateDistance(position, food)),
            weightedDistance: getWeightedFoodDistance(food, position),
            sameLayer: food.layer === position.layer
        }))
        .sort((a, b) => a.weightedDistance - b.weightedDistance)[0] || null;
}

function applyInfectedActionToPlanPosition(position, action) {
    return getProjectedPositionForState(position, action);
}

function planInfectedRouteToNearestFood(maxActionsRemaining = AUTO_DEMO_INFECTED_HOST_MAX_ACTIONS) {
    if (!gameState.isHostControllable) return [{ action: 'wait' }];

    const nearestFood = getNearestFoodForPosition(gameState.hostPosition);
    if (!nearestFood) return [{ action: 'wait' }];

    const actions = [];
    let position = { ...gameState.hostPosition };
    const maxActions = Math.max(1, Number(maxActionsRemaining) || 1);

    while (actions.length < maxActions) {
        const distance = calculateDistance(position, nearestFood);
        if (position.layer === nearestFood.layer && distance < 8) {
            if (actions.length === 0) actions.push({ action: 'wait' });
            break;
        }

        let action;
        if (position.layer !== nearestFood.layer) {
            action = { action: 'layer', delta: nearestFood.layer > position.layer ? 1 : -1 };
        } else {
            action = getMoveTowardPointFrom(position, nearestFood);
        }

        const projected = applyInfectedActionToPlanPosition(position, action);
        if (
            action.action === 'move' &&
            projected.x === position.x &&
            projected.y === position.y
        ) {
            break;
        }

        actions.push(action);
        position = projected;
    }

    return actions.length > 0 ? actions : [{ action: 'wait' }];
}

function getInfectedHostFallbackAction() {
    if (!gameState.isHostControllable) return { action: 'wait' };

    const nearestFood = getNearestFoodForInfectedHost();
    if (!nearestFood) return { action: 'wait' };

    if (nearestFood.sameLayer && nearestFood.distance <= 8) {
        return { action: 'wait' };
    }

    const remainingGoalDays = Math.max(0, gameState.infectionGoalDays - gameState.infectionDaysSurvived);
    const healthBuffer = gameState.infectionHealthDays - remainingGoalDays;
    if (healthBuffer < 1.5 || nearestFood.weightedDistance <= 28) {
        if (nearestFood.layer !== gameState.hostPosition.layer) {
            return { action: 'layer', delta: nearestFood.layer > gameState.hostPosition.layer ? 1 : -1 };
        }
        return getMoveTowardPoint(nearestFood);
    }

    return { action: 'wait' };
}

function repairInfectedHostAction(action) {
    const normalized = normalizeInfectedHostAction(action);
    if (isInfectedHostActionValid(normalized)) return normalized;
    return getInfectedHostFallbackAction();
}

async function decideInfectedHostActionAI() {
    const snapshot = buildInfectedHostAISnapshot();
    const prompt = `
你是 Fungi Simulator 中“感染后的宿主 AI”。宿主已经感染，不再回巢穴，目标是在感染状态下尽量活满 ${snapshot.goalDays} 天。

【可见信息】
- 你可以看到自己的位置、感染阶段、剩余生命、附近食物。
- 你不知道未来随机事件，只能基于当前快照做求生决策。

【策略】
- 如果当前阶段不可控，输出 wait。
- 如果同层附近有食物，优先靠近食物或等待拾取。
- 如果食物在其他层，只有收益明显时才换层，因为换层会增加步数。
- 如果生命值还够且附近没有食物，优先 wait 保留体力。
- 感染后移动有惩罚：每约 3 步会额外减少 0.5 天生命值。

【输出要求】
只输出严格 JSON，不要解释，不要 Markdown。格式只能是：
{"action":"move","direction":"up|down|left|right"}
{"action":"layer","delta":1|-1}
{"action":"wait"}

【当前感染后局面 JSON】
${JSON.stringify(snapshot)}
`;

    try {
        const llmResp = await callLLM(prompt, { temperature: 0.25 });
        const text = extractTextFromLLMResponse(llmResp);
        const parsed = repairInfectedHostAction(tryParseJsonObject(text));
        if (parsed) return parsed;
    } catch (error) {
        if (isDemoStoppedError(error)) throw error;
        console.warn('感染后宿主 AI 决策失败，使用本地求生策略:', error);
    }

    return getInfectedHostFallbackAction();
}

function getDirectHostMove() {
    const host = gameState.hostPosition;
    const nest = gameState.nestPosition;

    if (host.layer !== nest.layer) {
        return { action: 'layer', delta: nest.layer > host.layer ? 1 : -1 };
    }

    const dx = nest.x - host.x;
    const dy = nest.y - host.y;
    if (Math.abs(dx) >= Math.abs(dy)) {
        return { action: 'move', direction: dx >= 0 ? 'right' : 'left' };
    }
    return { action: 'move', direction: dy >= 0 ? 'down' : 'up' };
}

function normalizeHostAIAction(raw) {
    if (!raw || typeof raw !== 'object') return null;

    if (raw.action === 'move') {
        const direction = String(raw.direction || '').toLowerCase();
        if (['up', 'down', 'left', 'right'].includes(direction)) {
            return { action: 'move', direction };
        }
    }

    if (raw.action === 'layer') {
        const delta = Number(raw.delta);
        if (delta === 1 || delta === -1) {
            return { action: 'layer', delta };
        }
    }

    return null;
}

async function decideHostMoveAI() {
    const snapshot = buildHostAISnapshot();
    const prompt = `
你是 Fungi Simulator 中的“宿主方 AI”。你不知道任何孢子位置，只能根据已知信息决定下一步。

【目标】
在 ${snapshot.maxSteps} 步内尽量抵达巢穴，规避未知风险。

【行为策略】
- 优先选择能让 distanceToNest 下降的动作。
- 不要频繁换层；只有当前层难以前进，或巢穴在不同层且剩余步数足够时才换层。
- 如果 recentHistory 显示连续动作没有改善距离，请换一个方向尝试。
- 不要原地撞墙，也不要马上反向抵消上一回合移动。
- 你不知道孢子位置，所以不能基于孢子坐标决策，只能表现为“谨慎逃生”。

【移动规则】
- 平面移动：up/down/left/right，每步约 5 个坐标单位
- 换层：layer 动作 delta 只能是 1（上层）或 -1（下层），换层额外消耗 3 步
- 地图 layer：0=地面，1=植被，2=树冠

【输出要求（必须严格遵守）】
1) 只输出 JSON，不要 Markdown、不要解释
2) 格式只能是以下两种之一：
   {"action":"move","direction":"up|down|left|right"}
   {"action":"layer","delta":1|-1}

【当前局面 JSON】
${JSON.stringify(snapshot)}
`;

    try {
        const llmResp = await callLLM(prompt, { temperature: 0.25 });
        const text = extractTextFromLLMResponse(llmResp);
        const parsed = repairHostAction(tryParseJsonObject(text));
        if (parsed) return parsed;
    } catch (error) {
        if (isDemoStoppedError(error)) throw error;
        console.warn('宿主 AI 决策失败，使用启发式兜底:', error);
    }

    return getSmartFallbackHostMove();
}

function isDemoGameEnded() {
    return Boolean(resultScreen && !resultScreen.classList.contains('hidden'));
}

function forceAutoDemoResult(reason = 'timeout') {
    if (isDemoGameEnded()) return;

    clearInterval(gameState.timer);
    clearInterval(gameState.simulationTimer);
    clearTimeout(gameState.simulationTimer);
    gameState.timer = null;
    gameState.simulationTimer = null;

    if (!gameState.isInfectionMode) {
        setDemoStatus('宿主未能完成规避，自动进入感染结算…');
        enterInfectionMode();
        return;
    }

    const survived = Number(gameState.infectionDaysSurvived || 0);
    const health = Number(gameState.infectionHealthDays || 0);
    const goal = Number(gameState.infectionGoalDays || 15);
    const remainingGoal = Math.max(0, goal - survived);

    if (survived >= goal || health >= remainingGoal) {
        showResult('host_victory', '🏆 生存胜利！宿主在 AI 自动演示中成功撑过感染周期', {
            survivalDays: Math.max(goal, survived).toFixed ? Math.max(goal, survived).toFixed(1) : goal,
            strategy: reason === 'timeout' ? '自动结算' : '抵抗'
        });
    } else {
        showResult('fungus_victory', '🍄 感染胜利！AI 自动演示判定宿主无法撑过感染周期', {
            survivalDays: survived.toFixed(1),
            strategy: reason === 'timeout' ? '自动结算' : '感染'
        });
    }
}

async function finishAutoDemoIfUnresolved(token, reason = 'unresolved') {
    if (!autoDemo.active || token !== autoDemo.token || isDemoGameEnded()) return;

    if (!gameState.isInfectionMode) {
        forceAutoDemoResult(reason);
        if (gameState.isInfectionMode && !isDemoGameEnded()) {
            await runInfectionDemoPhase(token);
        }
        return;
    }

    forceAutoDemoResult(reason);
}

function applyHostDemoAction(action) {
    const beforeDistance = calculateDistance(gameState.hostPosition, gameState.nestPosition);
    if (action.action === 'layer') {
        changeLayer(action.delta);
        const afterDistance = calculateDistance(gameState.hostPosition, gameState.nestPosition);
        recordHostAction(action, beforeDistance, afterDistance);
        return;
    }
    moveHost(action.direction);
    const afterDistance = calculateDistance(gameState.hostPosition, gameState.nestPosition);
    recordHostAction(action, beforeDistance, afterDistance);
}

function getInfectedHostActionStatus(action, snapshot) {
    const layerNames = ['地面层', '植被层', '树冠层'];
    if (!snapshot?.isHostControllable) {
        return `感染后宿主 AI：第 ${snapshot?.infectionStage || gameState.currentInfectionStage} 阶段受感染影响，暂停行动`;
    }

    if (action?.action === 'wait') {
        if (snapshot?.nearestFood?.sameLayer && snapshot.nearestFood.distance <= 8) {
            return '感染后宿主 AI：停留在食物附近，优先恢复体力';
        }
        return '感染后宿主 AI：附近收益不足，等待保留体力';
    }

    if (action?.action === 'layer') {
        const targetLayer = gameState.hostPosition.layer + action.delta;
        return `感染后宿主 AI：切换到${layerNames[targetLayer] || '相邻层'}寻找食物`;
    }

    const directionLabels = {
        up: '上',
        down: '下',
        left: '左',
        right: '右'
    };
    return `感染后宿主 AI：向${directionLabels[action?.direction] || '目标'}移动寻找食物`;
}

function recordInfectedHostAction(action, beforeSnapshot, collectedFood) {
    const afterSnapshot = buildInfectedHostAISnapshot();
    autoDemo.infectedHostHistory.push({
        action,
        stage: afterSnapshot.infectionStage,
        beforeHealth: beforeSnapshot.healthDays,
        afterHealth: afterSnapshot.healthDays,
        beforeDays: beforeSnapshot.daysSurvived,
        afterDays: afterSnapshot.daysSurvived,
        collectedFood,
        hostPosition: afterSnapshot.hostPosition
    });
    if (autoDemo.infectedHostHistory.length > 12) {
        autoDemo.infectedHostHistory = autoDemo.infectedHostHistory.slice(-12);
    }
}

function applyInfectedHostDemoAction(action, beforeSnapshot) {
    const normalized = repairInfectedHostAction(action);
    const beforeFoodCount = gameState.foodItems.length;

    if (normalized.action === 'layer') {
        changeLayer(normalized.delta);
    } else if (normalized.action === 'move') {
        moveHost(normalized.direction);
    }

    checkForFoodAtPosition();
    const collectedFood = gameState.foodItems.length < beforeFoodCount;
    recordInfectedHostAction(normalized, beforeSnapshot, collectedFood);
    return { action: normalized, collectedFood };
}

async function playInfectedHostPlan(actions, token, actionsTaken) {
    let taken = actionsTaken;
    let collectedFood = false;

    for (const plannedAction of actions) {
        if (!autoDemo.active || token !== autoDemo.token || isDemoGameEnded()) {
            return { outcome: 'stopped', actionsTaken: taken, collectedFood };
        }
        if (!gameState.isInfectionMode) {
            return { outcome: 'finished', actionsTaken: taken, collectedFood };
        }
        if (taken >= AUTO_DEMO_INFECTED_HOST_MAX_ACTIONS) {
            return { outcome: 'actions_completed', actionsTaken: taken, collectedFood };
        }

        const beforeSnapshot = buildInfectedHostAISnapshot();
        const action = repairInfectedHostAction(plannedAction);
        setDemoStatus(getInfectedHostActionStatus(action, beforeSnapshot));
        await highlightHostDemoAction(action);
        if (!autoDemo.active || token !== autoDemo.token || isDemoGameEnded()) {
            return { outcome: 'stopped', actionsTaken: taken, collectedFood };
        }

        const result = applyInfectedHostDemoAction(action, beforeSnapshot);
        taken += 1;
        collectedFood = collectedFood || result.collectedFood;

        if (result.collectedFood) {
            setDemoStatus('感染后宿主 AI：成功找到食物，恢复 0.5 天生命值，准备重新规划下一段路线');
        }

        await demoSleep(AUTO_DEMO_INFECTED_HOST_DELAY_MS);
        clearAutoDemoHighlights();
        if (isDemoGameEnded()) {
            return { outcome: 'finished', actionsTaken: taken, collectedFood };
        }
        if (result.collectedFood) {
            return { outcome: 'food_collected', actionsTaken: taken, collectedFood };
        }
    }

    return { outcome: 'completed', actionsTaken: taken, collectedFood };
}

async function runInfectedHostAIDemoLoop(token) {
    let actionsTaken = 0;

    while (autoDemo.active && token === autoDemo.token && gameState.isInfectionMode) {
        if (isDemoGameEnded()) return 'finished';
        if (actionsTaken >= AUTO_DEMO_INFECTED_HOST_MAX_ACTIONS) return 'actions_completed';

        checkForFoodAtPosition();
        const snapshot = buildInfectedHostAISnapshot();
        const remainingActions = AUTO_DEMO_INFECTED_HOST_MAX_ACTIONS - actionsTaken;
        const nearestText = snapshot.nearestFood
            ? `最近食物在第 ${snapshot.nearestFood.layer} 层，距离 ${snapshot.nearestFood.distance}`
            : '当前没有可见食物';
        setDemoStatus(`感染后宿主 AI 正在提前规划寻食路线…（${nearestText}）`);

        const plan = planInfectedRouteToNearestFood(remainingActions);
        const result = await playInfectedHostPlan(plan, token, actionsTaken);
        actionsTaken = result.actionsTaken;

        if (result.outcome === 'finished') return 'finished';
        if (result.outcome === 'stopped') return 'stopped';
        if (result.outcome === 'actions_completed') return 'actions_completed';
        if (!result.collectedFood && plan.length === 1 && plan[0]?.action === 'wait') {
            return 'actions_completed';
        }
    }

    return 'stopped';
}

async function runHostAIDemoLoop(token) {
    while (autoDemo.active && token === autoDemo.token) {
        if (isDemoGameEnded()) return;
        if (gameState.isInfectionMode) {
            await runInfectionDemoPhase(token);
            return;
        }
        if (gameState.currentPhase !== 'host') {
            await finishAutoDemoIfUnresolved(token, 'host_phase_unavailable');
            return;
        }
        if (gameState.stepsTaken >= gameState.maxSteps) {
            await finishAutoDemoIfUnresolved(token, 'step_limit');
            return;
        }

        if (!gameState.isHostControllable) {
            setDemoStatus(`感染阶段 ${gameState.currentInfectionStage}：宿主暂时无法移动，等待中…`);
            await demoSleep(1200);
            continue;
        }

        const stepsRemaining = Math.max(0, gameState.maxSteps - gameState.stepsTaken);
        setDemoStatus(`宿主 AI 正在提前规划 ${stepsRemaining} 步回巢路线…`);
        const plan = await planHostMovesAI();
        if (!autoDemo.active || token !== autoDemo.token) return;
        if (plan.length === 0) {
            await finishAutoDemoIfUnresolved(token, 'host_plan_empty');
            return;
        }

        setDemoStatus(`宿主 AI 已规划 ${plan.length} 个动作，开始逐步演示…`);
        const playResult = await playHostPlan(plan, token);

        if (playResult === 'infected' || gameState.isInfectionMode) {
            await runInfectionDemoPhase(token);
            return;
        }
        if (playResult === 'stopped' || playResult === 'finished') return;
        if (isDemoGameEnded()) return;
    }

    await finishAutoDemoIfUnresolved(token, 'host_loop_completed');
}

function waitForDemoResult(token, maxMs) {
    return new Promise((resolve) => {
        const startedAt = Date.now();
        const intervalId = trackDemoTimer(setInterval(() => {
            if (!autoDemo.active || token !== autoDemo.token) {
                clearInterval(intervalId);
                resolve('stopped');
                return;
            }
            if (isDemoGameEnded()) {
                clearInterval(intervalId);
                resolve('finished');
                return;
            }
            if (Date.now() - startedAt >= maxMs) {
                clearInterval(intervalId);
                resolve('timeout');
            }
        }, 400));
    });
}

async function runInfectionDemoPhase(token) {
    if (!gameState.isInfectionMode || !autoDemo.active || token !== autoDemo.token) return;

    autoDemo.savedSimulationSpeed = gameState.simulationSpeed;
    gameState.isPaused = false;
    if (gameState.simulationTimer) {
        clearInterval(gameState.simulationTimer);
        gameState.simulationTimer = null;
    }

    setDemoStatus('已进入感染阶段：先生成 AI 局面解说…');
    showAutoDemoCommentaryPlaceholder();
    await demoSleep(600);

    if (autoDemo.active && token === autoDemo.token && gameState.isInfectionMode) {
        try {
            await generateAICommentary();
            setDemoStatus('AI 局面解说已生成，开始感染后宿主求生反应…');
        } catch (error) {
            if (!isDemoStoppedError(error)) {
                console.warn('演示模式 AI 解说失败:', error);
                showAutoDemoCommentaryPlaceholder(`AI 局面解说暂时不可用：${error.message || error}\n\n演示会继续进入感染后宿主求生阶段。`);
            }
        }
    }

    await demoSleep(2200);
    if (!autoDemo.active || token !== autoDemo.token || isDemoGameEnded()) return;

    gameState.simulationSpeed = getAutoDemoInfectionSpeedMs();
    gameState.isPaused = false;
    startInfectionLoop();

    const infectedHostOutcome = await runInfectedHostAIDemoLoop(token);
    if (!autoDemo.active || token !== autoDemo.token || isDemoGameEnded()) return;

    if (infectedHostOutcome === 'actions_completed') {
        setDemoStatus('感染后宿主 AI 已完成多轮求生反应，等待最终感染结算…');
    }

    const outcome = await waitForDemoResult(token, AUTO_DEMO_INFECTION_MAX_MS);
    if (outcome === 'timeout') {
        setDemoStatus('感染演示达到时长上限，正在自动结算胜负…');
        forceAutoDemoResult('timeout');
    } else if (outcome === 'finished') {
        setDemoStatus('AI 对 AI 演示结束，已产生胜负结果');
    }
}

async function runAutoDemoSequence(token) {
    setDemoStatus('准备 AI 对 AI 演示环境…');
    prepareAutoDemoGame();
    await demoSleep(700);

    setDemoStatus('真菌 AI：按公平规则调用 GLM-5，未读取宿主出生点…');
    startGame({ fromAutoDemo: true });
    clearInterval(gameState.timer);
    gameState.timer = null;
    if (timerDisplay) timerDisplay.classList.add('hidden');

    showLoading(true, '真菌 AI 正在公平布阵：不读取宿主出生点，只做区域覆盖…');
    const demoSporeContext = getSporeStrategyContext();
    try {
        await generateAISpores();
    } catch (error) {
        if (isDemoStoppedError(error)) throw error;
        console.warn('真菌 AI 失败，改用规则布阵:', error);
        clearSpores();
        normalizeSporeDeployments([], demoSporeContext).forEach((spore) => {
            gameState.spores.push(spore);
            renderSpore(spore);
        });
        autoDemo.lastSporeValidationSummary = `${autoDemo.lastSporeValidationSummary} GLM-5 暂不可用，已 fallback 到公平规则布阵。`;
        updateSporeCount();
    } finally {
        showLoading(false);
    }

    if (!autoDemo.active || token !== autoDemo.token) return;
    if (gameState.spores.length === 0) {
        normalizeSporeDeployments([], demoSporeContext).forEach((spore) => {
            gameState.spores.push(spore);
            renderSpore(spore);
        });
        updateSporeCount();
    }

    await demoSleep(1000);
    highlightDemoSpores();
    const validationText = autoDemo.lastSporeValidationSummary ? ` ${autoDemo.lastSporeValidationSummary}` : '';
    setDemoStatus(`真菌 AI 已公平部署 ${gameState.spores.length} 个孢子。${validationText} 宿主 AI 即将移动…`);
    await demoSleep(1200);
    confirmSporeDeployment();
    await demoSleep(800);
    await runHostAIDemoLoop(token);
    await finishAutoDemoIfUnresolved(token, 'sequence_completed');
}

async function startAutoDemo() {
    if (autoDemo.active) return;

    autoDemo.active = true;
    autoDemo.token += 1;
    autoDemo.speedMultiplier = 1;
    const token = autoDemo.token;
    clearDemoTimers();

    showDemoBanner(true);
    updateSpeedControlVisibility();
    setDemoButtonsDisabled(true);
    setDemoStatus('AI 对 AI 自动演示启动中…');

    try {
        await runAutoDemoSequence(token);
        if (autoDemo.active && token === autoDemo.token) {
            if (!isDemoGameEnded()) {
                await finishAutoDemoIfUnresolved(token, 'final_guard');
            }
            if (isDemoGameEnded()) {
                setDemoStatus('AI 对 AI 演示结束，已产生胜负结果');
            }
        }
    } catch (error) {
        if (!isDemoStoppedError(error)) {
            console.error('自动演示失败:', error);
            setDemoStatus(`演示出错：${error.message || error}`);
            if (scienceFact) {
                scienceFact.textContent = `⚠️ 自动演示失败：${error.message || error}`;
                scienceFact.classList.remove('hidden');
            }
        }
    } finally {
        if (token === autoDemo.token) {
            autoDemo.active = false;
            autoDemo.speedMultiplier = 1;
            setDemoButtonsDisabled(false);
            showLoading(false);
            updateSpeedControlVisibility();
        }
    }
}

function stopAutoDemo() {
    if (!autoDemo.active && autoDemo.timers.length === 0) {
        showDemoBanner(false);
        return;
    }

    autoDemo.active = false;
    autoDemo.token += 1;
    autoDemo.speedMultiplier = 1;
    clearDemoTimers();
    clearInterval(gameState.timer);
    gameState.timer = null;
    pauseSimulation();
    gameState.simulationSpeed = autoDemo.savedSimulationSpeed || 30000;
    clearAutoDemoHighlights();
    showLoading(false);
    showDemoBanner(false);
    updateSpeedControlVisibility();
    setDemoButtonsDisabled(false);
    setDemoStatus('演示已停止');
}

async function generateAICommentary() {
    if (!gameState.isInfectionMode) {
        if (!autoDemo.active) {
            alert('只有在宿主感染后（感染阶段）才能使用“局面解说”。');
        }
        return;
    }

    if (aiCommentaryBtn) aiCommentaryBtn.disabled = true;
    if (!autoDemo.active) {
        showLoading(true, 'AI 正在分析当前局面...');
    } else {
        setDemoStatus('感染阶段：AI 正在生成局面解说…');
    }

    const snapshot = buildAICommentarySnapshot();

    try {

        const prompt = `
你是一个“虫草菌感染对抗模拟器”的局面解说员与分析师。请基于我提供的“当前局面快照”做分析，并给出胜负预测与建议。

【重要规则（必须遵守）】
1) 只输出严格 JSON（一个对象），禁止输出任何额外文字、解释、Markdown、代码块。
2) 内容要面向玩家可读：短句、要点化、可执行建议。
3) 当前是“感染阶段”：胜负判定以你对局面与机制的理解为准，并给出置信度(0~1)。
4) 不要编造不存在的数据；只能使用快照里提供的信息与合理推断。
5) 额外产出一段“诙谐幽默的两句话描述”，必须恰好两句、中文、每句<=30字，不要使用表情符号。

【你要输出的 JSON 格式（严格）】
{
  "funny_two_liner": "第一句。第二句。",
  "situation_summary": "一句话总结（<=40字）",
  "analysis": ["要点1","要点2","要点3"],
  "prediction": {
    "winner": "fungus_or_host",
    "confidence": 0.0,
    "time_horizon": "预计还会持续多久（用天或阶段）",
    "why": ["原因1","原因2"]
  },
  "suggestions": {
    "host": ["宿主方可执行建议1","建议2","建议3"],
    "fungus": ["真菌方可执行建议1","建议2","建议3"]
  }
}

【当前局面快照 JSON】
${JSON.stringify(snapshot)}
`;

        const llmResp = await callLLM(prompt, { temperature: 0.35 });
        const text = extractTextFromLLMResponse(llmResp);
        const parsed = tryParseJsonObject(text) || tryParseJsonObject(JSON.stringify(llmResp));

        let contentText = '';
        if (parsed && typeof parsed === 'object') {
            const funny = (typeof parsed.funny_two_liner === 'string' && parsed.funny_two_liner.trim())
                ? parsed.funny_two_liner.trim()
                : buildFunnyTwoLiner(snapshot);
            const funnyBlock = funny ? `【当前局面】\n${funny}\n\n` : '';
            const summary = parsed.situation_summary ? `【概述】\n${parsed.situation_summary}\n\n` : '';
            const analysis = Array.isArray(parsed.analysis) ? `【分析要点】\n- ${parsed.analysis.join('\n- ')}\n\n` : '';
            const pred = parsed.prediction || {};
            const predLine =
                pred && typeof pred === 'object'
                    ? `【胜负预测】\n胜方：${pred.winner ?? '未知'}\n置信度：${pred.confidence ?? '未知'}\n时间尺度：${pred.time_horizon ?? '未知'}\n原因：${Array.isArray(pred.why) ? pred.why.join('；') : (pred.why ?? '未知')}\n\n`
                    : '';
            const sug = parsed.suggestions || {};
            const hostSug = Array.isArray(sug.host) ? `【宿主建议】\n- ${sug.host.join('\n- ')}\n\n` : '';
            const fungusSug = Array.isArray(sug.fungus) ? `【真菌建议】\n- ${sug.fungus.join('\n- ')}\n\n` : '';
            contentText = `${funnyBlock}${summary}${analysis}${predLine}${hostSug}${fungusSug}`.trim();
        } else {
            // 回退：直接展示模型输出文本
            const fallbackFunny = buildFunnyTwoLiner(snapshot);
            contentText = (`【当前局面】\n${fallbackFunny}\n\n` + ((text || '').trim() || 'AI 未返回可解析内容，请稍后再试。')).trim();
        }

        renderAICommentary(snapshot, contentText);
    } catch (error) {
        console.error('AI解说生成失败:', error);
        renderAICommentary(snapshot, buildLocalAICommentary(snapshot));
        if (autoDemo.active) {
            setDemoStatus('GLM-5 暂时不可用，已展示本地局面解说。');
        } else if (scienceFact) {
            scienceFact.textContent = '⚠️ GLM-5 暂时不可用，已展示本地局面解说。';
            scienceFact.classList.remove('hidden');
        }
    } finally {
        showLoading(false);
        if (aiCommentaryBtn) aiCommentaryBtn.disabled = false;
    }
}

async function checkRagHealth() {
    try {
        const res = await fetch(RAG_HEALTH_ENDPOINT);
        const data = await res.json();
        if (!res.ok) {
            throw new Error(data.message || data.error || `HTTP ${res.status}`);
        }
        if (ragAnswerMeta) {
            ragAnswerMeta.innerHTML = buildRagMetaDetailsHtml('状态信息', [
                ['状态', data.status || 'unknown'],
                ['来源', data.source || 'unknown'],
                ['集合', data.collection || 'unknown'],
                ['数量', data.count ?? 'unknown'],
                ['Embedding', data.embedding_model || 'unknown']
            ]);
        }
        if (ragAnswerContent) {
            ragAnswerContent.innerHTML = buildRagHealthHtml(data);
        }
        if (ragAnswerPanel) ragAnswerPanel.classList.remove('hidden');
    } catch (error) {
        if (ragAnswerMeta) ragAnswerMeta.textContent = 'RAG health check failed';
        if (ragAnswerContent) ragAnswerContent.textContent = String(error);
        if (ragAnswerPanel) ragAnswerPanel.classList.remove('hidden');
    }
}

function formatRagDiagnostics(data) {
    const diagnostics = data?.diagnostics || {};
    const lines = [];
    lines.push('【RAG 状态】');
    lines.push(`status: ${data?.status || 'unknown'}`);
    lines.push(`source: ${data?.source || 'unknown'}`);
    lines.push(`chroma_dir: ${data?.chroma_dir || diagnostics.chroma_dir || 'unknown'}`);
    lines.push(`collection: ${data?.collection || diagnostics.collection || 'unknown'}`);
    lines.push(`count: ${data?.count ?? diagnostics.collection_count ?? 'unknown'}`);
    lines.push(`embedding_model: ${data?.embedding_model || diagnostics.embedding_model || 'unknown'}`);
    lines.push(`embedding_available: ${diagnostics.embedding_available ?? 'unknown'}`);

    if (diagnostics.chroma_error) {
        lines.push(`chroma_error: ${diagnostics.chroma_error.type}: ${diagnostics.chroma_error.message}`);
    }
    if (diagnostics.embedding_error) {
        lines.push(`embedding_error: ${diagnostics.embedding_error.type}: ${diagnostics.embedding_error.message}`);
    }
    if (diagnostics.retrieval_error) {
        lines.push(`retrieval_error: ${diagnostics.retrieval_error.type}: ${diagnostics.retrieval_error.message}`);
    }
    if (diagnostics.glm_error) {
        lines.push(`glm_error: ${diagnostics.glm_error.type}: ${diagnostics.glm_error.message}`);
    }
    if (diagnostics.retrieval_warning) {
        lines.push(`retrieval_warning: ${diagnostics.retrieval_warning}`);
    }
    if (Array.isArray(diagnostics.local_fallback_files) && diagnostics.local_fallback_files.length) {
        lines.push(`local_fallback_files: ${diagnostics.local_fallback_files.join(', ')}`);
    }

    lines.push('');
    lines.push('【原始诊断 JSON】');
    lines.push(JSON.stringify(data, null, 2));
    return lines.join('\n');
}

function useRagExampleQuestion(question, shouldSubmit = false) {
    const normalizedQuestion = String(question || '').trim();
    if (!normalizedQuestion || !ragQuestionInput) return;

    ragQuestionInput.value = normalizedQuestion;
    ragQuestionInput.focus();

    if (shouldSubmit) {
        askRagQuestion();
    }
}

async function askRagQuestion() {
    const question = (ragQuestionInput?.value || '').trim();
    if (!question) {
        alert('请先输入一个关于 fungi 或 host 的问题。');
        return;
    }

    if (ragAskBtn) ragAskBtn.disabled = true;
    if (ragAnswerMeta) ragAnswerMeta.textContent = 'RAG 检索与回答生成中...';
    if (ragAnswerContent) ragAnswerContent.textContent = '';
    if (ragAnswerPanel) ragAnswerPanel.classList.remove('hidden');

    try {
        const res = await fetch(RAG_ASK_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ question, top_k: 5 })
        });

        const data = await res.json();
        if (!res.ok) {
            throw new Error(data.message || data.error || `HTTP ${res.status}`);
        }

        if (ragAnswerMeta) {
            ragAnswerMeta.innerHTML = buildRagMetaDetailsHtml('查询信息', [
                ['问题', data.question || question],
                ['来源', data.source || 'unknown'],
                ['证据', `${(data.retrieved || []).length} 条`],
                ['向量维度', data.query_vector_dim ?? 'unknown']
            ]);
        }

        if (ragAnswerContent) {
            ragAnswerContent.innerHTML = buildRagAnswerHtml(data);
        }
    } catch (error) {
        if (ragAnswerMeta) ragAnswerMeta.textContent = 'RAG 提问失败';
        if (ragAnswerContent) ragAnswerContent.textContent = String(error);
    } finally {
        if (ragAskBtn) ragAskBtn.disabled = false;
    }
}

function buildRagMetaDetailsHtml(summary, items) {
    const filteredItems = items.filter(([, value]) => value !== undefined && value !== null && value !== '');
    return [
        '<details class="rag-meta-details">',
        `<summary>${escapeHtml(summary)} <span>${filteredItems.length} 项</span></summary>`,
        '<div class="rag-meta-pill-row">',
        buildRagMetaHtml(filteredItems),
        '</div>',
        '</details>'
    ].join('');
}

function buildRagMetaHtml(items) {
    return items
        .filter(([, value]) => value !== undefined && value !== null && value !== '')
        .map(([label, value]) => (
            `<span class="rag-meta-pill"><strong>${escapeHtml(label)}</strong>${escapeHtml(value)}</span>`
        ))
        .join('');
}

function buildRagHealthHtml(data) {
    const diagnostics = data?.diagnostics || {};
    const rows = [
        ['ChromaDB 路径', data?.chroma_dir || diagnostics.chroma_dir || 'unknown'],
        ['Collection', data?.collection || diagnostics.collection || 'unknown'],
        ['知识片段数量', data?.count ?? diagnostics.collection_count ?? 'unknown'],
        ['Embedding 可用', diagnostics.embedding_available ?? 'unknown']
    ];

    ['chroma_error', 'embedding_error', 'retrieval_error', 'glm_error'].forEach((key) => {
        if (diagnostics[key]) {
            rows.push([key, `${diagnostics[key].type || 'Error'}: ${diagnostics[key].message || diagnostics[key]}`]);
        }
    });
    if (diagnostics.retrieval_warning) {
        rows.push(['retrieval_warning', diagnostics.retrieval_warning]);
    }
    if (Array.isArray(diagnostics.local_fallback_files) && diagnostics.local_fallback_files.length) {
        rows.push(['local_fallback_files', diagnostics.local_fallback_files.join(', ')]);
    }

    return [
        '<section class="rag-answer-card rag-health-card">',
        '<div class="rag-answer-card-title">RAG 状态</div>',
        '<dl class="rag-diagnostics-grid">',
        ...rows.map(([label, value]) => (
            `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`
        )),
        '</dl>',
        '</section>'
    ].join('');
}

function buildRagAnswerHtml(data) {
    const retrieved = data.retrieved || [];
    const html = [
        '<section class="rag-answer-card rag-answer-main">',
        '<div class="rag-answer-card-title">回答</div>',
        `<div class="rag-answer-body">${renderRagRichText(data.answer || '暂无回答')}</div>`,
        '</section>'
    ];

    if (data.diagnostics) {
        html.push(buildRagDiagnosticsHtml(data));
    }

    html.push('<details class="rag-answer-card rag-evidence-section">');
    html.push(`<summary class="rag-answer-card-title">检索证据 <span>${retrieved.length} 条</span></summary>`);
    if (!retrieved.length) {
        html.push('<p class="rag-empty-state">没有检索到相关知识片段。</p>');
    } else {
        html.push('<div class="rag-evidence-list">');
        retrieved.forEach((item, index) => {
            const metadata = item.metadata || {};
            const title = metadata.title || item.chunk_id || `知识片段 ${index + 1}`;
            const tags = normalizeRagTags(metadata.tags);
            html.push('<article class="rag-evidence-card">');
            html.push(`<div class="rag-evidence-title">${index + 1}. ${escapeHtml(title)}</div>`);
            html.push(`<div class="rag-evidence-source">${escapeHtml(formatRagSource(metadata))}</div>`);
            if (tags.length) {
                html.push(`<div class="rag-tag-row">${tags.map((tag) => `<span>${escapeHtml(tag)}</span>`).join('')}</div>`);
            }
            if (item.distance !== undefined && item.distance !== null) {
                html.push(`<div class="rag-distance">distance ${escapeHtml(formatRagDistance(item.distance))}</div>`);
            }
            html.push(`<div class="rag-evidence-document">${renderRagRichText(item.document || '')}</div>`);
            html.push('</article>');
        });
        html.push('</div>');
    }
    html.push('</details>');
    return html.join('');
}

function buildRagDiagnosticsHtml(data) {
    const diagnostics = data.diagnostics || {};
    const rows = [
        ['状态', data.source === 'chromadb' ? 'ok' : 'degraded'],
        ['来源', data.source || 'unknown'],
        ['Collection', diagnostics.collection || 'unknown'],
        ['知识片段数量', diagnostics.collection_count ?? 'unknown'],
        ['Embedding 模型', diagnostics.embedding_model || 'unknown'],
        ['ChromaDB 路径', diagnostics.chroma_dir || 'unknown']
    ];

    return [
        '<details class="rag-diagnostics-panel">',
        '<summary>诊断信息</summary>',
        '<dl class="rag-diagnostics-grid">',
        ...rows.map(([label, value]) => (
            `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`
        )),
        '</dl>',
        '</details>'
    ].join('');
}

function normalizeRagTags(tags) {
    if (Array.isArray(tags)) {
        return tags.map((tag) => String(tag).trim()).filter(Boolean);
    }
    return String(tags || '')
        .split(/[,，;；|]/)
        .map((tag) => tag.trim())
        .filter(Boolean);
}

function formatRagDistance(distance) {
    const numericDistance = Number(distance);
    return Number.isFinite(numericDistance) ? numericDistance.toFixed(4) : String(distance);
}

function renderRagRichText(value) {
    const lines = String(value || '').replace(/\r\n/g, '\n').split('\n');
    const html = [];
    let paragraph = [];
    let listType = null;
    let listItems = [];

    const flushParagraph = () => {
        if (!paragraph.length) return;
        const text = paragraph.join(' ');
        const className = isRagLeadSentence(text) ? ' class="rag-answer-lead"' : '';
        html.push(`<p${className}>${formatRagInline(text)}</p>`);
        paragraph = [];
    };
    const flushList = () => {
        if (!listType) return;
        html.push(`<${listType}>${listItems.map((item) => `<li>${formatRagInline(item)}</li>`).join('')}</${listType}>`);
        listType = null;
        listItems = [];
    };

    lines.forEach((rawLine) => {
        const line = rawLine.trim();
        if (!line) {
            flushParagraph();
            flushList();
            return;
        }

        const headingMatch = line.match(/^#{1,4}\s+(.+)$/);
        if (headingMatch) {
            flushParagraph();
            flushList();
            html.push(`<h4>${formatRagInline(headingMatch[1])}</h4>`);
            return;
        }

        const unorderedMatch = line.match(/^[-*]\s+(.+)$/);
        const orderedMatch = line.match(/^\d+[.)]\s+(.+)$/);
        if (unorderedMatch || orderedMatch) {
            flushParagraph();
            const nextType = unorderedMatch ? 'ul' : 'ol';
            if (listType && listType !== nextType) {
                flushList();
            }
            listType = nextType;
            listItems.push(unorderedMatch ? unorderedMatch[1] : orderedMatch[1]);
            return;
        }

        flushList();
        paragraph.push(line);
    });

    flushParagraph();
    flushList();
    return html.join('') || '<p>暂无内容。</p>';
}

function isRagLeadSentence(value) {
    const text = String(value || '').trim();
    return /^根据检索证据[，,]/.test(text);
}

function formatRagInline(value) {
    return escapeHtml(value)
        .replace(/`([^`]+)`/g, '<code>$1</code>')
        .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
        .replace(/__([^_]+)__/g, '<strong>$1</strong>')
        .replace(/\*([^*]+)\*/g, '<em>$1</em>');
}

// Restart game
function restartGame() {
    stopAutoDemo();
    resultScreen.classList.add('hidden');
    clearSpores();
    hideHostIndicator();
    startGame();
}

// Show science facts
async function showScienceFacts() {
    const target = resultScienceFacts || document.getElementById('result-science-facts');
    if (!target) return;

    target.classList.remove('hidden');
    target.innerHTML = '<div class="result-science-title">知识库科学事实</div><div class="result-science-loading">正在从 RAG 知识库检索相关文章与来源...</div>';

    const question = [
        `请基于知识库给出与 ${getFungusTypeName(gameState.fungusType)}、${getHostTypeName(gameState.hostType)}、${getEnvironmentName(gameState.environment)} 相关的科学事实。`,
        '重点解释真菌感染宿主、行为操控、death grip、孢子传播或宿主抵抗，并返回可用于课堂展示的依据。'
    ].join(' ');

    try {
        const res = await fetch(RAG_ASK_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ question, top_k: 4 })
        });
        const data = await res.json();
        if (!res.ok) {
            throw new Error(data.message || data.error || `HTTP ${res.status}`);
        }

        target.innerHTML = buildResultScienceFactsHtml(data);
    } catch (error) {
        target.innerHTML = [
            '<div class="result-science-title">知识库科学事实</div>',
            `<div class="result-science-error">RAG 知识库暂时不可用：${escapeHtml(String(error))}</div>`
        ].join('');
    }
}

function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function formatRagSource(metadata = {}) {
    const sourceTitles = metadata.source_titles || metadata.title || '';
    const sourceIds = metadata.source_ids || metadata.source || '';
    const pieces = [];
    if (sourceTitles) pieces.push(`source_titles: ${sourceTitles}`);
    if (sourceIds) pieces.push(`source_ids: ${sourceIds}`);
    if (metadata.topic) pieces.push(`topic: ${metadata.topic}`);
    return pieces.length ? pieces.join(' | ') : 'source: unknown';
}

function buildResultScienceFactsHtml(data) {
    const retrieved = data.retrieved || [];
    const lines = [];
    lines.push('<div class="result-science-title">知识库科学事实</div>');
    lines.push(`<div class="result-science-meta">source: ${escapeHtml(data.source || 'unknown')} | 检索条数: ${retrieved.length}</div>`);
    lines.push('<div class="result-science-answer">');
    lines.push('<strong>回答摘要</strong>');
    lines.push(`<p>${escapeHtml(data.answer || '暂无回答')}</p>`);
    lines.push('</div>');

    lines.push('<div class="result-science-evidence">');
    lines.push('<strong>RAG 文章与 source</strong>');
    if (!retrieved.length) {
        lines.push('<p>没有检索到相关文章。</p>');
    } else {
        retrieved.forEach((item, index) => {
            const metadata = item.metadata || {};
            lines.push('<article class="result-science-card">');
            lines.push(`<div class="result-science-card-title">${index + 1}. ${escapeHtml(metadata.title || item.chunk_id || '知识片段')}</div>`);
            lines.push(`<div class="result-science-source">${escapeHtml(formatRagSource(metadata))}</div>`);
            lines.push(`<p>${escapeHtml(item.document || '').slice(0, 520)}</p>`);
            lines.push('</article>');
        });
    }
    lines.push('</div>');
    return lines.join('');
}

// Return to setup
function returnToSetup() {
    stopAutoDemo();
    resultScreen.classList.add('hidden');
    gameSection.classList.add('hidden');
    setupSection.classList.remove('hidden');
    if (notesSection) notesSection.classList.remove('hidden');
    clearSpores();
    hideHostIndicator();
    navigateToSection('setup-section');
}

// Hide host indicator
function hideHostIndicator() {
    hostIndicator.classList.add('hidden');
}

// Handle window resize for host indicator positioning
window.addEventListener('resize', () => {
    if (!hostIndicator.classList.contains('hidden')) {
        updateHostIndicator();
    }
    if (!nestIndicator.classList.contains('hidden')) {
        updateNestIndicator();
    }
    // Update all food positions on resize
    gameState.foodItems.forEach(food => {
        const foodElement = document.getElementById(food.id);
        if (foodElement) {
            const grid = document.querySelector(`#layer-${food.layer} .grid`);
            if (grid) {
                const rect = grid.getBoundingClientRect();
                const left = (rect.width * food.x / 100);
                const top = (rect.height * food.y / 100);
                foodElement.style.left = `${left}px`;
                foodElement.style.top = `${top}px`;
            }
        }
    });
});

// Change host layer with controllability check
function changeLayer(direction) {
    // Check if host is controllable
    if (!gameState.isHostControllable) {
        if (scienceFact) {
            scienceFact.textContent = '⚠️ 第4阶段：宿主暂时无法移动！';
            scienceFact.classList.remove('hidden');
            setTimeout(() => {
                if (scienceFact) {
                    scienceFact.classList.add('hidden');
                }
            }, 2000);
        }
        return;
    }
    
    const newLayer = gameState.hostPosition.layer + direction;
    if (newLayer >= 0 && newLayer <= 2) {
        // Moving between layers costs 3 steps
        gameState.stepsTaken += 3;
        if (stepCountElement) {
            stepCountElement.textContent = gameState.stepsTaken;
        }
        
        gameState.hostPosition.layer = newLayer;
        updateHostIndicator();
        
        // Update layer display
        if (currentLayerElement) {
            const layerNames = ['地面层', '植被层', '树冠层'];
            currentLayerElement.textContent = layerNames[newLayer] || '地面层';
        }
        
        // Check for spore encounter after layer change
        if (!gameState.isInfectionMode && checkForSporeAtPosition(gameState.hostPosition)) {
            enterInfectionMode();
            return;
        }
        
        // Check if steps exceeded - enter survival mode instead of defeat
        if (!gameState.isInfectionMode && gameState.stepsTaken >= gameState.maxSteps) {
            // Show warning for automatic survival mode
            if (scienceFact) {
                scienceFact.textContent = '⚠️ 规避失败！宿主未能在15步内抵达巢穴，自动进入感染生存模式。';
                scienceFact.classList.remove('hidden');
                
                // Auto-hide the warning after 5 seconds
                setTimeout(() => {
                    if (scienceFact) {
                        scienceFact.classList.add('hidden');
                    }
                }, 5000);
            }
            
            // Automatically enter survival mode when step limit is reached
            enterInfectionMode();
            return;
        }
        
        // If already infected, check for additional step-based survival time reduction
        if (gameState.isInfectionMode) {
            checkInfectedStepPenalty();
        }
    }
}

// Check for step-based survival time penalty when infected
function checkInfectedStepPenalty() {
    // Every 3 steps after infection reduces survival time by 0.5 days
    const stepsSinceInfection = gameState.stepsTaken - gameState.infectionStep; // Need to track infection step
    const penaltyCycles = Math.floor(stepsSinceInfection / 3);

    // 只在 penaltyCycles 增加时扣除一次生命值，避免重复扣减
    const deltaCycles = penaltyCycles - (gameState.infectionPenaltyCyclesApplied || 0);
    if (deltaCycles <= 0) return;
    gameState.infectionPenaltyCyclesApplied = penaltyCycles;

    const penaltyDays = deltaCycles * 0.5;
    gameState.infectionHealthDays = Math.max(0, gameState.infectionHealthDays - penaltyDays);

    if (healthDaysElement) {
        healthDaysElement.textContent = gameState.infectionHealthDays.toFixed(1);
    }
    updateRealTimeDisplay(Math.max(0, gameState.infectionGoalDays - gameState.infectionDaysSurvived));

    // Check for defeat due to step penalties
    if (gameState.infectionHealthDays <= 0) {
        clearInterval(gameState.simulationTimer);
        showResult('fungus_victory', '感染胜利！宿主因过度移动耗尽生命值', {
            steps: gameState.stepsTaken,
            strategy: '感染'
        });
    }
}

// Get detailed stage information based on fungus type
function getStageInfo(stage, fungusType = 'unilateralis', hostType = 'camponotus') {
    // Check if this is the ghost moth + alpine meadow combo (special case)
    const isGhostMothSpecial = (hostType === 'ghost_moth' && gameState.environment === 'alpine_meadow');
    
    const stages = {
        unilateralis: {
            1: {
                name: '孢子附着',
                time: '第0天 00:00',
                realTime: '0秒',
                description: '机制：孢子先黏附在体表角质层并开始萌发；表现：宿主外观几乎正常；课堂讲点：感染起点是“接触+附着”，不是立刻行为失控。'
            },
            2: {
                name: '体壁穿透',
                time: '第0天 12:00',
                realTime: '15秒',
                description: '机制：菌丝分泌酶并结合机械压力穿透体壁，进入体腔；表现：个体活性轻度下降；课堂讲点：这是“突破宿主屏障”的关键窗口。'
            },
            3: {
                name: '潜伏扩增期',
                time: '第1-3天',
                realTime: '15秒-1分30秒',
                description: '机制：真菌在体内扩增并重塑代谢环境；表现：节律紊乱、偶发抽动；课堂讲点：潜伏期不等于静止期，体内变化在持续累积。'
            },
            4: {
                name: '行为操控',
                time: '第4天 06:00',
                realTime: '2分钟',
                description: '机制：真菌代谢物干扰神经/肌肉协同；表现：宿主开始偏离原觅食路径；课堂讲点：行为操控强调“概率与趋势”，不是绝对命令。'
            },
            5: {
                name: '异常移动',
                time: '第4天 12:00',
                realTime: '2分15秒',
                description: '机制：运动策略转向利于真菌繁殖的微环境；表现：持续攀爬、定位叶脉附近；课堂讲点：把“温湿度与传播效率”联系起来讲。'
            },
            6: {
                name: '死亡紧咬',
                time: '第4天 18:00',
                realTime: '2分30秒',
                description: '机制：下颚肌群功能失衡并形成强咬附固定；表现：倒挂/紧咬叶脉；课堂讲点：固定位置是后续子实体发育的工程条件。'
            },
            7: {
                name: '宿主死亡',
                time: '第5天 00:00',
                realTime: '2分45秒',
                description: '机制：宿主死亡后菌丝继续侵入软组织并加固外壳；表现：行为终止；课堂讲点：死亡不是终点，而是繁殖阶段开始。'
            },
            8: {
                name: '孢子释放',
                time: '第7天 12:00',
                realTime: '3分45秒',
                description: '机制：子实体成熟并释放孢子完成传播；表现：局部区域可形成高密度感染点；课堂讲点：从个体过程上升到生态传播循环。'
            }
        },
        sinensis: {
            1: {
                name: '孢子附着',
                time: '第0天 00:00',
                realTime: '0秒',
                description: '机制：孢子附着在鳞翅目幼虫体表并等待侵入机会；表现：早期体表无明显可见变化；课堂讲点：先强调宿主边界（幼虫而非蚂蚁）。'
            },
            2: {
                name: '体壁穿透',
                time: '第0天 12:00',
                realTime: '15秒',
                description: '机制：菌丝进入幼虫体内并建立定殖位点；表现：取食和活动缓慢下降；课堂讲点：这是“寄生建立”而非行为操控阶段。'
            },
            3: {
                name: '潜伏生长期',
                time: '第1-3天',
                realTime: '15秒-1分30秒',
                description: '机制：真菌持续利用宿主营养并扩增；表现：幼虫在土中活动减少但不出现叶脉紧咬；课堂讲点：与僵尸蚂蚁模型做对照。'
            },
            4: { name: '行为操控', time: '跳过', realTime: '❌ 跳过', description: '该类型不以行为操控为核心表型；课堂讲点：不能把所有虫草都讲成“脑控”。', skipped: true },
            5: { name: '异常移动', time: '跳过', realTime: '❌ 跳过', description: '无典型“异常攀爬-定位”行为链；课堂讲点：宿主不同，行为证据链也不同。', skipped: true },
            6: { name: '死亡紧咬', time: '跳过', realTime: '❌ 跳过', description: '无叶脉紧咬固定现象；课堂讲点：不要混用 O. unilateralis 的标志行为。', skipped: true },
            7: {
                name: '宿主死亡',
                time: '第6天 00:00',
                realTime: '3分钟',
                description: '机制：宿主死亡后菌丝充填并改造虫体；表现：形成“虫体基底”；课堂讲点：说明“冬虫”与“夏草”是同一生命周期不同相位。'
            },
            8: {
                name: '孢子释放',
                time: '第12天 00:00',
                realTime: '6分钟',
                description: '机制：子实体成熟后释放孢子进入下一轮传播；表现：可见“独角”样结构；课堂讲点：强调环境季节性与资源保护。'
            }
        },
        ghost_moth_special: {
            1: {
                name: '孢子附着',
                time: '第0天 00:00',
                realTime: '0秒',
                description: '机制：孢子附着在鬼天蛾幼虫体表；表现：初期仍可正常蠕动；课堂讲点：这是高山生态位下的感染起点。'
            },
            2: {
                name: '体壁穿透',
                time: '第0天 12:00',
                realTime: '15秒',
                description: '机制：菌丝进入幼虫体内并适应低温环境；表现：活动降低、代谢被占用；课堂讲点：环境温度会改变进程速度。'
            },
            3: {
                name: '潜伏生长期',
                time: '第1-3天',
                realTime: '15秒-1分30秒',
                description: '机制：真菌缓慢扩增并与宿主组织共存一段时间；表现：幼虫活动衰减；课堂讲点：强调“慢变量”与季节同步。'
            },
            4: { name: '行为操控', time: '跳过', realTime: '❌ 跳过', description: '该组合不出现典型行为操控链；课堂讲点：不要套用蚂蚁模型。', skipped: true },
            5: { name: '异常移动', time: '跳过', realTime: '❌ 跳过', description: '无异常攀爬定位行为；课堂讲点：宿主生态位决定可观察现象。', skipped: true },
            6: { name: '死亡紧咬', time: '跳过', realTime: '❌ 跳过', description: '不存在“咬附固定”行为；课堂讲点：区分行为表型与组织表型。', skipped: true },
            7: {
                name: '宿主死亡',
                time: '第6天 00:00',
                realTime: '3分钟',
                description: '机制：幼虫死亡后菌丝占据虫体；表现：形成后续子实体基底；课堂讲点：这是“冬虫”相位完成。'
            },
            8: {
                name: '"独角"子实体生长',
                time: '第12天 00:00',
                realTime: '6分钟',
                description: '机制：次季节形成子实体并释放孢子；表现：可见“草”相位；课堂讲点：完整解释“冬虫夏草”命名来源。'
            }
        }
    };
    
    // Determine which stage set to use
    let stageSet;
    if (isGhostMothSpecial) {
        stageSet = stages.ghost_moth_special;
    } else if (fungusType === 'sinensis') {
        stageSet = stages.sinensis;
    } else {
        stageSet = stages.unilateralis;
    }
    
    return stageSet[stage] || { name: `阶段${stage}`, time: '未知', realTime: '未知', description: '未知阶段' };
}

// Get infection stage description
function getStageDescription(stage) {
    const stageInfo = getStageInfo(stage, gameState.fungusType, gameState.hostType);
    return `阶段${stage}: ${stageInfo.name} - ${stageInfo.description}`;
}

// Show/Hide all stage introductions for current fungus/host setting
function toggleStageGuide() {
    const panel = document.getElementById('stage-guide-panel');
    const content = document.getElementById('stage-guide-content');
    const btn = document.getElementById('stage-guide-btn');
    if (!panel || !content) return;

    const isHidden = panel.classList.contains('hidden');
    if (!isHidden) {
        panel.classList.add('hidden');
        if (btn) btn.textContent = '📚 阶段详解';
        return;
    }

    renderStageGuidePanel('正在使用本地说明初始化...');
    panel.classList.remove('hidden');
    if (btn) btn.textContent = '📚 收起详解';
    hydrateStageGuideWithRAG();
}

// Calculate stage duration based on fungus type
function getStageDurations(fungusType = 'unilateralis', hostType = 'camponotus') {
    const isGhostMothSpecial = (hostType === 'ghost_moth' && gameState.environment === 'alpine_meadow');
    
    if (isGhostMothSpecial || fungusType === 'sinensis') {
        // O. sinensis timeline: total 6 minutes (360 seconds) for 8 stages
        // But stages 4,5,6 are skipped, so we have 5 active stages
        return {
            totalDuration: 360000, // 6 minutes in milliseconds
            stageDurations: [0, 15000, 75000, 90000, 0, 0, 0, 180000] // Custom durations for each stage
        };
    } else {
        // O. unilateralis timeline: total 3 minutes 45 seconds (225 seconds) for 8 stages
        const baseDuration = 225000 / 8; // ~28.125 seconds per stage
        return {
            totalDuration: 225000,
            stageDurations: Array(8).fill(baseDuration)
        };
    }
}

// Update infection stage display with detailed information
function updateInfectionStageDisplay() {
    if (infectionStageElement && stageNumberElement) {
        infectionStageElement.classList.remove('hidden');
        stageNumberElement.textContent = gameState.currentInfectionStage;
        
        // Show detailed stage information as warning
        const stageInfo = getStageInfo(gameState.currentInfectionStage, gameState.fungusType, gameState.hostType);
        let warningText = `⚠️ 阶段${gameState.currentInfectionStage}: ${stageInfo.name}\n`;
        warningText += `时间: ${stageInfo.time} (${stageInfo.realTime})\n`;
        warningText += `${stageInfo.description}`;
        
        if (scienceFact) {
            scienceFact.innerHTML = warningText.replace(/\n/g, '<br>');
            scienceFact.classList.remove('hidden');
            
            // Auto-hide after 9 seconds for detailed info
            setTimeout(() => {
                if (scienceFact) {
                    scienceFact.classList.add('hidden');
                }
            }, 9000);
        }

        enrichCurrentStageWithRAG(gameState.currentInfectionStage);

        // Keep stage guide panel in sync if user has it open
        const stageGuidePanel = document.getElementById('stage-guide-panel');
        if (stageGuidePanel && !stageGuidePanel.classList.contains('hidden')) {
            renderStageGuidePanel('正在根据当前阶段刷新知识库补充...');
            hydrateStageGuideWithRAG();
        }
        
        // Handle stage-specific effects
        if (gameState.currentInfectionStage === 4) {
            const stage4Info = getStageInfo(4, gameState.fungusType, gameState.hostType);
            if (stage4Info.skipped) {
                // Stage 4 is skipped for O. sinensis, so don't disable controls
                gameState.isHostControllable = true;
                if (movementControls) {
                    movementControls.classList.remove('disabled');
                }
            } else {
                // Stage 4: Host cannot be controlled for O. unilateralis
                gameState.isHostControllable = false;
                if (movementControls) {
                    movementControls.classList.add('disabled');
                }
            }
        } else {
            // Other stages: Host can be controlled (if not already disabled by other factors)
            gameState.isHostControllable = true;
            if (movementControls) {
                movementControls.classList.remove('disabled');
            }
        }
    }
}

// Advance to next infection stage with fungus-type awareness
function advanceInfectionStage() {
    if (gameState.currentInfectionStage >= 8) return;
    
    let nextStage = gameState.currentInfectionStage + 1;
    const stageInfo = getStageInfo(nextStage, gameState.fungusType, gameState.hostType);
    
    // Skip stages 4, 5, 6 for O. sinensis and ghost moth special
    if (stageInfo.skipped) {
        // Find next non-skipped stage
        while (nextStage <= 8) {
            const nextStageInfo = getStageInfo(nextStage, gameState.fungusType, gameState.hostType);
            if (!nextStageInfo.skipped) {
                break;
            }
            nextStage++;
        }
    }
    
    if (nextStage <= 8) {
        gameState.currentInfectionStage = nextStage;
        gameState.stageStartTime = Date.now();
        updateInfectionStageDisplay();
        
        // Check for stage 8 defeat
        if (gameState.currentInfectionStage === 8) {
            setTimeout(() => {
                clearInterval(gameState.simulationTimer);
                const isGhostMothSpecial = (gameState.hostType === 'ghost_moth' && gameState.environment === 'alpine_meadow');
                if (isGhostMothSpecial) {
                    showResult('fungus_victory', '感染胜利！珍贵的冬虫夏草"独角"子实体成功生长', {
                        stages: 8,
                        strategy: '冬虫夏草完整生命周期'
                    });
                } else if (gameState.fungusType === 'sinensis') {
                    showResult('fungus_victory', '感染胜利！冬虫夏草完成完整感染周期', {
                        stages: 8,
                        strategy: '冬虫夏草感染'
                    });
                } else {
                    showResult('fungus_victory', '感染胜利！宿主完成8阶段感染周期后死亡', {
                        stages: 8,
                        strategy: '完整感染周期'
                    });
                }
            }, 3000); // Longer delay to show stage 8 message
        }
    }
}

// Run infection simulation with fungus-type specific timing
function runInfectionSimulation() {
    if (gameState.isPaused || !gameState.isInfectionMode) return;
    
    const stageDurations = getStageDurations(gameState.fungusType, gameState.hostType);
    const isGhostMothSpecial = (gameState.hostType === 'ghost_moth' && gameState.environment === 'alpine_meadow');
    
    // For O. sinensis and ghost moth special, use custom timing
    if (isGhostMothSpecial || gameState.fungusType === 'sinensis') {
        // Use cumulative timing for accurate stage progression
        const cumulativeTimes = [0, 15000, 90000, 180000, 180000, 180000, 180000, 360000];
        let currentCumulativeTime = 0;
        let currentStage = 1;
        
        gameState.simulationTimer = setInterval(() => {
            const elapsedTime = Date.now() - gameState.stageStartTime;
            
            // Find current stage based on elapsed time
            let newStage = 1;
            for (let i = 0; i < cumulativeTimes.length; i++) {
                if (elapsedTime >= cumulativeTimes[i]) {
                    newStage = i + 1;
                } else {
                    break;
                }
            }
            
            // Skip stages 4,5,6 for sinensis
            if (gameState.fungusType === 'sinensis' || isGhostMothSpecial) {
                if (newStage >= 4 && newStage <= 6) {
                    newStage = 7; // Jump to stage 7
                }
            }
            
            if (newStage !== currentStage && newStage <= 8) {
                currentStage = newStage;
                gameState.currentInfectionStage = newStage;
                updateInfectionStageDisplay();
                
                if (newStage === 8) {
                    setTimeout(() => {
                        clearInterval(gameState.simulationTimer);
                        // Victory handled in updateInfectionStageDisplay
                    }, 3000);
                }
            }
            
            // Update survival days based on elapsed time
            const maxSurvivalDays = isGhostMothSpecial ? 12 : (gameState.fungusType === 'sinensis' ? 12 : 7.5);
            const survivalRatio = Math.min(1, elapsedTime / stageDurations.totalDuration);
            gameState.survivalDays = Math.max(0, maxSurvivalDays * (1 - survivalRatio));
            
            if (survivalDaysElement) {
                survivalDaysElement.textContent = gameState.survivalDays.toFixed(1);
            }
            updateRealTimeDisplay(gameState.survivalDays);
            
        }, 1000);
    } else {
        // Original O. unilateralis timing
        const stageDuration = stageDurations.totalDuration / 8;
        
        gameState.simulationTimer = setInterval(() => {
            const currentTime = Date.now();
            const timeSinceStageStart = currentTime - gameState.stageStartTime;
            
            // Check if it's time to advance to next stage
            if (timeSinceStageStart >= stageDuration && gameState.currentInfectionStage < 8) {
                advanceInfectionStage();
            }
            
            // Calculate survival days based on stages completed
            const stagesCompleted = gameState.currentInfectionStage - 1;
            const daysPassed = (stagesCompleted + timeSinceStageStart / stageDuration) * (7.5 / 8);
            gameState.survivalDays = Math.max(0, 7.5 - daysPassed);
            
            if (survivalDaysElement) {
                survivalDaysElement.textContent = gameState.survivalDays.toFixed(1);
            }
            updateRealTimeDisplay(gameState.survivalDays);
            
        }, 1000);
    }
}

// Check if nest is reachable within step limit
function isNestReachableInSteps(hostPos, nestPos, maxSteps, stepSize = 5) {
    const distance = calculateDistance(hostPos, nestPos);
    const minStepsNeeded = distance / stepSize;
    return minStepsNeeded <= maxSteps;
}

// Generate random position within map bounds
function generateRandomPosition() {
    const x = 10 + Math.random() * 80; // Keep within 10-90 range to avoid edges
    const y = 10 + Math.random() * 80;
    const layer = Math.floor(Math.random() * 3); // Random layer 0, 1, or 2
    return { x, y, layer };
}

// Generate nest position so that distance is in (minSteps, maxSteps]
function generateNestPositionInStepRange(hostPos, minStepsExclusive = 10, maxStepsInclusive = 15, stepSize = 5) {
    const minDistanceExclusive = minStepsExclusive * stepSize;
    const maxDistanceInclusive = maxStepsInclusive * stepSize;

    // 1) First try radial sampling around host (more natural)
    for (let attempts = 0; attempts < 300; attempts++) {
        const angle = Math.random() * Math.PI * 2;
        const r = minDistanceExclusive + 0.5 + Math.random() * (maxDistanceInclusive - minDistanceExclusive - 0.5);
        const x = hostPos.x + Math.cos(angle) * r;
        const y = hostPos.y + Math.sin(angle) * r;

        if (x < 10 || x > 90 || y < 10 || y > 90) continue;
        const d = calculateDistance(hostPos, { x, y });
        if (d > minDistanceExclusive && d <= maxDistanceInclusive) {
            return { x, y, layer: hostPos.layer };
        }
    }

    // 2) Fallback: brute-force random points inside map
    for (let attempts = 0; attempts < 1200; attempts++) {
        const candidate = generateRandomPosition();
        candidate.layer = hostPos.layer;
        const d = calculateDistance(hostPos, candidate);
        if (d > minDistanceExclusive && d <= maxDistanceInclusive) {
            return candidate;
        }
    }

    return null;
}

// Initialize random host and nest positions
function initializeRandomPositions() {
    // Rule: host and nest distance must be >10 steps and <=15 steps
    const stepSize = 5;
    const minStepsExclusive = 10;
    const maxStepsInclusive = 15;

    let generated = false;
    for (let attempts = 0; attempts < 200; attempts++) {
        const hostPos = generateRandomPosition();
        const nestPos = generateNestPositionInStepRange(hostPos, minStepsExclusive, maxStepsInclusive, stepSize);
        if (!nestPos) continue;
        gameState.hostPosition = hostPos;
        gameState.nestPosition = nestPos;
        generated = true;
        break;
    }

    // Rare fallback: deterministic center-based pair in valid range
    if (!generated) {
        gameState.hostPosition = { x: 50, y: 50, layer: 0 };
        gameState.nestPosition = { x: 50, y: 110 - (maxStepsInclusive * stepSize), layer: 0 }; // 35 -> 15 steps
    }
    
    console.log(`Host positioned at (${gameState.hostPosition.x.toFixed(1)}, ${gameState.hostPosition.y.toFixed(1)}, Layer ${gameState.hostPosition.layer})`);
    console.log(`Nest positioned at (${gameState.nestPosition.x.toFixed(1)}, ${gameState.nestPosition.y.toFixed(1)}, Layer ${gameState.nestPosition.layer})`);
    const distance = calculateDistance(gameState.hostPosition, gameState.nestPosition);
    console.log(`Distance: ${distance.toFixed(1)} units (${(distance / stepSize).toFixed(1)} steps)`);
}

// Initialize nest position to ensure minimum distance
function initializeNestPosition() {
    // This function is now replaced by initializeRandomPositions
    initializeRandomPositions();
}

// Convert survival days to real-time minutes and seconds
function convertDaysToRealTime(survivalDays) {
    // Game simulation speed: 30000ms per day = 30 seconds per day
    // So 1 day = 30 seconds real time
    const totalSeconds = survivalDays * 30;
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = Math.floor(totalSeconds % 60);
    
    if (minutes > 0) {
        return `${minutes}分${seconds}秒`;
    } else {
        return `${seconds}秒`;
    }
}

// Update real-time display
function updateRealTimeDisplay(survivalDays) {
    if (realTimeDisplay) {
        const realTimeText = convertDaysToRealTime(survivalDays);
        realTimeDisplay.textContent = realTimeText;
    }
    
    if (realTimeCounter) {
        realTimeCounter.classList.remove('hidden');
    }
}
