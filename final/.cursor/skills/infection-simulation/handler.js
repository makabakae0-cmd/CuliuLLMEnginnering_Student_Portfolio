const fs = require('fs');
const path = require('path');

const feature = {
    name: 'infection-simulation',
    keyFiles: ['index.html', 'static/script.js', 'backend/flask_glm5_server.py'],
    domIds: [
        'infection-controls',
        'infection-stage',
        'stage-number',
        'timer-display',
        'survival-counter',
        'survival-days',
        'health-days',
        'stage-guide-btn',
        'stage-guide-panel',
        'stage-guide-content'
    ],
    functions: [
        'enterInfectionMode',
        'startInfectionLoop',
        'runInfectionSimulation',
        'pauseSimulation',
        'resumeSimulation',
        'speedUpSimulation',
        'getStageInfo',
        'getStageDurations',
        'updateInfectionStageDisplay',
        'advanceInfectionStage',
        'toggleStageGuide',
        'hydrateStageGuideWithRAG',
        'enrichCurrentStageWithRAG'
    ],
    backendRoutes: ['/api/rag/ask'],
    pipeline: [
        { id: 'enter', reads: ['spore encounter', 'step limit'], writes: ['isInfectionMode', 'infectionStep'], requires: ['enterInfectionMode'], produces: ['infection controls visible'] },
        { id: 'tick', reads: ['simulationSpeed', 'infectionLastTickTs'], writes: ['infectionDaysSurvived', 'infectionHealthDays'], requires: ['startInfectionLoop'], produces: ['updated survival state'] },
        { id: 'stage', reads: ['infectionDaysSurvived', 'infectionGoalDays'], writes: ['currentInfectionStage'], requires: ['getStageInfo', 'updateInfectionStageDisplay'], produces: ['current stage display'] },
        { id: 'controls', reads: ['pause state', 'speed'], writes: ['timer state'], requires: ['pauseSimulation', 'resumeSimulation', 'speedUpSimulation'], produces: ['single active timer'] },
        { id: 'result', reads: ['health days', 'goal days'], writes: ['result screen'], requires: ['showResult'], produces: ['host or fungus victory'] }
    ],
    minimalState: ['isInfectionMode', 'currentInfectionStage', 'infectionDaysSurvived', 'infectionHealthDays', 'infectionGoalDays', 'simulationTimer', 'simulationSpeed', 'isHostControllable'],
    inputs: ['infection trigger', 'simulation speed', 'food collection', 'infected movement penalty'],
    outputs: ['infection stage display', 'survival counter', 'health display', 'stage guide', 'result screen'],
    validations: [
        { id: 'symbols-exist', category: 'existence', checks: ['keyFiles', 'domIds', 'functions', 'backendRoutes'] },
        { id: 'infection-state-io', category: 'io', checks: ['stage display', 'survival days', 'health days', 'result screen'] },
        { id: 'stage-bounds', category: 'boundary', checks: ['stage 1..8', 'skipped stages safe'] },
        { id: 'timer-singleton', category: 'boundary', checks: ['pause resume speed do not duplicate timers'] },
        { id: 'rag-fallback', category: 'fallback', checks: ['local stage guide when RAG unavailable'] },
        { id: 'victory-result', category: 'result', checks: ['health depletion', 'survival goal'] }
    ],
    fallbacks: ['local stage guide text', 'RAG unavailable display'],
    invariants: [
        'Stage numbers must stay in 1..8.',
        'Skipped stages must not break stage display or victory handling.',
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
