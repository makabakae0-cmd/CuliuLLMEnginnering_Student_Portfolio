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
let currentLayerElement;
let stepCountElement;
let infectionStageElement; // New element for infection stage display
let stageNumberElement; // New element for stage number
let stageTotalElement;
let infectionTimeComparisonElement;
let infectionNaturalTimeElement;
let infectionSimulationTimeElement;
let infectionTotalTimeElement;
let hostStepStatusElement;
let aiCommentaryBtn;
let aiCommentaryPanel;
let aiCommentaryMeta;
let aiCommentaryContent;
let loadingText;
let ragQuestionInput;
let ragAskBtn;
let ragAnswerPanel;
let ragAnswerMeta;
let ragAnswerContent;
let infectionSpeedBtn;
let autoDemoSpeedBtn;
const stageGuideRagCache = new Map();
let stageGuideHydrationToken = 0;
let scienceFactHideTimer = null;
let foodSerial = 0;
let resultScienceRequestToken = 0;

const ENVIRONMENTS = {
    rainforest: { name: '热带雨林' },
    monsoon_forest: { name: '热带季雨林' },
    temperate_forest: { name: '温带森林' },
    alpine_meadow: { name: '高山草甸' }
};

const V1_PAIRINGS = {
    unilateralis: {
        fungusName: 'O. unilateralis',
        hostType: 'camponotus',
        hostName: '木蚁（Camponotus）',
        preferredEnvironments: ['rainforest', 'monsoon_forest'],
        baseSporeCount: 9,
        baseSporeLabel: '9 个孢子',
        requiredContacts: 1,
        allowedLayers: [0, 1, 2],
        baseRequiredLayers: {},
        environmentBuffs: {
            rainforest: { count: 1, layer: 2, label: '额外高层孢子 +1' },
            monsoon_forest: { count: 1, layer: null, label: '额外普通孢子 +1' }
        }
    },
    kimflemingiae: {
        fungusName: 'O. kimflemingiae',
        hostType: 'camponotus',
        hostName: '木蚁（Camponotus castaneus）',
        preferredEnvironments: ['temperate_forest'],
        baseSporeCount: 10,
        baseSporeLabel: '10 个孢子',
        requiredContacts: 1,
        allowedLayers: [0, 1],
        baseRequiredLayers: {},
        environmentBuffs: {
            temperate_forest: { count: 1, layer: 1, label: '额外植被孢子 +1' }
        }
    },
    australis: {
        fungusName: 'O. australis',
        hostType: 'ponerine',
        hostName: '猛蚁（Ponerinae）',
        preferredEnvironments: ['rainforest'],
        baseSporeCount: 10,
        baseSporeLabel: '10 个孢子',
        requiredContacts: 1,
        allowedLayers: [0, 1],
        baseRequiredLayers: {},
        environmentBuffs: {
            rainforest: { count: 1, layer: 0, label: '额外地面孢子 +1' }
        }
    },
    metarhizium: {
        fungusName: 'M. anisopliae',
        hostType: 'atta',
        hostName: '切叶蚁（Atta）',
        preferredEnvironments: ['rainforest', 'monsoon_forest'],
        baseSporeCount: 12,
        baseSporeLabel: '12 个地面孢子',
        requiredContacts: 2,
        allowedLayers: [0],
        baseRequiredLayers: {},
        environmentBuffs: {
            rainforest: { count: 1, layer: 0, label: '额外地面孢子 +1' },
            monsoon_forest: { count: 1, layer: 0, label: '额外地面孢子 +1' }
        }
    },
    sinensis: {
        fungusName: 'O. sinensis',
        hostType: 'ghost_moth',
        hostName: '鬼天蛾幼虫（Thitarodes）',
        preferredEnvironments: ['alpine_meadow'],
        baseSporeCount: 12,
        baseSporeLabel: '12 个地面孢子',
        requiredContacts: 1,
        allowedLayers: [0],
        baseRequiredLayers: {},
        environmentBuffs: {
            alpine_meadow: { count: 1, layer: 0, label: '额外地面孢子 +1' }
        }
    }
};

function getPairing(fungusType = gameState?.fungusType || 'unilateralis') {
    return V1_PAIRINGS[fungusType] || V1_PAIRINGS.unilateralis;
}

function getPairMatch(fungusType = gameState?.fungusType || 'unilateralis', hostType = gameState?.hostType || 'camponotus') {
    const pairing = getPairing(fungusType);
    const compatible = pairing.hostType === hostType;
    const requiredContacts = pairing.requiredContacts + (compatible ? 0 : 1);
    return {
        compatible,
        requiredContacts,
        label: compatible
            ? `科学匹配 Buff：${requiredContacts} 次有效接触即可感染`
            : `不匹配 Debuff：缺乏可靠自然感染记录，游戏中需 ${requiredContacts} 次有效接触`
    };
}

function getSporeRule(fungusType = gameState.fungusType, environment = gameState.environment) {
    const pairing = getPairing(fungusType);
    const buff = pairing.environmentBuffs[environment] || null;
    const requiredLayerCounts = { ...pairing.baseRequiredLayers };
    if (buff && buff.layer !== null) {
        requiredLayerCounts[buff.layer] = (requiredLayerCounts[buff.layer] || 0) + buff.count;
    }
    return {
        targetCount: pairing.baseSporeCount + (buff?.count || 0),
        allowedLayers: pairing.allowedLayers.slice(),
        requiredLayerCounts,
        buff
    };
}

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
    foodItems: [],
    foodRefreshTimer: null,
    foodCollected: 0,
    hostPosition: { x: 0, y: 0, layer: 0 }, // Will be set randomly
    nestPosition: { x: 0, y: 0, layer: 0 }, // Will be set randomly
    stepsTaken: 0,
    maxSteps: 15,
    timer: null,
    timeRemaining: 60,
    simulationTimer: null,
    simulationSpeed: 30000,
    isPaused: false,
    isInfectionMode: false,
    sporesVisible: true,
    infectionStep: 0,
    currentInfectionStage: 0,
    stageStartTime: 0,
    stageElapsedMs: 0,
    isHostControllable: true,
    firstLayerChangeFree: true,
    groomUsed: false,
    pendingExposure: false,
    burrowArmed: false,
    burrowCooldownMoves: 0,
    groundDashArmed: false,
    groundDashUsed: false,
    sanitizeUsesRemaining: 0,
    exposureCount: 0
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
    currentLayerElement = document.getElementById('current-layer');
    stepCountElement = document.getElementById('step-count');
    infectionStageElement = document.getElementById('infection-stage');
    stageNumberElement = document.getElementById('stage-number');
    stageTotalElement = document.getElementById('stage-total');
    infectionTimeComparisonElement = document.getElementById('infection-time-comparison');
    infectionNaturalTimeElement = document.getElementById('infection-natural-time');
    infectionSimulationTimeElement = document.getElementById('infection-simulation-time');
    infectionTotalTimeElement = document.getElementById('infection-total-time');
    hostStepStatusElement = document.getElementById('host-step-status');
    aiCommentaryBtn = document.getElementById('ai-commentary-btn');
    aiCommentaryPanel = document.getElementById('ai-commentary-panel');
    aiCommentaryMeta = document.getElementById('ai-commentary-meta');
    aiCommentaryContent = document.getElementById('ai-commentary-content');
    loadingText = document.getElementById('loading-text');
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
    
    onFungusChange(document.getElementById('fungus-type')?.value || 'unilateralis');
    
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
            if (
                targetId !== 'game-section' &&
                gameSection &&
                !gameSection.classList.contains('hidden') &&
                gameState.currentPhase !== 'setup'
            ) {
                returnToSetup(targetId);
                return;
            }
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
            if (
                gameSection &&
                !gameSection.classList.contains('hidden') &&
                gameState.currentPhase !== 'setup'
            ) {
                returnToSetup('home-section');
                return;
            }
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
    if (!['host', 'infection'].includes(gameState.currentPhase)) return false;
    if (!gameState.isHostControllable) return false;
    if (gameState.currentPhase === 'infection' && gameState.isPaused) return false;
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

