const fs = require('fs');
const path = require('path');

const feature = {
    name: 'infection-simulation',
    keyFiles: ['index.html', 'static/script.js', 'backend/flask_glm5_server.py'],
    domIds: [
        'infection-controls',
        'infection-stage',
        'stage-number',
        'stage-total',
        'stage-guide-btn',
        'stage-guide-panel',
        'stage-guide-content'
    ],
    functions: [
        'enterInfectionMode',
        'startInfectionLoop',
        'pauseSimulation',
        'resumeSimulation',
        'speedUpSimulation',
        'getStageInfo',
        'getInfectionStageCount',
        'updateInfectionStageDisplay',
        'toggleStageGuide',
        'hydrateStageGuideWithRAG',
        'enrichCurrentStageWithRAG'
    ],
    backendRoutes: ['/api/rag/ask'],
    pipeline: [
        { id: 'enter', reads: ['valid spore encounter'], writes: ['isInfectionMode', 'infectionStep'], requires: ['enterInfectionMode'], produces: ['infection controls visible'] },
        { id: 'tick', reads: ['stageStartTime', 'simulationSpeed'], writes: ['currentInfectionStage'], requires: ['startInfectionLoop'], produces: ['biology timeline progress'] },
        { id: 'stage', reads: ['fungusType', 'currentInfectionStage'], writes: ['stage display'], requires: ['getStageInfo', 'getInfectionStageCount', 'updateInfectionStageDisplay'], produces: ['pairing-specific stage display'] },
        { id: 'controls', reads: ['pause state', 'speed'], writes: ['timer state'], requires: ['pauseSimulation', 'resumeSimulation', 'speedUpSimulation'], produces: ['single active timer'] },
        { id: 'result', reads: ['completed infection timeline'], writes: ['result screen'], requires: ['showResult'], produces: ['fungus victory'] }
    ],
    minimalState: ['isInfectionMode', 'currentInfectionStage', 'stageStartTime', 'simulationTimer', 'simulationSpeed'],
    inputs: ['valid spore infection trigger', 'simulation speed', 'fungus pairing'],
    outputs: ['infection stage display', 'stage guide', 'fungus result screen'],
    validations: [
        { id: 'symbols-exist', category: 'existence', checks: ['keyFiles', 'domIds', 'functions', 'backendRoutes'] },
        { id: 'infection-state-io', category: 'io', checks: ['dynamic stage display', 'result screen'] },
        { id: 'stage-bounds', category: 'boundary', checks: ['stage 1..7 or 1..8'] },
        { id: 'timer-singleton', category: 'boundary', checks: ['pause resume speed do not duplicate timers'] },
        { id: 'rag-fallback', category: 'fallback', checks: ['local stage guide when RAG unavailable'] },
        { id: 'victory-result', category: 'result', checks: ['infection means fungus victory'] }
    ],
    fallbacks: ['local stage guide text', 'RAG unavailable display'],
    invariants: [
        'Stage numbers must stay within the active fungus timeline.',
        'O. sinensis uses seven direct stages; ant fungi use eight.',
        'Pause, resume, and speed controls must not create duplicate timers.',
        'Stage guide should work with local text when RAG is unavailable.',
        'Final results should stop active simulation timers.'
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

    feature.backendRoutes.forEach((route) => {
        if (!files['backend/flask_glm5_server.py'] || !files['backend/flask_glm5_server.py'].includes(route)) {
            pushMissing(missing, 'backend/flask_glm5_server.py', route, 'backendRoute');
        }
    });

    const script = files['static/script.js'] || '';
    ['ghost_moth', 'sinensis', 'stageDurations', 'currentInfectionStage'].forEach((anchor) => {
        if (!script.includes(anchor)) {
            pushMissing(missing, 'static/script.js', anchor, 'infectionAnchor');
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
