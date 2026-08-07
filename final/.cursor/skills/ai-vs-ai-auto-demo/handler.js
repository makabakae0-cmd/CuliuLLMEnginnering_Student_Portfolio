const fs = require('fs');
const path = require('path');

const feature = {
    name: 'ai-vs-ai-auto-demo',
    keyFiles: ['index.html', 'static/script.js', 'static/style.css', 'backend/flask_glm5_server.py'],
    domIds: ['start-auto-demo-home-btn', 'start-auto-demo-setup-btn', 'auto-demo-banner', 'auto-demo-status', 'stop-auto-demo-btn'],
    functions: [
        'startAutoDemo',
        'stopAutoDemo',
        'prepareAutoDemoGame',
        'runAutoDemoSequence',
        'runHostAIDemoLoop',
        'runInfectionDemoPhase',
        'setDemoStatus',
        'showDemoBanner',
        'setDemoButtonsDisabled',
        'buildFungusAIStrategyContext',
        'decideHostMoveAI',
        'generateAISpores',
        'generateAICommentary'
    ],
    constants: ['AUTO_DEMO_STEP_DELAY_MS', 'AUTO_DEMO_INFECTION_SPEED_MS', 'AUTO_DEMO_INFECTION_MAX_MS'],
    styleClasses: ['home-demo-btn', 'demo-setup-btn', 'auto-demo-banner', 'auto-demo-badge', 'auto-demo-stop-btn'],
    backendRoutes: ['/api/generate'],
    pipeline: [
        { id: 'prepare', reads: ['setup defaults', 'result screen', 'timer handles'], writes: ['autoDemo token', 'demo game state'], requires: ['startAutoDemo', 'prepareAutoDemoGame'], produces: ['ready demo board'] },
        { id: 'fungus-ai', reads: ['fungus context', '/api/generate'], writes: ['spore deployments'], requires: ['generateAISpores', 'buildFungusAIStrategyContext'], produces: ['visible spores'] },
        { id: 'host-ai', reads: ['host snapshot', '/api/generate'], writes: ['host movement'], requires: ['runHostAIDemoLoop', 'decideHostMoveAI'], produces: ['nest arrival or infection mode'] },
        { id: 'infection-commentary', reads: ['infection state'], writes: ['commentary panel', 'biology timeline'], requires: ['runInfectionDemoPhase', 'generateAICommentary'], produces: ['infection analysis'] },
        { id: 'settle', reads: ['result screen', 'infection timer'], writes: ['final result'], requires: ['forceAutoDemoResult', 'waitForDemoResult', 'stopAutoDemo'], produces: ['host or fungus victory'] }
    ],
    minimalState: ['active', 'token', 'timers', 'hostHistory', 'infectedHostHistory', 'savedSimulationSpeed', 'lastHostAction', 'noProgressCount', 'lastSporeValidationSummary'],
    inputs: ['demo entry buttons', 'legal setup pairing', 'spore AI output', 'host AI output'],
    outputs: ['auto demo status', 'action highlights', 'spore highlights', 'host movement', 'infection timeline', 'result screen'],
    validations: [
        { id: 'symbols-exist', category: 'existence', checks: ['keyFiles', 'domIds', 'functions', 'constants', 'styleClasses', 'backendRoutes'] },
        { id: 'demo-action-io', category: 'io', checks: ['fungus spores', 'host move|layer|burrow', 'triggered groom'] },
        { id: 'privacy', category: 'privacy', checks: ['fungus no host spawn', 'host no hidden spores'] },
        { id: 'ai-fallbacks', category: 'fallback', checks: ['spore fallback', 'host fallback', 'local commentary'] },
        { id: 'result-protection', category: 'result', checks: ['no unresolved ending', 'stop clears timers', 'result screen stops loop'] }
    ],
    fallbacks: ['buildFallbackSporeDeployment', 'getSmartFallbackHostMove', 'getInfectedHostFallbackAction', 'buildLocalAICommentary', 'forceAutoDemoResult'],
    invariants: [
        'Both demo entry buttons should call startAutoDemo().',
        'Auto demo should show visible progress through setDemoStatus().',
        'Fungus AI must not receive host spawn coordinates.',
        'Host AI must not receive hidden spore positions.',
        'stopAutoDemo() must restore UI state and clear timers.',
        'AI failures should fall back without breaking the live demo.'
    ]
};

function readProjectFile(root, filePath) {
    const absolutePath = path.join(root, filePath);
    return fs.existsSync(absolutePath) ? fs.readFileSync(absolutePath, 'utf8') : null;
}

function pushMissing(missing, file, anchor, type) {
    missing.push({ file, anchor, type });
}

function validateProject(root = process.cwd()) {
    const missing = [];
    const files = {};

    feature.keyFiles.forEach((file) => {
        const content = readProjectFile(root, file);
        if (content === null) {
            pushMissing(missing, file, file, 'file');
        } else {
            files[file] = content;
        }
    });

    feature.domIds.forEach((id) => {
        if (!files['index.html'] || !files['index.html'].includes(`id="${id}"`)) {
            pushMissing(missing, 'index.html', id, 'domId');
        }
    });

    feature.functions.forEach((name) => {
        const pattern = new RegExp(`(?:async\\s+)?function\\s+${name}\\s*\\(`);
        if (!files['static/script.js'] || !pattern.test(files['static/script.js'])) {
            pushMissing(missing, 'static/script.js', name, 'function');
        }
    });

    feature.constants.forEach((name) => {
        if (!files['static/script.js'] || !files['static/script.js'].includes(name)) {
            pushMissing(missing, 'static/script.js', name, 'constant');
        }
    });

    feature.styleClasses.forEach((className) => {
        if (!files['static/style.css'] || !files['static/style.css'].includes(`.${className}`)) {
            pushMissing(missing, 'static/style.css', className, 'styleClass');
        }
    });

    feature.backendRoutes.forEach((route) => {
        if (!files['backend/flask_glm5_server.py'] || !files['backend/flask_glm5_server.py'].includes(route)) {
            pushMissing(missing, 'backend/flask_glm5_server.py', route, 'backendRoute');
        }
    });

    const script = files['static/script.js'] || '';
    const fungusContextStart = script.indexOf('function buildFungusAIStrategyContext');
    const fungusContextEnd = script.indexOf('// Call GLM-5 API', fungusContextStart);
    const fungusContextBody = fungusContextStart >= 0 && fungusContextEnd > fungusContextStart
        ? script.slice(fungusContextStart, fungusContextEnd)
        : '';
    ['gameState.hostPosition', 'hostPosition'].forEach((anchor) => {
        if (fungusContextBody.includes(anchor)) {
            pushMissing(missing, 'static/script.js', anchor, 'fungusPrivacyRisk');
        }
    });

    const promptStart = script.indexOf('async function callGLMAPI');
    const promptEnd = script.indexOf('// Parse deployments from API response', promptStart);
    const promptBody = promptStart >= 0 && promptEnd > promptStart
        ? script.slice(promptStart, promptEnd)
        : '';
    ['宿主起点', 'context.hostPosition', 'hostPosition'].forEach((anchor) => {
        if (promptBody.includes(anchor)) {
            pushMissing(missing, 'static/script.js', anchor, 'fungusPromptPrivacyRisk');
        }
    });

    return {
        ok: missing.length === 0,
        feature: feature.name,
        missing
    };
}

if (require.main === module) {
    const result = validateProject(process.cwd());
    console.log(JSON.stringify(result, null, 2));
    process.exit(result.ok ? 0 : 1);
}

module.exports = { feature, validateProject };