function updateEnvironmentOptions() {
    onEnvironmentChange(document.getElementById('environment-type')?.value || 'rainforest');
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

function onHostChange(hostType) {
    gameState.hostType = hostType || document.getElementById('host-type')?.value || gameState.hostType;
    updatePairMatchHint();
}

function onFungusChange(fungusType) {
    const pairing = getPairing(fungusType);
    const envSelect = document.getElementById('environment-type');

    gameState.fungusType = fungusType;

    if (envSelect && !pairing.preferredEnvironments.includes(envSelect.value)) {
        envSelect.value = pairing.preferredEnvironments[0];
    }
    document.body.classList.toggle('alpine-theme', fungusType === 'sinensis');
    updatePairMatchHint();
    onEnvironmentChange(envSelect?.value || pairing.preferredEnvironments[0]);
}

function updatePairMatchHint() {
    const hint = document.getElementById('setup-match-hint');
    const hostSelect = document.getElementById('host-type');
    if (hostSelect) gameState.hostType = hostSelect.value;
    if (!hint) return;

    const match = getPairMatch();
    hint.classList.toggle('setup-hint-success', match.compatible);
    hint.classList.toggle('setup-hint-warning', !match.compatible);
    hint.textContent = match.compatible
        ? `✓ ${match.label}`
        : `! ${match.label}；这是游戏平衡抽象，不代表真实跨宿主感染`;
}

function onEnvironmentChange(environment) {
    gameState.environment = environment;
    const pairing = getPairing();
    const status = document.getElementById('env-buff-status');
    const buff = pairing.environmentBuffs[environment];
    if (!status) return;

    status.classList.toggle('setup-hint-success', Boolean(buff));
    status.classList.toggle('setup-hint-warning', !buff);
    status.textContent = buff
        ? `✓ 典型自然环境：${buff.label}`
        : '! 非典型自然环境：不会获得环境 Buff';
}

function showScienceFact(message) {
    scienceFact.textContent = message;
    scienceFact.classList.remove('hidden');
}

function hideScienceFact() {
    if (scienceFactHideTimer) {
        clearTimeout(scienceFactHideTimer);
        scienceFactHideTimer = null;
    }
    scienceFact.innerHTML = '';
    scienceFact.classList.add('hidden');
}

// Side change handler
function onSideChange(side) {
    gameState.playerSide = side;
    
}

// Start the game
function startGame(options = {}) {
    if (autoDemo.active && !options.fromAutoDemo) return;
    resetInfectionArtifacts();
    const envSelect = document.getElementById('environment-type');
    const fungusSelect = document.getElementById('fungus-type');
    const hostSelect = document.getElementById('host-type');
    const sideSelect = document.getElementById('player-side');
    
    gameState.environment = envSelect.value;
    gameState.fungusType = fungusSelect.value;
    gameState.hostType = hostSelect.value;
    gameState.playerSide = sideSelect.value;
    resetV1HostAbilities();
    
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
    const rule = getSporeRule();
    if (!rule.allowedLayers.includes(layer)) {
        alert(`${getFungusTypeName(gameState.fungusType)} 不能在${['地面层', '植被层', '树冠层'][layer]}部署孢子。`);
        return;
    }
    if (gameState.spores.length >= rule.targetCount) {
        alert(`孢子数量已达上限（${rule.targetCount}个）`);
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
    if (gameState.fungusType === 'sinensis') {
        sporeElement.classList.add('spore-ghost-moth');
    }
    sporeElement.style.left = `${spore.x}%`;
    sporeElement.style.top = `${spore.y}%`;
    grid.appendChild(sporeElement);
}

// Update spore count display
function updateSporeCount() {
    sporeCountElement.textContent = gameState.spores.length;
    const limit = document.getElementById('spore-limit');
    if (limit) limit.textContent = getSporeRule().targetCount;
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
    const rule = getSporeRule();
    return {
        hostType: getHostTypeName(gameState.hostType),
        environment: getEnvironmentName(gameState.environment),
        fungusType: getFungusTypeName(gameState.fungusType),
        hostTypeKey: gameState.hostType,
        mapSize: { width: 100, height: 100 },
        layerNames: ['地面层', '植被层', '树冠层'],
        maxSteps: gameState.maxSteps,
        sporeCount: rule.targetCount,
        allowedLayers: rule.allowedLayers,
        requiredLayerCounts: rule.requiredLayerCounts,
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
    const allowedLayerText = context.allowedLayers.join('/');
    const prompt = `
你是一个虫草菌（Ophiocordyceps）部署策略专家。你的目标是在不知道宿主出生点的公平规则下，做区域覆盖式孢子布阵。

【地图与移动规则（关键）】
- 地图：100x100，3层（0=地面，1=植被，2=树冠）
- 宿主移动：每步沿上下左右移动（步长≈5），可切换层级
- 你只知道巢穴位置、地图规则、宿主类型、环境和真菌类型
- 公平性限制：不能预判、猜测或提前知道宿主出生点；不能输出依赖精确宿主出生点的布阵说明

【硬性约束（必须严格满足）】
1) 只输出 JSON，禁止输出任何解释/多余文字/Markdown/代码块标记。
2) 必须生成且仅生成 ${context.sporeCount} 个孢子：deployments 数组长度必须为 ${context.sporeCount}。
3) “未知出生点覆盖”：围绕巢穴外围、地图四个方向入口、不同层级做覆盖式布阵，不要围绕某个已知起点布雷。
4) “巢穴周边拦截”：至少 5 个孢子应分布在巢穴周边约 12~35 坐标单位的环形区域内，覆盖上下左右和斜向接近方向。
5) 只允许使用 layer ${allowedLayerText}；在允许多个图层时尽量分散。
6) 坐标范围：x、y 均为 0~100（可带 1 位小数），layer 只能是 0/1/2。
7) 反聚集：同一层内任意两个孢子之间的欧式距离尽量 ≥ 16（至少 ≥ 12），避免一团集中导致绕开很容易。
8) 避免重复：不同层间不能有重复的坐标。
9) 必须满足最低图层数量：${JSON.stringify(context.requiredLayerCounts)}。

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
{"deployments":[{"layer":0,"x":50.0,"y":50.0}, ... 共${context.sporeCount}个 ]}
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
    const rule = getSporeRule();
    return {
        nestPosition: {
            x: clampNumber(nestPosition.x, 0, 100, 70),
            y: clampNumber(nestPosition.y, 0, 100, 70),
            layer: normalizeLayer(nestPosition.layer, 0)
        },
        hostType: hostTypeKey,
        isGhostMoth: hostTypeKey === 'ghost_moth',
        targetCount: Number(context.sporeCount || rule.targetCount),
        allowedLayers: Array.isArray(context.allowedLayers) ? context.allowedLayers : rule.allowedLayers,
        requiredLayerCounts: context.requiredLayerCounts || rule.requiredLayerCounts
    };
}

function getPrimarySporeLayers(ctx) {
    if (ctx.allowedLayers.length === 1) return ctx.allowedLayers.slice();
    return [ctx.allowedLayers.includes(ctx.nestPosition.layer) ? ctx.nestPosition.layer : ctx.allowedLayers[0]];
}

function getOtherSporeLayers(primaryLayers, allowedLayers = [0, 1, 2]) {
    return allowedLayers.filter((layer) => !primaryLayers.includes(layer));
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
        if (!ctx.allowedLayers.includes(repaired.layer)) repaired.layer = ctx.allowedLayers[0];
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
    const otherLayers = getOtherSporeLayers(primaryLayers, ctx.allowedLayers);
    const targetLayers = [...primaryLayers, ...otherLayers];
    const coveragePattern = Array.from({ length: ctx.targetCount }, (_, index) => ({
        angle: (360 / ctx.targetCount) * index,
        radius: index % 3 === 0 ? 18 : (index % 3 === 1 ? 27 : 36)
    }));
    const spores = [];

    coveragePattern.forEach((point, index) => {
        const requiredLayers = Object.entries(ctx.requiredLayerCounts)
            .flatMap(([layer, count]) => Array(Number(count)).fill(Number(layer)));
        const layer = requiredLayers[index] ?? targetLayers[index % targetLayers.length];
        spores.push(repairSporeSpacing(buildCoverageSpore(layer, ctx, point.angle, point.radius), spores, ctx));
    });

    return spores.slice(0, ctx.targetCount).map((spore) => ({
        layer: spore.layer,
        x: round1(spore.x),
        y: round1(spore.y)
    }));
}

function balanceSporeLayers(spores, ctx) {
    let balanced = spores.map((spore) => ({
        ...spore,
        layer: ctx.allowedLayers.includes(spore.layer) ? spore.layer : ctx.allowedLayers[0]
    }));

    Object.entries(ctx.requiredLayerCounts).forEach(([layerText, required]) => {
        const layer = Number(layerText);
        let current = balanced.filter((spore) => spore.layer === layer).length;
        for (let index = balanced.length - 1; current < required && index >= 0; index--) {
            if (balanced[index].layer !== layer) {
                balanced[index] = { ...balanced[index], layer };
                current += 1;
            }
        }
    });

    if (ctx.allowedLayers.length === 1) return balanced;
    const layers = getLayerCounts(balanced);
    const occupiedLayers = Object.values(layers).filter((count) => count > 0).length;
    if (occupiedLayers > 1) return balanced;

    const primaryLayers = getPrimarySporeLayers(ctx);
    const otherLayers = getOtherSporeLayers(primaryLayers, ctx.allowedLayers);
    const targetLayers = [...primaryLayers, ...otherLayers].slice(0, 3);
    return balanced.map((spore, index) => (
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
            layer: ctx.allowedLayers.includes(normalizeLayer(item.layer, fallbackSpore.layer))
                ? normalizeLayer(item.layer, fallbackSpore.layer)
                : fallbackSpore.layer,
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

    while (normalized.length < ctx.targetCount) {
        const repaired = repairSporeSpacing(fallback[normalized.length % fallback.length], normalized, ctx);
        normalized.push({
            layer: repaired.layer,
            x: round1(repaired.x),
            y: round1(repaired.y)
        });
        repairedCount += 1;
    }

    let finalSpores = balanceSporeLayers(normalized.slice(0, ctx.targetCount), ctx);
    const defenseZoneCount = finalSpores.filter((spore) => isNearNestDefenseZone(spore, ctx)).length;
    if (defenseZoneCount < 5) {
        finalSpores = fallback;
        repairedCount += ctx.targetCount;
    }

    autoDemo.lastSporeValidationSummary = repairedCount > 0
        ? `公平布阵校验：未读取宿主出生点，已自动修复 ${repairedCount} 个布阵点，保证 ${ctx.targetCount} 个孢子符合配对图层规则。`
        : `公平布阵校验通过：未读取宿主出生点，${ctx.targetCount} 个孢子符合配对图层规则。`;

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
    const targetCount = getSporeRule().targetCount;
    const normalizedCurrent = normalizeSporeDeployments(gameState.spores, buildFungusAIStrategyContext());
    const alreadyValid = gameState.spores.length === targetCount &&
        normalizedCurrent.every((spore, index) => (
            spore.layer === gameState.spores[index].layer &&
            spore.x === round1(gameState.spores[index].x) &&
            spore.y === round1(gameState.spores[index].y)
        ));
    if (alreadyValid) return true;

    const originalCount = gameState.spores.length;
    const repairedSpores = normalizedCurrent;
    clearSpores();
    repairedSpores.forEach((spore) => {
        gameState.spores.push(spore);
        renderSpore(spore);
    });
    updateSporeCount();

    const message = originalCount === 0
        ? `已使用公平 fallback 自动生成 ${targetCount} 个孢子。`
        : `已将 ${originalCount} 个孢子自动修复/补齐为 ${targetCount} 个孢子。`;
    autoDemo.lastSporeValidationSummary = `${autoDemo.lastSporeValidationSummary || '公平布阵校验完成。'} ${message}`;
    if (!autoDemo.active && scienceFact) {
        scienceFact.textContent = message;
        scienceFact.classList.remove('hidden');
    }

    return gameState.spores.length === targetCount;
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
    updateV1RuleSummary();
    
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
            ensureValidSporeDeployment();
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
    currentPhase.textContent = '【宿主回巢】在步数归零前抵达巢穴';
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
    
    // Update layer display text based on current host layer
    if (currentLayerElement) {
        const layerNames = ['地面层', '植被层', '树冠层'];
        currentLayerElement.textContent = layerNames[gameState.hostPosition.layer] || '地面层';
    }
    
    gameState.stepsTaken = 0;
    updateHostStatusUI();
}

function resetV1HostAbilities() {
    gameState.stepsTaken = 0;
    gameState.isInfectionMode = false;
    gameState.isHostControllable = true;
    gameState.firstLayerChangeFree = gameState.hostType === 'camponotus';
    gameState.groomUsed = false;
    gameState.pendingExposure = false;
    gameState.burrowArmed = false;
    gameState.burrowCooldownMoves = 0;
    gameState.groundDashArmed = false;
    gameState.groundDashUsed = false;
    gameState.sanitizeUsesRemaining = gameState.hostType === 'atta' ? 2 : 0;
    gameState.exposureCount = 0;
}

function getStepsRemaining() {
    return Math.max(0, gameState.maxSteps - gameState.stepsTaken);
}

function updateV1RuleSummary() {
    const summary = document.getElementById('deployment-summary');
    const rule = getSporeRule();
    const match = getPairMatch();
    const buffText = rule.buff ? rule.buff.label : '无（非典型自然环境）';
    if (summary) {
        summary.textContent = [
            `真菌：${getFungusTypeName(gameState.fungusType)}`,
            `宿主：${getHostTypeName(gameState.hostType)}`,
            `环境：${getEnvironmentName(gameState.environment)}`,
            `基础孢子：${getPairing().baseSporeLabel}`,
            `可部署图层：${rule.allowedLayers.map((layer) => ['地面', '植被', '树冠'][layer]).join('／')}`,
            `环境 Buff：${buffText}`,
            `${match.compatible ? '配对 Buff' : '配对 Debuff'}：${match.label}`,
            '注：接触次数与不匹配组合均为游戏平衡抽象，不代表现实中的精确孢子剂量或自然感染记录。'
        ].join('\n');
    }
    updateSporeCount();
}

function updateHostStatusUI() {
    if (stepCountElement) stepCountElement.textContent = getStepsRemaining();
    const skillStatus = document.getElementById('host-skill-status');
    const burrowBtn = document.getElementById('burrow-btn');
    const groundDashBtn = document.getElementById('ground-dash-btn');
    const sanitizeBtn = document.getElementById('sanitize-btn');
    [burrowBtn, groundDashBtn, sanitizeBtn].forEach((button) => button?.classList.add('hidden'));

    if (gameState.currentPhase === 'infection') {
        hostStepStatusElement?.classList.add('hidden');
        if (skillStatus) {
            skillStatus.textContent = gameState.isPaused
                ? `感染观察已暂停｜已收集食物 ${gameState.foodCollected || 0}`
                : `感染观察移动：方向键或 WASD 自由移动，不消耗回巢步数｜已收集食物 ${gameState.foodCollected || 0}`;
        }
        return;
    }

    hostStepStatusElement?.classList.remove('hidden');

    if (gameState.hostType === 'camponotus') {
        if (skillStatus) {
            skillStatus.textContent = `Groom：${gameState.groomUsed ? '已使用' : '可使用'}｜首次切层：${gameState.firstLayerChangeFree ? '免费' : '已使用'}｜有效接触：${gameState.exposureCount}/${getPairMatch().requiredContacts}`;
        }
    } else if (gameState.hostType === 'ponerine') {
        if (skillStatus) {
            skillStatus.textContent = `Ground Dash：${gameState.groundDashUsed ? '已使用' : (gameState.groundDashArmed ? '已选择方向模式' : '可使用')}｜不能进入树冠｜有效接触：${gameState.exposureCount}/${getPairMatch().requiredContacts}`;
        }
        if (groundDashBtn) {
            groundDashBtn.classList.remove('hidden');
            groundDashBtn.disabled = gameState.groundDashUsed;
            groundDashBtn.classList.toggle('active', gameState.groundDashArmed);
        }
    } else if (gameState.hostType === 'atta') {
        if (skillStatus) {
            skillStatus.textContent = `Sanitize：剩余 ${gameState.sanitizeUsesRemaining}/2 次（每次消耗 1 步）｜有效接触：${gameState.exposureCount}/${getPairMatch().requiredContacts}`;
        }
        if (sanitizeBtn) {
            sanitizeBtn.classList.remove('hidden');
            sanitizeBtn.disabled = gameState.sanitizeUsesRemaining <= 0;
        }
    } else {
        const cooldown = gameState.burrowCooldownMoves;
        if (skillStatus) {
            skillStatus.textContent = cooldown > 0
                ? `Burrow：冷却中（还需普通移动 ${cooldown} 次）｜有效接触：${gameState.exposureCount}/${getPairMatch().requiredContacts}`
                : `Burrow：${gameState.burrowArmed ? '已选择方向模式' : '可使用'}｜有效接触：${gameState.exposureCount}/${getPairMatch().requiredContacts}`;
        }
        if (burrowBtn) {
            burrowBtn.classList.remove('hidden');
            burrowBtn.disabled = cooldown > 0;
            burrowBtn.classList.toggle('active', gameState.burrowArmed);
        }
    }
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
    const isInfectionMove = canInfectedHostAct();
    if (!canHostAct() && !isInfectionMove) return;
    const isBurrow = !isInfectionMove && gameState.hostType === 'ghost_moth' && gameState.burrowArmed;
    const isGroundDash = !isInfectionMove && gameState.hostType === 'ponerine' && gameState.groundDashArmed;
    const distance = (isBurrow || isGroundDash) ? 10 : 5;
    const projected = projectDirectionalMove(gameState.hostPosition, direction, distance);
    if (projected.x === gameState.hostPosition.x && projected.y === gameState.hostPosition.y) {
        showScienceFact('不能越过地图边界。');
        return;
    }
    if (isBurrow && burrowCrossesNest(gameState.hostPosition, projected)) {
        showScienceFact('Burrow 不能直接穿过巢穴。');
        return;
    }

    gameState.hostPosition = projected;
    if (isInfectionMove) {
        updateHostIndicator();
        if (checkForFoodAtPosition()) gameState.foodCollected += 1;
        updateHostStatusUI();
        return;
    }

    gameState.stepsTaken += 1;
    if (isBurrow) {
        gameState.burrowArmed = false;
        gameState.burrowCooldownMoves = 3;
    } else if (isGroundDash) {
        gameState.groundDashArmed = false;
        gameState.groundDashUsed = true;
    } else if (gameState.hostType === 'ghost_moth' && gameState.burrowCooldownMoves > 0) {
        gameState.burrowCooldownMoves -= 1;
    }
    updateHostIndicator();
    updateHostStatusUI();
    settleHostAction();
}

function canHostAct() {
    return gameState.currentPhase === 'host' &&
        gameState.isHostControllable &&
        !gameState.isInfectionMode &&
        gameState.stepsTaken < gameState.maxSteps;
}

function canInfectedHostAct() {
    return gameState.currentPhase === 'infection' &&
        gameState.isInfectionMode &&
        gameState.isHostControllable &&
        !gameState.isPaused;
}

function projectDirectionalMove(position, direction, distance = 5) {
    const projected = { ...position };
    if (direction === 'up') projected.y = Math.max(0, position.y - distance);
    if (direction === 'down') projected.y = Math.min(100, position.y + distance);
    if (direction === 'left') projected.x = Math.max(0, position.x - distance);
    if (direction === 'right') projected.x = Math.min(100, position.x + distance);
    return projected;
}

function burrowCrossesNest(start, finish) {
    if (start.layer !== gameState.nestPosition.layer) return false;
    return distanceToSegment(gameState.nestPosition, start, finish) < 3 &&
        calculateDistance(finish, gameState.nestPosition) >= 8;
}

function activateBurrow() {
    if (gameState.hostType !== 'ghost_moth' || !canHostAct()) return;
    if (gameState.burrowCooldownMoves > 0) {
        showScienceFact(`Burrow 冷却中，还需普通移动 ${gameState.burrowCooldownMoves} 次。`);
        return;
    }
    gameState.burrowArmed = !gameState.burrowArmed;
    updateHostStatusUI();
    showScienceFact(gameState.burrowArmed ? 'Burrow 已准备：请选择一个移动方向。' : '已取消 Burrow。');
}

function activateGroundDash() {
    if (gameState.hostType !== 'ponerine' || !canHostAct() || gameState.groundDashUsed) return;
    if (gameState.hostPosition.layer !== 0) {
        showScienceFact('Ground Dash 只能在地面层使用。');
        return;
    }
    gameState.groundDashArmed = !gameState.groundDashArmed;
    updateHostStatusUI();
    showScienceFact(gameState.groundDashArmed ? 'Ground Dash 已准备：请选择一个移动方向。' : '已取消 Ground Dash。');
}

function rerenderSpores() {
    document.querySelectorAll('.spore').forEach((element) => element.remove());
    gameState.spores.forEach(renderSpore);
    toggleSporeVisibility(gameState.currentPhase === 'fungus' && gameState.sporesVisible);
    updateSporeCount();
}

function removeNearestSporeWithin(radius = 10) {
    let nearestIndex = -1;
    let nearestDistance = Infinity;
    gameState.spores.forEach((spore, index) => {
        if (spore.layer !== gameState.hostPosition.layer) return;
        const distance = calculateDistance(spore, gameState.hostPosition);
        if (distance <= radius && distance < nearestDistance) {
            nearestDistance = distance;
            nearestIndex = index;
        }
    });
    if (nearestIndex < 0) return false;
    gameState.spores.splice(nearestIndex, 1);
    rerenderSpores();
    return true;
}

function activateSanitize() {
    if (gameState.hostType !== 'atta' || !canHostAct() || gameState.sanitizeUsesRemaining <= 0) return;
    if (!removeNearestSporeWithin(10)) {
        showScienceFact('当前或相邻位置没有可清除的孢子，本次 Sanitize 未消耗。');
        return;
    }
    gameState.sanitizeUsesRemaining -= 1;
    gameState.stepsTaken += 1;
    updateHostStatusUI();
    showScienceFact('Sanitize 已清除当前或相邻位置的 1 个孢子，并消耗 1 步。');
    settleHostAction();
}

function settleHostAction() {
    if (calculateDistance(gameState.hostPosition, gameState.nestPosition) < 8) {
        showResult('host_victory', '宿主胜利！在步数归零前安全抵达巢穴', {
            steps: gameState.stepsTaken,
            strategy: '规避'
        });
        return;
    }

    if (checkForSporeAtPosition(gameState.hostPosition) && resolveSporeExposure()) return;

    if (gameState.stepsTaken >= gameState.maxSteps) {
        showResult('fungus_victory', '真菌胜利！宿主步数归零仍未抵达巢穴', {
            steps: gameState.stepsTaken,
            strategy: '路线封锁'
        });
    }
}

function resolveSporeExposure() {
    if (gameState.hostType === 'camponotus' && !gameState.groomUsed) {
        gameState.pendingExposure = true;
        const shouldGroom = autoDemo.active || window.confirm('木蚁接触到孢子。是否使用每局一次的 Groom 取消本次暴露？');
        gameState.pendingExposure = false;
        if (shouldGroom) {
            gameState.groomUsed = true;
            updateHostStatusUI();
            showScienceFact('Groom 已使用：本次孢子暴露被清除。');
            return false;
        }
    }

    if (gameState.hostType === 'atta' && gameState.sanitizeUsesRemaining > 0) {
        const shouldSanitize = autoDemo.active || window.confirm('切叶蚁接触到孢子。是否使用 Sanitize 清除该孢子？使用会消耗 1 步。');
        if (shouldSanitize && removeNearestSporeWithin(8)) {
            gameState.sanitizeUsesRemaining -= 1;
            gameState.stepsTaken += 1;
            updateHostStatusUI();
            showScienceFact('Sanitize 已清除接触到的孢子，本次暴露不计入感染。');
            if (gameState.stepsTaken >= gameState.maxSteps) {
                showResult('fungus_victory', '真菌胜利！Sanitize 后步数归零，宿主未能回巢', {
                    steps: gameState.stepsTaken,
                    strategy: '路线封锁'
                });
                return true;
            }
            return false;
        }
    }

    gameState.exposureCount += 1;
    const requiredContacts = getPairMatch().requiredContacts;
    updateHostStatusUI();
    if (gameState.exposureCount < requiredContacts) {
        showScienceFact(`发生 1 次有效接触：当前 ${gameState.exposureCount}/${requiredContacts}，尚未达到感染阈值。`);
        return false;
    }

    enterInfectionMode();
    return true;
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
        hostIndicator.textContent = gameState.hostType === 'ghost_moth' ? '🐛' : '🐜';
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

// Enter infection mode after a valid spore exposure.
function enterInfectionMode() {
    gameState.isInfectionMode = true;
    gameState.currentPhase = 'infection';
    gameState.infectionStep = gameState.stepsTaken;
    gameState.currentInfectionStage = 1;
    gameState.stageStartTime = Date.now();
    gameState.stageElapsedMs = 0;
    gameState.isHostControllable = true;
    gameState.foodCollected = 0;
    
    // Hide spores completely in infection mode (host shouldn't see them)
    toggleSporeVisibility(false);
    
    // 感染后巢穴从地图上移除，也不再参与触发或胜利判定。
    removeNestIndicatorFromMap();
    
    if (scienceFact) {
        const match = getPairMatch();
        scienceFact.textContent = match.compatible
            ? `感染成功：${getFungusTypeName(gameState.fungusType)} 达成科学匹配配对，开始展示对应生物学阶段。`
            : `游戏感染已触发：该组合缺乏可靠自然感染记录，以下阶段仅作机制演示，不代表真实跨宿主感染。`;
        scienceFact.classList.remove('hidden');
    }

    safeElement(currentPhase, (el) => {
        el.textContent = getPairMatch().compatible
            ? '【感染成功】科学匹配感染阶段展示'
            : '【实验性组合】通用感染机制展示';
    });
    fungusControls.classList.add('hidden');
    hostControls.classList.remove('hidden');
    safeElement(infectionControls, (el) => {
        infectionControls.classList.remove('hidden');
    });
    switchSideBtn?.classList.add('hidden');
    movementControls?.classList.remove('disabled');
    updateSpeedControlVisibility();

    if (infectionStageElement) {
        infectionStageElement.classList.remove('hidden');
    }
    updateInfectionStageDisplay();
    generateFoodItems(4);
    startFoodRefreshLoop();
    updateHostStatusUI();
    gameState.isPaused = false;
    startInfectionLoop();
}

// Remove duplicate calculateDistance function and keep the original one
// The original calculateDistance is already defined earlier in the file

const FOOD_REFRESH_INTERVAL_MS = 15000;
const FOOD_TARGET_COUNT = 4;

function getHostFoodLayers() {
    if (gameState.hostType === 'ghost_moth') return [0];
    if (gameState.hostType === 'camponotus') return [0, 1, 2];
    return [0, 1];
}

function clearFoodItems() {
    document.querySelectorAll('.food-item').forEach((element) => element.remove());
    gameState.foodItems = [];
}

function stopFoodRefreshLoop() {
    if (gameState.foodRefreshTimer) {
        clearInterval(gameState.foodRefreshTimer);
        gameState.foodRefreshTimer = null;
    }
}

function createFoodItem() {
    const allowedLayers = getHostFoodLayers();
    for (let attempt = 0; attempt < 80; attempt++) {
        const layer = allowedLayers[Math.floor(Math.random() * allowedLayers.length)];
        const candidate = {
            id: `food-${Date.now()}-${foodSerial++}`,
            layer,
            x: 7 + Math.random() * 86,
            y: 10 + Math.random() * 80,
            emoji: gameState.hostType === 'ghost_moth'
                ? '🌱'
                : ['🍃', '🌰', '💧'][foodSerial % 3]
        };
        const farFromHost = layer !== gameState.hostPosition.layer || calculateDistance(candidate, gameState.hostPosition) >= 12;
        const spacedOut = gameState.foodItems.every((food) => food.layer !== layer || calculateDistance(candidate, food) >= 10);
        if (farFromHost && spacedOut) return candidate;
    }
    return null;
}

function generateFoodItems(count = FOOD_TARGET_COUNT) {
    clearFoodItems();
    const targetCount = Math.max(0, Number(count) || 0);
    while (gameState.foodItems.length < targetCount) {
        const food = createFoodItem();
        if (!food) break;
        gameState.foodItems.push(food);
        renderFoodItem(food);
    }
}

// Render a food item on the map
function renderFoodItem(food) {
    const grid = document.querySelector(`#layer-${food.layer} .grid`);
    if (!grid) return;
    const foodElement = document.createElement('div');
    foodElement.id = food.id;
    foodElement.className = 'food-item';
    foodElement.textContent = food.emoji || '🍃';
    foodElement.setAttribute('role', 'img');
    foodElement.setAttribute('aria-label', '生态食物');
    foodElement.title = '生态食物（每 15 秒或进入新阶段刷新）';
    foodElement.style.left = `${food.x}%`;
    foodElement.style.top = `${food.y}%`;
    grid.appendChild(foodElement);
}

// Check for food at current position
function checkForFoodAtPosition() {
    const index = gameState.foodItems.findIndex((food) =>
        food.layer === gameState.hostPosition.layer &&
        calculateDistance(food, gameState.hostPosition) < 8
    );
    if (index < 0) return false;

    const [collected] = gameState.foodItems.splice(index, 1);
    document.getElementById(collected.id)?.remove();
    const replacement = createFoodItem();
    if (replacement) {
        gameState.foodItems.push(replacement);
        renderFoodItem(replacement);
    }
    return true;
}

function startFoodRefreshLoop() {
    stopFoodRefreshLoop();
    gameState.foodRefreshTimer = setInterval(() => {
        if (!gameState.isInfectionMode || gameState.isPaused) return;
        generateFoodItems(FOOD_TARGET_COUNT);
    }, FOOD_REFRESH_INTERVAL_MS);
}

function runSimulation() {
    startInfectionLoop();
}

// Pause simulation
function pauseSimulation() {
    if (gameState.isPaused) return;
    if (gameState.isInfectionMode && gameState.stageStartTime) {
        gameState.stageElapsedMs = Math.max(0, Date.now() - gameState.stageStartTime);
    }
    gameState.isPaused = true;
    clearInterval(gameState.simulationTimer);
    gameState.simulationTimer = null;
    updateInfectionTimeComparison(gameState.stageElapsedMs);
    updateHostStatusUI();
}

// Resume simulation
function resumeSimulation() {
    if (!gameState.isPaused && gameState.simulationTimer) return;
    gameState.isPaused = false;
    if (gameState.isInfectionMode) {
        startFoodRefreshLoop();
        startInfectionLoop();
        updateHostStatusUI();
    } else {
        runSimulation();
    }
}

// Speed up simulation
function speedUpSimulation() {
    if (!autoDemo.active) {
        updateSpeedControlVisibility();
        if (scienceFact) {
            scienceFact.textContent = '玩家手动模式按固定速度展示感染阶段；2 倍速仅用于自动演示。';
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
    stopFoodRefreshLoop();
    
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
    statsHTML += `<p>• 配对效果: ${getPairMatch().label}</p>`;
    
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
    return ENVIRONMENTS[environment]?.name || environment;
}

function getFungusTypeName(fungusType) {
    const names = {
        unilateralis: 'O. unilateralis',
        kimflemingiae: 'O. kimflemingiae',
        australis: 'O. australis',
        metarhizium: 'M. anisopliae',
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

// V1 infection loop: biology display only; infection already determines fungus victory.
function formatClockDuration(ms) {
    const totalSeconds = Math.max(0, Math.ceil(Number(ms || 0) / 1000));
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function getActiveStageDurationMs(fungusType = gameState.fungusType, stage = gameState.currentInfectionStage) {
    return autoDemo.active ? getAutoDemoInfectionSpeedMs() : getStageDurationMs(fungusType, stage);
}

function updateInfectionTimeComparison(elapsedMs = null) {
    if (!infectionTimeComparisonElement) return;
    if (!gameState.isInfectionMode || gameState.currentPhase !== 'infection') {
        infectionTimeComparisonElement.classList.add('hidden');
        return;
    }

    const stageInfo = getStageInfo(gameState.currentInfectionStage, gameState.fungusType);
    const stageIndex = Math.max(0, gameState.currentInfectionStage - 1);
    const stageDurations = autoDemo.active
        ? Array(getInfectionStageCount()).fill(getAutoDemoInfectionSpeedMs())
        : getStageDurations(gameState.fungusType, gameState.hostType).stageDurations;
    const stageDuration = stageDurations[stageIndex] || getActiveStageDurationMs();
    const elapsed = elapsedMs === null
        ? Math.max(0, Date.now() - gameState.stageStartTime)
        : Math.max(0, elapsedMs);
    const stageRemaining = Math.max(0, stageDuration - elapsed);
    const laterStagesDuration = stageDurations
        .slice(stageIndex + 1)
        .reduce((sum, duration) => sum + duration, 0);
    const totalRemaining = stageRemaining + laterStagesDuration;
    const totalDuration = stageDurations.reduce((sum, duration) => sum + duration, 0);

    infectionTimeComparisonElement.classList.remove('hidden');
    if (infectionNaturalTimeElement) {
        infectionNaturalTimeElement.textContent = `自然感染周期（示意）：${stageInfo.time}`;
    }
    if (infectionSimulationTimeElement) {
        infectionSimulationTimeElement.textContent = `游戏模拟倒计时：本阶段剩余 ${formatClockDuration(stageRemaining)}｜全程剩余 ${formatClockDuration(totalRemaining)}${gameState.isPaused ? '（已暂停）' : ''}`;
    }
    if (infectionTotalTimeElement) {
        infectionTotalTimeElement.textContent = `完整动画时长：${formatClockDuration(totalDuration)}${autoDemo.active ? '（自动演示）' : ''}`;
    }
}

function startInfectionLoop() {
    if (!gameState.isInfectionMode || gameState.isPaused) return;

    // Avoid multiple loops
    if (gameState.simulationTimer) {
        clearInterval(gameState.simulationTimer);
        gameState.simulationTimer = null;
    }

    gameState.stageStartTime = Date.now() - Math.max(0, gameState.stageElapsedMs || 0);
    gameState.simulationTimer = setInterval(() => {
        if (gameState.isPaused || !gameState.isInfectionMode) return;
        const totalStages = getInfectionStageCount();
        const stageDuration = getActiveStageDurationMs();
        const elapsed = Date.now() - gameState.stageStartTime;
        updateInfectionTimeComparison(elapsed);
        if (elapsed >= stageDuration && gameState.currentInfectionStage < totalStages) {
            gameState.currentInfectionStage += 1;
            gameState.stageElapsedMs = 0;
            gameState.stageStartTime = Date.now();
            updateInfectionStageDisplay();
            updateInfectionTimeComparison(0);
            generateFoodItems(FOOD_TARGET_COUNT);
            return;
        }
        if (elapsed >= stageDuration && gameState.currentInfectionStage >= totalStages) {
            clearInterval(gameState.simulationTimer);
            gameState.simulationTimer = null;
            stopFoodRefreshLoop();
            showResult('fungus_victory', '感染成功！真菌完成感染与孢子释放阶段', {
                stages: totalStages,
                strategy: getPairMatch().compatible ? '科学匹配感染' : '实验性组合'
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
    const sp = snapshot?.summary?.sporeCountsByLayer || { 0: 0, 1: 0, 2: 0 };
    const s1 = `感染已进入阶段${stage}，宿主的回巢挑战正式结束。`;
    const s2 = `孢子分布为${sp[0]}/${sp[1]}/${sp[2]}，接下来观察真菌生命周期。`;
    return `${s1}\n${s2}`;
}

// 与孢子生成共用的 Flask/GLM-5 转发配置
const AI_PROXY_ENDPOINT = 'http://127.0.0.1:8002/api/generate';
const AI_MODEL_NAME = 'glm-5';
const AI_TIMEOUT_MS = 90000;
const RAG_ASK_ENDPOINT = 'http://127.0.0.1:8002/api/rag/ask';
const RAG_HEALTH_ENDPOINT = 'http://127.0.0.1:8002/api/rag/health';
// 本地内容会立即显示；较长超时只用于后台补充，避免冷启动时误判服务失败。
const RAG_REQUEST_TIMEOUT_MS = 40000;
const RAG_RETRY_COOLDOWN_MS = 30000;
let ragUnavailableUntil = 0;

const LOCAL_SCIENCE_FACTS = {
    unilateralis: {
        title: 'O. unilateralis 与木蚁',
        summary: 'O. unilateralis 是与木蚁相关的专化寄生真菌；感染后期可改变宿主活动，并出现附着在植物组织上的“死亡紧咬”。',
        details: [
            '孢子需要先附着并穿透宿主体表，感染不会在接触瞬间完成。',
            '行为改变发生在感染后期；游戏中的一次有效接触是平衡抽象，不等于现实孢子剂量。',
            '宿主死亡后形成的真菌结构有助于孢子释放，开始下一轮传播。'
        ]
    },
    kimflemingiae: {
        title: 'O. kimflemingiae 与木蚁',
        summary: 'O. kimflemingiae 与木蚁宿主相关，模拟器用寻找树枝和树枝紧咬表现其感染后期行为。',
        details: [
            '感染包括附着、穿透、体内扩增和宿主死亡后的真菌发育。',
            '温度、湿度和可供附着的植物结构会影响传播机会。',
            '游戏把连续的生物过程压缩成阶段动画，时间标签用于对照现实周期与模拟时长。'
        ]
    },
    australis: {
        title: 'O. australis 与猛蚁',
        summary: 'O. australis 有感染猛蚁亚科宿主的记录，模拟器将其主要配对设为猛蚁。',
        details: [
            '真菌先突破宿主体表，再在体内扩增并完成后续发育。',
            '模拟中的抓附枝干与子实体形成属于感染结局展示。',
            '猛蚁不能进入树冠、可使用 Ground Dash，是游戏移动规则，不是感染生物学结论。'
        ]
    },
    metarhizium: {
        title: 'M. anisopliae 与切叶蚁',
        summary: 'M. anisopliae 是昆虫病原真菌，可感染切叶蚁；这里展示普通真菌感染，不加入僵尸蚁式行为操控。',
        details: [
            '切叶蚁具有清洁和群体卫生等抗真菌防御行为。',
            '因此游戏设置两次有效接触，并允许 Sanitize 清除孢子。',
            '接触次数是游戏平衡抽象，不能解释为现实中的精确感染剂量。'
        ]
    },
    sinensis: {
        title: 'O. sinensis 与鬼天蛾幼虫',
        summary: 'O. sinensis 与高山环境中的鬼天蛾类幼虫相关，感染后真菌在宿主体内扩增并使其木乃伊化。',
        details: [
            '这一配对主要发生在土壤中的幼虫宿主，不使用蚂蚁的攀爬紧咬路径。',
            '低温环境下的自然感染与发育周期远长于游戏动画。',
            'Burrow 和地表孢子绕行是游戏移动机制，不代表宿主能够完全避免自然感染。'
        ]
    }
};

const RAG_RELEVANCE_TERMS = {
    unilateralis: ['unilateralis', 'camponotus', '木蚁', 'death grip', '死亡紧咬'],
    kimflemingiae: ['kimflemingiae', 'castaneus', 'camponotus castaneus', '树枝紧咬'],
    australis: ['o. australis', 'ophiocordyceps australis', 'ponerine', 'ponerinae', '猛蚁'],
    metarhizium: ['metarhizium', 'anisopliae', 'leaf-cutting ant', 'leafcutter', '切叶蚁', '绿僵菌'],
    sinensis: ['o. sinensis', 'ophiocordyceps sinensis', 'thitarodes', 'ghost moth', '鬼天蛾', '冬虫夏草']
};

function isRagDataRelevant(data, fungusType = gameState.fungusType) {
    const terms = RAG_RELEVANCE_TERMS[fungusType] || [];
    if (!terms.length) return false;
    const evidenceText = (data?.retrieved || []).map((item) => {
        const metadata = item.metadata || {};
        return [
            item.document,
            item.chunk_id,
            metadata.title,
            metadata.topic,
            metadata.tags,
            metadata.source_titles,
            metadata.source_ids
        ].filter(Boolean).join(' ');
    }).join(' ').toLowerCase();
    return terms.some((term) => evidenceText.includes(term.toLowerCase()));
}

function getLocalScienceFactKey(question = '') {
    const normalized = String(question || '').toLowerCase();
    if (/kimflemingiae|castaneus|树枝紧咬/.test(normalized)) return 'kimflemingiae';
    if (/australis|ponerine|猛蚁/.test(normalized)) return 'australis';
    if (/metarhizium|anisopliae|切叶蚁|绿僵菌/.test(normalized)) return 'metarhizium';
    if (/sinensis|冬虫夏草|鬼天蛾|thitarodes/.test(normalized)) return 'sinensis';
    if (/unilateralis|death grip|死亡紧咬|木蚁/.test(normalized)) return 'unilateralis';
    return LOCAL_SCIENCE_FACTS[gameState.fungusType] ? gameState.fungusType : 'unilateralis';
}

function buildLocalScienceData(question = '') {
    const key = getLocalScienceFactKey(question);
    const fact = LOCAL_SCIENCE_FACTS[key];
    const match = getPairMatch(key, gameState.hostType);
    const boundary = match.compatible
        ? '当前真菌与宿主是科学匹配组合。'
        : '当前组合缺乏可靠自然感染记录；游戏中的额外接触要求是 Debuff 抽象。';
    const answer = [fact.summary, boundary, ...fact.details].join('\n\n');
    return {
        question,
        source: 'local_verified',
        answer,
        query_vector_dim: null,
        retrieved: [{
            chunk_id: `local-${key}`,
            document: `${fact.summary}\n${fact.details.join('\n')}`,
            metadata: {
                title: fact.title,
                source_ids: 'simulator-local-science',
                topic: key
            }
        }]
    };
}

async function fetchJsonWithTimeout(url, options = {}, timeoutMs = RAG_REQUEST_TIMEOUT_MS) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const response = await fetch(url, { ...options, signal: controller.signal });
        let data = {};
        try {
            data = await response.json();
        } catch {
            data = {};
        }
        if (!response.ok) {
            throw new Error(data.message || data.error || `HTTP ${response.status}`);
        }
        return data;
    } finally {
        clearTimeout(timer);
    }
}

async function requestRagAnswer(question, topK = 4) {
    if (Date.now() < ragUnavailableUntil) {
        throw new Error('rag_cooldown');
    }
    try {
        const data = await fetchJsonWithTimeout(RAG_ASK_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ question, top_k: topK })
        });
        ragUnavailableUntil = 0;
        return data;
    } catch (error) {
        ragUnavailableUntil = Date.now() + RAG_RETRY_COOLDOWN_MS;
        throw error;
    }
}

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
        `现实周期（示意）：${info.time}`,
        `模拟展示时间：${info.realTime}`,
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

    const data = await requestRagAnswer(buildStageGuideQuestion(stage, info), 2);
    if (!isRagDataRelevant(data, gameState.fungusType)) {
        throw new Error('rag_irrelevant');
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

    const totalStages = getInfectionStageCount();
    for (let i = 1; i <= totalStages; i++) {
        const info = getStageInfo(i, gameState.fungusType, gameState.hostType);
        const marker = i === current ? '👉 ' : '';
        const skipped = info.skipped ? '（跳过）' : '';
        const cacheKey = getStageGuideCacheKey(i, gameState.fungusType, gameState.hostType, gameState.environment);
        const ragData = stageGuideRagCache.get(cacheKey);

        lines.push(`${marker}阶段${i}｜${info.name}${skipped}`);
        lines.push(`现实周期（示意）：${info.time}`);
        lines.push(`模拟展示时间：${info.realTime}`);
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
    const totalStages = getInfectionStageCount();
    for (let i = 1; i <= totalStages; i++) {
        const info = getStageInfo(i, gameState.fungusType, gameState.hostType);
        try {
            await fetchStageRagExplanation(i, info);
        } catch (error) {
            const cacheKey = getStageGuideCacheKey(i, gameState.fungusType, gameState.hostType, gameState.environment);
            stageGuideRagCache.set(cacheKey, {
                answer: '本地阶段说明已保留；在线知识补充未及时返回。',
                retrieved: []
            });
        }

        completed += 1;
        if (myToken !== stageGuideHydrationToken) return;

        const panel = document.getElementById('stage-guide-panel');
        if (!panel || panel.classList.contains('hidden')) return;

        renderStageGuidePanel(`已完成 ${completed}/${totalStages} 个阶段`);
    }

    if (myToken === stageGuideHydrationToken) {
        renderStageGuidePanel(`${totalStages}/${totalStages} 阶段知识已完成补充`);
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
        warningText += `现实周期（示意）：${info.time}\n`;
        warningText += `模拟展示时间：${info.realTime}\n`;
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
const AUTO_DEMO_INFECTION_SPEED_MS = 20000;
const AUTO_DEMO_INFECTION_MAX_MS = 200000;
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
    stopFoodRefreshLoop();
    clearFoodItems();

    if (resultScreen) resultScreen.classList.add('hidden');
    hideScienceFact();

    const selectedFungus = document.getElementById('fungus-type')?.value || 'unilateralis';
    const selectedHost = document.getElementById('host-type')?.value || getPairing(selectedFungus).hostType;
    const selectedEnvironment = document.getElementById('environment-type')?.value ||
        getPairing(selectedFungus).preferredEnvironments[0];
    Object.assign(gameState, {
        currentPhase: 'setup',
        playerSide: 'fungus',
        hostType: selectedHost,
        environment: selectedEnvironment,
        fungusType: selectedFungus,
        spores: [],
        stepsTaken: 0,
        isInfectionMode: false,
        isPaused: false,
        simulationSpeed: 30000,
        isHostControllable: true,
        sporesVisible: true,
        currentInfectionStage: 0,
        infectionStep: 0
    });
    resetV1HostAbilities();
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
        hostTypeSelect.value = gameState.hostType;
    }
    const envSelect = document.getElementById('environment-type');
    if (envSelect) envSelect.value = gameState.environment;
    if (fungusSelect) {
        fungusSelect.value = gameState.fungusType;
        fungusSelect.disabled = false;
    }

    clearSpores();
    hideHostIndicator();
    if (nestIndicator) nestIndicator.classList.add('hidden');

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
        abilities: gameState.hostType === 'camponotus'
            ? { groomAvailable: !gameState.groomUsed, firstLayerChangeFree: gameState.firstLayerChangeFree }
            : { burrowAvailable: gameState.burrowCooldownMoves === 0, burrowCooldownMoves: gameState.burrowCooldownMoves },
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

    const stepSizeForAction = action.action === 'burrow' ? 10 : stepSize;
    switch (action.direction) {
        case 'up':
            projected.y = Math.max(0, projected.y - stepSizeForAction);
            break;
        case 'down':
            projected.y = Math.min(100, projected.y + stepSizeForAction);
            break;
        case 'left':
            projected.x = Math.max(0, projected.x - stepSizeForAction);
            break;
        case 'right':
            projected.x = Math.min(100, projected.x + stepSizeForAction);
            break;
    }
    return projected;
}

function getActionDistanceAfterMove(action) {
    return calculateDistance(getProjectedHostPosition(action), gameState.nestPosition);
}

function doesHostActionApproachNest(action) {
    if (!action || !['move', 'burrow'].includes(action.action)) return false;
    const beforeDistance = calculateDistance(gameState.hostPosition, gameState.nestPosition);
    return getActionDistanceAfterMove(action) < beforeDistance - 0.1;
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
    if (gameState.hostType === 'ghost_moth' && gameState.burrowCooldownMoves === 0) {
        ['up', 'down', 'left', 'right'].forEach((direction) => actions.push({ action: 'burrow', direction }));
    }
    const layerCost = gameState.firstLayerChangeFree ? 0 : 1;
    if (gameState.hostType === 'camponotus' && gameState.hostPosition.layer < 2 && gameState.stepsTaken + layerCost <= gameState.maxSteps) {
        actions.push({ action: 'layer', delta: 1 });
    }
    if (gameState.hostType === 'camponotus' && gameState.hostPosition.layer > 0 && gameState.stepsTaken + layerCost <= gameState.maxSteps) {
        actions.push({ action: 'layer', delta: -1 });
    }
    return actions;
}

function isHostActionValid(action) {
    if (!action) return false;
    const before = gameState.hostPosition;
    const after = getProjectedHostPosition(action);

    if (action.action === 'layer') {
        if (gameState.hostType !== 'camponotus') return false;
        const nextLayer = before.layer + action.delta;
        if (nextLayer < 0 || nextLayer > 2) return false;
        if (gameState.stepsTaken + (gameState.firstLayerChangeFree ? 0 : 1) > gameState.maxSteps) return false;
        const recentLayerChanges = autoDemo.hostHistory.slice(-2).filter((item) => item.action?.action === 'layer').length;
        return recentLayerChanges < 2;
    }

    if (action.action === 'move' || action.action === 'burrow') {
        if (action.action === 'burrow' && (gameState.hostType !== 'ghost_moth' || gameState.burrowCooldownMoves > 0)) return false;
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
            return (a.distance + aLayerPenalty) - (b.distance + bLayerPenalty);
        });

    if (candidates.length > 0) {
        return candidates[0].action;
    }

    if (gameState.hostType === 'camponotus' && gameState.hostPosition.layer !== nest.layer && gameState.stepsTaken + 1 <= gameState.maxSteps) {
        return { action: 'layer', delta: nest.layer > gameState.hostPosition.layer ? 1 : -1 };
    }

    return { action: 'move', direction: 'right' };
}

function getGreedyHostMove() {
    return getSmartFallbackHostMove();
}

function repairHostAction(action) {
    const normalized = normalizeHostAIAction(action);
    if (isHostActionValid(normalized) && doesHostActionApproachNest(normalized)) return normalized;
    return getSmartFallbackHostMove();
}

function getHostActionStepCost(action, state = gameState) {
    if (action?.action === 'layer') return state.firstLayerChangeFree ? 0 : 1;
    return 1;
}

function getProjectedPositionForState(position, action) {
    const stepSize = 5;
    const projected = { ...position };
    if (!action || typeof action !== 'object') return projected;

    if (action.action === 'layer') {
        projected.layer = Math.max(0, Math.min(2, projected.layer + Number(action.delta || 0)));
        return projected;
    }

    const stepSizeForAction = action.action === 'burrow' ? 10 : stepSize;
    switch (action.direction) {
        case 'up':
            projected.y = Math.max(0, projected.y - stepSizeForAction);
            break;
        case 'down':
            projected.y = Math.min(100, projected.y + stepSizeForAction);
            break;
        case 'left':
            projected.x = Math.max(0, projected.x - stepSizeForAction);
            break;
        case 'right':
            projected.x = Math.min(100, projected.x + stepSizeForAction);
            break;
    }
    return projected;
}

function doesHostActionApproachNestForState(action, state) {
    if (!action || !['move', 'burrow'].includes(action.action)) return false;
    const beforeDistance = calculateDistance(state.hostPosition, state.nestPosition);
    const afterDistance = calculateDistance(
        getProjectedPositionForState(state.hostPosition, action),
        state.nestPosition
    );
    return afterDistance < beforeDistance - 0.1;
}

function getPlanInitialState() {
    return {
        hostPosition: { ...gameState.hostPosition },
        nestPosition: { ...gameState.nestPosition },
        stepsTaken: gameState.stepsTaken,
        maxSteps: gameState.maxSteps,
        firstLayerChangeFree: gameState.firstLayerChangeFree,
        burrowCooldownMoves: gameState.burrowCooldownMoves,
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
    if (gameState.hostType === 'ghost_moth' && state.burrowCooldownMoves === 0) {
        ['up', 'down', 'left', 'right'].forEach((direction) => actions.push({ action: 'burrow', direction }));
    }
    const layerCost = state.firstLayerChangeFree ? 0 : 1;
    if (gameState.hostType === 'camponotus' && state.hostPosition.layer < 2 && state.stepsTaken + layerCost <= state.maxSteps) {
        actions.push({ action: 'layer', delta: 1 });
    }
    if (gameState.hostType === 'camponotus' && state.hostPosition.layer > 0 && state.stepsTaken + layerCost <= state.maxSteps) {
        actions.push({ action: 'layer', delta: -1 });
    }
    return actions;
}

function isHostActionValidForState(action, state) {
    if (!action) return false;
    const after = getProjectedPositionForState(state.hostPosition, action);

    if (action.action === 'layer') {
        if (gameState.hostType !== 'camponotus') return false;
        const nextLayer = state.hostPosition.layer + action.delta;
        if (nextLayer < 0 || nextLayer > 2) return false;
        if (state.stepsTaken + (state.firstLayerChangeFree ? 0 : 1) > state.maxSteps) return false;
        const recentLayerChanges = state.history.slice(-2).filter((item) => item.action?.action === 'layer').length;
        return recentLayerChanges < 2;
    }

    if (action.action === 'move' || action.action === 'burrow') {
        if (action.action === 'burrow' && state.burrowCooldownMoves > 0) return false;
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
            return (a.distance + aLayerPenalty) - (b.distance + bLayerPenalty);
        });

    if (candidates.length > 0) {
        return candidates[0].action;
    }

    return null;
}

function applyHostActionToPlanState(state, action) {
    const beforeDistance = calculateDistance(state.hostPosition, state.nestPosition);
    const afterPosition = getProjectedPositionForState(state.hostPosition, action);
    const afterDistance = calculateDistance(afterPosition, state.nestPosition);
    const improved = afterDistance < beforeDistance - 0.1;

    state.hostPosition = afterPosition;
    state.stepsTaken += getHostActionStepCost(action, state);
    if (action.action === 'layer') state.firstLayerChangeFree = false;
    if (action.action === 'burrow') state.burrowCooldownMoves = 3;
    if (action.action === 'move' && state.burrowCooldownMoves > 0) state.burrowCooldownMoves -= 1;
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
        let action = isHostActionValidForState(candidate, state) && doesHostActionApproachNestForState(candidate, state)
            ? candidate
            : getFallbackHostMoveForState(state);

        if (!action || !isHostActionValidForState(action, state)) break;
        if (state.stepsTaken + getHostActionStepCost(action, state) > maxStepBudget) {
            action = getFallbackHostMoveForState({
                ...state,
                maxSteps: maxStepBudget
            });
            if (!action || !isHostActionValidForState(action, { ...state, maxSteps: maxStepBudget })) break;
        }

        repaired.push(action);
        applyHostActionToPlanState(state, action);

        const reachedNest = calculateDistance(state.hostPosition, state.nestPosition) < 8;
        if (reachedNest) break;
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
首要且不可违背的目标是让每次平面移动后的欧式距离都严格小于移动前；不要探索地图边缘。

【坐标方向】
- right：x 增加；left：x 减少；down：y 增加；up：y 减少。
- 比较 hostPosition 与 nestPosition：巢穴 x 更大时只能用 right 接近，x 更小时只能用 left 接近；y 同理。
- 每一步都先计算动作后的坐标与 distanceToNest，禁止输出会让距离不变或增大的 move/burrow。

【重要限制】
- 不能使用、猜测或要求孢子坐标。
- 平面移动与普通换层每次消耗 1 步；木蚁首次换层免费。
- 鬼天蛾幼虫只能在地面层，可在 Burrow 可用时用 burrow 连续移动两格，消耗 1 步。
- 如果换层，delta 只能是 1 或 -1。
- 不要原地撞墙，不要来回抵消移动。

【输出要求】
只输出严格 JSON，不要 Markdown、不要解释。格式：
{"actions":[
  {"action":"move","direction":"up|down|left|right"},
  {"action":"layer","delta":1|-1},
  {"action":"burrow","direction":"up|down|left|right"}
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
    if (action.action === 'burrow') return `Burrow ${action.direction}`;
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
    const sporeCounts = getLayerCounts(spores);

    return {
        phase: 'infection',
        hostType: getHostTypeName(gameState.hostType),
        environment: getEnvironmentName(gameState.environment),
        fungusType: getFungusTypeName(gameState.fungusType),
        infectionStage: gameState.currentInfectionStage,
        totalStages: getInfectionStageCount(),
        outcome: 'fungus_victory',
        stepsTaken: gameState.stepsTaken,
        maxSteps: gameState.maxSteps,
        hostPosition: hostPos,
        spores,
        summary: {
            sporeCountsByLayer: sporeCounts,
            nearestSporeSameLayer: getNearestOnSameLayer(hostPos, spores)
        }
    };
}

function buildAICommentaryMeta(snapshot) {
    const sporeCounts = snapshot.summary?.sporeCountsByLayer || { 0: 0, 1: 0, 2: 0 };
    const match = getPairMatch();
    return (
        `阶段：${gameState.currentInfectionStage}/${getInfectionStageCount()}\n` +
        `宿主：${getHostTypeName(gameState.hostType)} | 真菌：${getFungusTypeName(gameState.fungusType)} | 环境：${getEnvironmentName(gameState.environment)}\n` +
        `匹配关系：${match.compatible ? '科学匹配' : '实验性不匹配组合'} | 结局：感染成功\n` +
        `孢子分布(0/1/2层)：${sporeCounts[0]}/${sporeCounts[1]}/${sporeCounts[2]}`
    );
}

function buildLocalAICommentary(snapshot) {
    const match = getPairMatch();
    return [
        '【当前局面】',
        match.compatible
            ? `${getFungusTypeName(gameState.fungusType)} 已感染其科学匹配宿主。`
            : `${getFungusTypeName(gameState.fungusType)} 在实验性组合中触发游戏感染；这不代表可靠的自然感染记录。`,
        '',
        '【概述】',
        `GLM-5 暂时不可用，已切换为本地科学解说。当前为阶段 ${snapshot.infectionStage}/${snapshot.totalStages}。`,
        '',
        '【分析要点】',
        `- 当前阶段：${getStageInfo(snapshot.infectionStage, gameState.fungusType).name}。`,
        `- 该动画用于解释感染过程，不再改变宿主回巢步数。`,
        `- 当前配对为 ${getFungusTypeName(gameState.fungusType)} × ${getHostTypeName(gameState.hostType)}。`,
        '',
        '【胜负预测】',
        '胜方：真菌方',
        '置信度：1.00',
        '原因：宿主已经达到本局设定的有效接触阈值并触发感染。'
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
        totalStages: getInfectionStageCount(),
        outcome: 'fungus_victory',
        hostPosition: hostPos,
        isHostControllable: gameState.isHostControllable,
        stepsTaken: gameState.stepsTaken,
        infectionStep: gameState.infectionStep,
        stepsSinceInfection,
        stepsUntilNextMovementPenalty: Math.max(0, nextPenaltyAt - stepsSinceInfection),
        movementPenalty: 'V1 感染后不再移动',
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
你是 Fungi Simulator 中的感染阶段观察器。V1 中宿主感染后不再行动，只能输出 wait。

【可见信息】
- 你可以看到感染阶段和当前配对是否为科学匹配；不匹配组合只能按游戏平衡抽象解释。
- 你不知道未来随机事件，只能基于当前快照做求生决策。

【策略】
- 如果当前阶段不可控，输出 wait。
- 始终输出 wait，感染阶段只用于生物学展示。

【输出要求】
只输出严格 JSON，不要解释，不要 Markdown。格式只能是：
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

    if (raw.action === 'burrow') {
        const direction = String(raw.direction || '').toLowerCase();
        if (['up', 'down', 'left', 'right'].includes(direction)) {
            return { action: 'burrow', direction };
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
首要且不可违背的目标是让本次平面移动后的欧式距离严格小于当前 distanceToNest；不要朝地图边缘探索。

【行为策略】
- 必须选择能让 distanceToNest 下降的动作；不能仅因为“规避未知风险”而远离巢穴。
- 坐标规则：right 使 x 增加，left 使 x 减少，down 使 y 增加，up 使 y 减少。
- 巢穴 x 大于宿主 x 时用 right，巢穴 x 小于宿主 x 时用 left；y 方向同理。
- 输出前计算移动后的坐标和距离，禁止输出让距离不变或增大的 move/burrow。
- 不要频繁换层；只有当前层难以前进，或巢穴在不同层且剩余步数足够时才换层。
- 如果 recentHistory 显示连续动作没有改善距离，请换一个方向尝试。
- 不要原地撞墙，也不要马上反向抵消上一回合移动。
- 你不知道孢子位置，所以不能基于孢子坐标决策，只能表现为“谨慎逃生”。

【移动规则】
- 平面移动：up/down/left/right，每步约 5 个坐标单位
- 木蚁换层：layer 动作 delta 只能是 1（上层）或 -1（下层），首次免费、之后消耗 1 步
- 鬼天蛾幼虫只能在地面层；Burrow 可用时可输出 burrow，连续移动两格且消耗 1 步
- 地图 layer：0=地面，1=植被，2=树冠

【输出要求（必须严格遵守）】
1) 只输出 JSON，不要 Markdown、不要解释
2) 格式只能是以下三种之一：
   {"action":"move","direction":"up|down|left|right"}
   {"action":"layer","delta":1|-1}
   {"action":"burrow","direction":"up|down|left|right"}

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
        showResult('fungus_victory', '真菌胜利！宿主未能在 15 步内返回巢穴', {
            steps: gameState.stepsTaken,
            strategy: '路线封锁'
        });
        return;
    }
    showResult('fungus_victory', '感染成功！AI 自动演示完成感染阶段', {
        stages: gameState.currentInfectionStage,
        strategy: reason === 'timeout' ? '自动结算' : (getPairMatch().compatible ? '科学匹配感染' : '实验性组合')
    });
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
    if (action.action === 'burrow') {
        activateBurrow();
        moveHost(action.direction);
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
            setDemoStatus('感染阶段仅用于展示，宿主不再执行求生行动');
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

    setDemoStatus(`${getPairMatch().compatible ? '科学匹配感染' : '实验性组合感染'}：生成 AI 生物学解说…`);
    showAutoDemoCommentaryPlaceholder();
    await demoSleep(600);

    if (autoDemo.active && token === autoDemo.token && gameState.isInfectionMode) {
        try {
            await generateAICommentary();
            setDemoStatus('AI 解说已生成，继续播放感染阶段…');
        } catch (error) {
            if (!isDemoStoppedError(error)) {
                console.warn('演示模式 AI 解说失败:', error);
                showAutoDemoCommentaryPlaceholder(`AI 局面解说暂时不可用：${error.message || error}\n\n演示会继续播放本地感染阶段。`);
            }
        }
    }

    await demoSleep(2200);
    if (!autoDemo.active || token !== autoDemo.token || isDemoGameEnded()) return;

    gameState.simulationSpeed = getAutoDemoInfectionSpeedMs();
    gameState.isPaused = false;
    startInfectionLoop();

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
        const data = await fetchJsonWithTimeout(RAG_HEALTH_ENDPOINT);
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
        if (ragAnswerMeta) ragAnswerMeta.textContent = '当前使用本地知识';
        if (ragAnswerContent) {
            ragAnswerContent.innerHTML = '<p class="rag-empty-state">在线知识服务未及时返回；内置科学资料仍可正常使用，不影响游戏。</p>';
        }
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

function buildRagThinkingHtml() {
    return [
        '<section class="rag-answer-card rag-thinking-card" role="status" aria-live="polite">',
        '<div class="rag-thinking-heading">',
        '<span class="rag-thinking-spinner" aria-hidden="true"></span>',
        '<div>',
        '<strong>正在检索并生成回答</strong>',
        '<p>回答完成前不会展示临时内容，请稍候。</p>',
        '</div>',
        '</div>',
        '<div class="rag-thinking-steps" aria-hidden="true">',
        '<span>检索相关证据</span>',
        '<span>核对证据关联</span>',
        '<span>组织最终回答</span>',
        '</div>',
        '</section>'
    ].join('');
}

async function askRagQuestion() {
    const question = (ragQuestionInput?.value || '').trim();
    if (!question) {
        alert('请先输入一个关于 fungi 或 host 的问题。');
        return;
    }

    const localData = buildLocalScienceData(question);
    if (ragAskBtn) ragAskBtn.disabled = true;
    if (ragAnswerMeta) ragAnswerMeta.textContent = '正在思考，请稍候...';
    if (ragAnswerContent) ragAnswerContent.innerHTML = buildRagThinkingHtml();
    if (ragAnswerPanel) {
        ragAnswerPanel.classList.remove('hidden');
        ragAnswerPanel.setAttribute('aria-busy', 'true');
    }

    try {
        const data = await requestRagAnswer(question, 5);
        const questionFactKey = getLocalScienceFactKey(question);
        if (!isRagDataRelevant(data, questionFactKey)) {
            throw new Error('rag_irrelevant');
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
        if (ragAnswerMeta) {
            ragAnswerMeta.textContent = error?.message === 'rag_irrelevant'
                ? '在线证据与问题相关性不足，已切换至本地科学资料'
                : '在线回答未及时返回，已切换至本地科学资料';
        }
        if (ragAnswerContent) ragAnswerContent.innerHTML = buildRagAnswerHtml(localData);
    } finally {
        if (ragAskBtn) ragAskBtn.disabled = false;
        ragAnswerPanel?.setAttribute('aria-busy', 'false');
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

        if (/^-{3,}$/.test(line)) {
            flushParagraph();
            flushList();
            html.push('<hr class="rag-answer-divider" aria-hidden="true">');
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
    const displayValue = String(value || '')
        .replace(/(^|\s)(\*{2}|__)?(1[）.)]\s*)一句话结论(?=\s|\*|_|$)/u, '$1$2$3结论');
    return escapeHtml(displayValue)
        .replace(/`([^`]+)`/g, '<code>$1</code>')
        .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
        .replace(/__([^_]+)__/g, '<strong>$1</strong>')
        .replace(/\*([^*]+)\*/g, '<em>$1</em>');
}

// Restart game
function restartGame() {
    stopAutoDemo();
    resetInfectionArtifacts();
    resultScreen.classList.add('hidden');
    clearSpores();
    hideHostIndicator();
    startGame();
}

// Show science facts
async function showScienceFacts() {
    const target = resultScienceFacts || document.getElementById('result-science-facts');
    if (!target) return;

    const myToken = ++resultScienceRequestToken;
    target.classList.remove('hidden');

    const question = [
        `请基于知识库给出与 ${getFungusTypeName(gameState.fungusType)}、${getHostTypeName(gameState.hostType)}、${getEnvironmentName(gameState.environment)} 相关的科学事实。`,
        '重点解释真菌感染宿主、行为操控、death grip、孢子传播或宿主抵抗，并返回可用于课堂展示的依据。'
    ].join(' ');
    const localData = buildLocalScienceData(question);

    // 先展示可用的本地科学内容；在线知识库仅作为增强，不能阻塞结算页。
    target.innerHTML = buildResultScienceFactsHtml(localData, {
        notice: '正在尝试补充在线知识库内容；本地科学资料已经可以阅读。'
    });

    try {
        const data = await requestRagAnswer(question, 4);
        if (myToken !== resultScienceRequestToken) return;
        if (resultScreen?.classList.contains('hidden')) return;
        if (!isRagDataRelevant(data, gameState.fungusType)) {
            target.innerHTML = buildResultScienceFactsHtml(localData, {
                notice: '在线知识库未找到与当前配对直接相关的资料，已保留内置科学内容。'
            });
            return;
        }
        target.innerHTML = buildResultScienceFactsHtml(data);
    } catch (error) {
        if (myToken !== resultScienceRequestToken) return;
        if (resultScreen?.classList.contains('hidden')) return;
        target.innerHTML = buildResultScienceFactsHtml(localData, {
            notice: '当前使用内置科学资料；在线补充未及时返回，不影响本局结果与继续游戏。'
        });
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

function getScienceSourceLabel(source) {
    const labels = {
        local_verified: '内置科学资料',
        local_fallback: '本地知识库',
        chromadb: '在线知识库'
    };
    return labels[source] || '知识库';
}

function buildResultScienceFactsHtml(data, { notice = '' } = {}) {
    const retrieved = data.retrieved || [];
    const lines = [];
    lines.push('<div class="result-science-title">知识库科学事实</div>');
    lines.push(`<div class="result-science-meta">内容来源：${escapeHtml(getScienceSourceLabel(data.source))}｜资料 ${retrieved.length} 条</div>`);
    if (notice) {
        lines.push(`<div class="result-science-notice">${escapeHtml(notice)}</div>`);
    }
    lines.push('<div class="result-science-answer">');
    lines.push('<strong>回答摘要</strong>');
    lines.push(`<div class="result-science-answer-text">${renderRagRichText(data.answer || '暂无回答')}</div>`);
    lines.push('</div>');

    lines.push('<div class="result-science-evidence">');
    lines.push('<strong>科学资料</strong>');
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

function resetInfectionArtifacts() {
    clearInterval(gameState.simulationTimer);
    clearTimeout(gameState.simulationTimer);
    gameState.simulationTimer = null;
    stopFoodRefreshLoop();
    clearFoodItems();
    stageGuideHydrationToken += 1;
    resultScienceRequestToken += 1;

    gameState.isInfectionMode = false;
    gameState.isPaused = false;
    gameState.isHostControllable = true;
    gameState.currentInfectionStage = 0;
    gameState.stageStartTime = 0;
    gameState.stageElapsedMs = 0;
    gameState.foodCollected = 0;

    hideScienceFact();
    infectionStageElement?.classList.add('hidden');
    infectionTimeComparisonElement?.classList.add('hidden');
    if (infectionNaturalTimeElement) infectionNaturalTimeElement.textContent = '自然感染周期：—';
    if (infectionSimulationTimeElement) infectionSimulationTimeElement.textContent = '游戏模拟倒计时：—';
    if (infectionTotalTimeElement) infectionTotalTimeElement.textContent = '完整动画时长：—';
    if (stageNumberElement) stageNumberElement.textContent = '1';
    if (stageTotalElement) stageTotalElement.textContent = String(getInfectionStageCount());
    infectionControls?.classList.add('hidden');
    movementControls?.classList.remove('disabled');
    hostStepStatusElement?.classList.remove('hidden');

    const stageGuidePanel = document.getElementById('stage-guide-panel');
    const stageGuideContent = document.getElementById('stage-guide-content');
    const stageGuideBtn = document.getElementById('stage-guide-btn');
    stageGuidePanel?.classList.add('hidden');
    if (stageGuideContent) stageGuideContent.textContent = '';
    if (stageGuideBtn) stageGuideBtn.textContent = '📚 阶段详解';

    aiCommentaryPanel?.classList.add('hidden');
    if (aiCommentaryMeta) aiCommentaryMeta.textContent = '';
    if (aiCommentaryContent) aiCommentaryContent.textContent = '';
}

// Return to setup
function returnToSetup(targetSectionId = 'setup-section') {
    stopAutoDemo();
    clearInterval(gameState.timer);
    gameState.timer = null;
    resetInfectionArtifacts();
    gameState.currentPhase = 'setup';
    resultScreen.classList.add('hidden');
    gameSection.classList.add('hidden');
    setupSection.classList.remove('hidden');
    if (notesSection) notesSection.classList.remove('hidden');
    clearSpores();
    hideHostIndicator();
    removeNestIndicatorFromMap();
    navigateToSection(targetSectionId);
}

// Hide host indicator
function hideHostIndicator() {
    hostIndicator.classList.add('hidden');
}

// Handle window resize for host indicator positioning
window.addEventListener('resize', () => {
    if (hostIndicator && !hostIndicator.classList.contains('hidden')) {
        updateHostIndicator();
    }
    if (nestIndicator && !nestIndicator.classList.contains('hidden')) {
        updateNestIndicator();
    }
    // Update all food positions on resize
    (gameState.foodItems || []).forEach(food => {
        const foodElement = document.getElementById(food.id);
        if (foodElement) {
            const grid = document.querySelector(`#layer-${food.layer} .grid`);
            if (grid) {
                foodElement.style.left = `${food.x}%`;
                foodElement.style.top = `${food.y}%`;
            }
        }
    });
});

// Change host layer with controllability check
function changeLayer(direction) {
    const isInfectionMove = canInfectedHostAct();
    if (!canHostAct() && !isInfectionMove) return;
    if (gameState.hostType === 'ghost_moth') {
        showScienceFact('鬼天蛾幼虫只能在地面层移动。');
        return;
    }
    const maxLayer = gameState.hostType === 'camponotus' ? 2 : 1;
    const newLayer = gameState.hostPosition.layer + direction;
    if (newLayer >= 0 && newLayer <= maxLayer) {
        const cost = isInfectionMove ? 0 : (gameState.firstLayerChangeFree ? 0 : 1);
        if (!isInfectionMove) gameState.firstLayerChangeFree = false;
        gameState.groundDashArmed = false;
        gameState.stepsTaken += cost;
        gameState.hostPosition.layer = newLayer;
        updateHostIndicator();
        
        // Update layer display
        if (currentLayerElement) {
            const layerNames = ['地面层', '植被层', '树冠层'];
            currentLayerElement.textContent = layerNames[newLayer] || '地面层';
        }
        
        updateHostStatusUI();
        if (isInfectionMove) {
            if (checkForFoodAtPosition()) {
                gameState.foodCollected += 1;
                updateHostStatusUI();
            }
        } else {
            settleHostAction();
        }
    } else if (newLayer > maxLayer) {
        showScienceFact(gameState.hostType === 'ponerine' ? '猛蚁不能进入树冠层。' : '切叶蚁只能在地面层和植被层移动。');
    }
}

function checkInfectedStepPenalty() {
    // V1 感染后只展示生物学阶段，不再应用移动伤害。
}

// Get detailed stage information based on fungus type
function getLegacyStageInfo(stage, fungusType = 'unilateralis', hostType = 'camponotus') {
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

const V1_INFECTION_STAGES = {
    unilateralis: [
        ['孢子附着', '孢子黏附木蚁外骨骼并开始萌发。'],
        ['穿透外骨骼', '菌丝结合酶和机械压力突破体壁。'],
        ['潜伏扩增', '真菌在宿主体内扩增并重塑代谢环境。'],
        ['行为操控', '真菌代谢活动干扰宿主神经与肌肉协同。'],
        ['异常移动与攀爬', '木蚁偏离正常路线并攀向有利于真菌繁殖的微环境。'],
        ['叶片死亡紧咬', '木蚁以异常咬合固定在叶片或叶脉附近。'],
        ['宿主死亡', '宿主死亡后菌丝继续利用组织并加固虫体。'],
        ['子实体生长与孢子释放', '子实体成熟并释放孢子，完成传播循环。']
    ],
    kimflemingiae: [
        ['孢子附着', '孢子黏附 Camponotus castaneus 外骨骼。'],
        ['穿透外骨骼', '菌丝突破体壁并进入宿主体内。'],
        ['潜伏扩增', '真菌在木蚁体内持续生长。'],
        ['行为操控', '感染改变木蚁的活动与路线选择。'],
        ['寻找树枝', '宿主移动到更符合该配对生态特征的树枝位置。'],
        ['树枝紧咬', '宿主咬住树枝固定身体，而非使用叶片紧咬叙事。'],
        ['宿主死亡', '宿主死亡后成为真菌继续发育的基质。'],
        ['子实体生长与孢子释放', '子实体成熟并释放下一代孢子。']
    ],
    australis: [
        ['孢子附着', '孢子接触猛蚁体表并开始萌发。'],
        ['穿透外骨骼', '菌丝突破体壁并建立感染。'],
        ['体内扩增', '真菌利用宿主营养持续生长。'],
        ['活动路线改变', '感染影响宿主活动与位置选择。'],
        ['抓附枝干', '宿主抓附在适合真菌继续发育的位置。'],
        ['宿主死亡', '宿主死亡后成为真菌发育的基质。'],
        ['子实体形成', '子实体从宿主体表长出并继续成熟。'],
        ['孢子释放', '成熟子实体释放孢子，完成传播循环。']
    ],
    metarhizium: [
        ['孢子黏附', '孢子黏附切叶蚁外骨骼。'],
        ['表皮萌发', '孢子萌发并形成侵入结构。'],
        ['穿透体壁', '菌丝结合酶和机械压力突破宿主体壁。'],
        ['体内增殖', '真菌在宿主体内扩增并消耗营养。'],
        ['普通真菌感染', '宿主活动下降；该过程不使用行为操控叙事。'],
        ['宿主死亡', '严重感染最终导致宿主死亡。'],
        ['体表产孢', '适宜条件下，真菌从宿主体表生长并产生孢子。']
    ],
    sinensis: [
        ['孢子附着', '孢子在土壤环境中接触鬼天蛾幼虫。'],
        ['进入幼虫体内', '真菌穿透体壁并建立感染。'],
        ['潜伏生长', '菌丝在幼虫体内缓慢生长。'],
        ['内部扩增', '真菌持续利用宿主营养并占据组织。'],
        ['幼虫木乃伊化', '幼虫组织被菌丝替代并形成木乃伊化虫体。'],
        ['子实体从土中生长', '子实体从埋藏的虫体向地表生长。'],
        ['孢子释放', '成熟子实体释放孢子，完成生命周期。']
    ]
};

function getInfectionStageCount(fungusType = gameState.fungusType) {
    return (V1_INFECTION_STAGES[fungusType] || V1_INFECTION_STAGES.unilateralis).length;
}

const V1_STAGE_REAL_TIMES = {
    unilateralis: ['接触后数小时内', '约 12–24 小时', '约第 1–3 天', '约第 4 天', '约第 4 天后段', '约第 4–5 天', '约第 5 天', '约第 7 天以后'],
    kimflemingiae: ['接触后数小时内', '约 12–24 小时', '约第 1–3 天', '约第 4 天', '约第 4 天后段', '约第 4–5 天', '约第 5 天', '约第 7 天以后'],
    australis: ['接触后数小时内', '约 12–24 小时', '约第 1–3 天', '约第 4 天', '约第 4–5 天', '约第 5 天', '数天以后', '子实体成熟后'],
    metarhizium: ['接触后数小时内', '约 12–24 小时', '约第 1–2 天', '约第 2–4 天', '约第 4–7 天', '严重感染后', '宿主死亡且环境适宜时'],
    sinensis: ['接触后的早期阶段', '数天至数周', '数周至数月', '数月尺度', '越冬前后', '次年生长季', '子实体成熟期']
};

function formatStageDuration(ms) {
    const totalSeconds = Math.max(1, Math.round(ms / 1000));
    if (totalSeconds >= 60) {
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return seconds ? `约 ${minutes} 分 ${seconds} 秒` : `约 ${minutes} 分钟`;
    }
    return `约 ${totalSeconds} 秒`;
}

function getStageInfo(stage, fungusType = 'unilateralis') {
    const stages = V1_INFECTION_STAGES[fungusType] || V1_INFECTION_STAGES.unilateralis;
    const stageIndex = Math.max(0, Math.min(stages.length - 1, Number(stage) - 1));
    const selected = stages[stageIndex];
    const realTimes = V1_STAGE_REAL_TIMES[fungusType] || V1_STAGE_REAL_TIMES.unilateralis;
    return {
        name: selected[0],
        time: realTimes[stageIndex] || '随宿主、环境与菌株而变化',
        realTime: formatStageDuration(getActiveStageDurationMs(fungusType, stage)),
        description: selected[1]
    };
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
    const totalStages = getInfectionStageCount(fungusType);
    const totalDurations = {
        unilateralis: 225000,
        kimflemingiae: 225000,
        australis: 225000,
        metarhizium: 210000,
        sinensis: 360000
    };
    const totalDuration = totalDurations[fungusType] || 225000;
    return {
        totalDuration,
        stageDurations: Array(totalStages).fill(totalDuration / totalStages)
    };
}

function getStageDurationMs(fungusType = gameState.fungusType, stage = gameState.currentInfectionStage) {
    const durations = getStageDurations(fungusType, gameState.hostType).stageDurations;
    const index = Math.max(0, Math.min(durations.length - 1, Number(stage) - 1));
    return durations[index] || 30000;
}

// Update infection stage display with detailed information
function updateInfectionStageDisplay() {
    if (infectionStageElement && stageNumberElement) {
        infectionStageElement.classList.remove('hidden');
        stageNumberElement.textContent = gameState.currentInfectionStage;
        if (stageTotalElement) stageTotalElement.textContent = getInfectionStageCount();
        updateInfectionTimeComparison(0);
        
        // Show detailed stage information as warning
        const stageInfo = getStageInfo(gameState.currentInfectionStage, gameState.fungusType, gameState.hostType);
        let warningText = `⚠️ 阶段${gameState.currentInfectionStage}: ${stageInfo.name}\n`;
        warningText += `现实周期（示意）：${stageInfo.time}\n`;
        warningText += `模拟展示时间：${stageInfo.realTime}\n`;
        warningText += `${stageInfo.description}`;
        
        if (scienceFact) {
            scienceFact.innerHTML = warningText.replace(/\n/g, '<br>');
            scienceFact.classList.remove('hidden');
            
            if (scienceFactHideTimer) {
                clearTimeout(scienceFactHideTimer);
                scienceFactHideTimer = null;
            }
        }

        enrichCurrentStageWithRAG(gameState.currentInfectionStage);

        // Keep stage guide panel in sync if user has it open
        const stageGuidePanel = document.getElementById('stage-guide-panel');
        if (stageGuidePanel && !stageGuidePanel.classList.contains('hidden')) {
            renderStageGuidePanel('正在根据当前阶段刷新知识库补充...');
            hydrateStageGuideWithRAG();
        }
        
        gameState.isHostControllable = true;
        if (movementControls) movementControls.classList.remove('disabled');
        updateHostStatusUI();
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
        if (gameState.hostType === 'ghost_moth') {
            hostPos.layer = 0;
        } else if (gameState.hostType !== 'camponotus') {
            hostPos.layer = Math.min(1, hostPos.layer);
        }
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
