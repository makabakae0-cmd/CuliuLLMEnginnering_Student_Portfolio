const fs = require('fs');
const path = require('path');

const feature = {
    name: 'host-ai-decision',
    keyFiles: ['index.html', 'static/script.js', 'backend/flask_glm5_server.py'],
    domIds: ['host-controls', 'movement-controls', 'current-layer', 'step-count', 'host-skill-status', 'burrow-btn'],
    functions: [
        'startHostPhase',
        'setupMovementControls',
        'moveHost',
        'changeLayer',
        'activateBurrow',
        'settleHostAction',
        'resolveSporeExposure',
        'buildHostAISnapshot',
        'decideHostMoveAI',
        'normalizeHostAIAction',
        'repairHostAction',
        'getSmartFallbackHostMove',
        'getGreedyHostMove'
    ],
    backendRoutes: ['/api/generate'],
    forbiddenHostSnapshotAnchors: ['spore positions', 'nearest spore distance', 'spore counts by layer', 'hidden trap hints'],
    pipeline: [
        { id: 'snapshot', reads: ['hostPosition', 'nestPosition', 'stepsTaken', 'hostHistory'], writes: ['hostAISnapshot'], requires: ['buildHostAISnapshot'], produces: ['public host decision snapshot'] },
        { id: 'call-ai', reads: ['hostAISnapshot', '/api/generate'], writes: ['rawHostAction'], requires: ['decideHostMoveAI'], produces: ['candidate host action JSON'] },
        { id: 'normalize', reads: ['rawHostAction'], writes: ['normalizedHostAction'], requires: ['normalizeHostAIAction', 'repairHostAction'], produces: ['valid move, layer, or burrow action'] },
        { id: 'fallback', reads: ['invalid action', 'hostPosition'], writes: ['safeHostAction'], requires: ['getSmartFallbackHostMove', 'getGreedyHostMove'], produces: ['deterministic safe action'] }
    ],
    minimalState: ['hostPosition', 'nestPosition', 'stepsTaken', 'maxSteps', 'isHostControllable', 'hostHistory', 'lastHostAction'],
    inputs: ['public host snapshot', '/api/generate response', 'movement controls'],
    outputs: ['move action', 'layer action', 'host position update', 'action history'],
    validations: [
        { id: 'symbols-exist', category: 'existence', checks: ['keyFiles', 'domIds', 'functions', 'backendRoutes'] },
        { id: 'host-action-schema', category: 'io', checks: ['move.direction', 'layer.delta', 'burrow.direction', 'triggered groom decision'] },
        { id: 'host-privacy', category: 'privacy', checks: ['no hidden spore data in snapshot'] },
        { id: 'host-fallback', category: 'fallback', checks: ['repairHostAction', 'getSmartFallbackHostMove'] },
        { id: 'movement-bounds', category: 'boundary', checks: ['map bounds', 'layer bounds', 'step limit'] }
    ],
    fallbacks: ['repairHostAction', 'getSmartFallbackHostMove', 'getGreedyHostMove'],
    invariants: [
        'Host AI must not receive hidden spore positions or trap hints.',
        'Actions must normalize to move, layer, or burrow JSON; Groom is only offered after exposure.',
        'Invalid model output must fall back to deterministic movement.',
        'Movement must respect map boundaries, host layer rules, Burrow cooldown, and the 15-step limit.'
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
    const snapshotStart = script.indexOf('function buildHostAISnapshot');
    const snapshotEnd = script.indexOf('function getProjectedHostPosition', snapshotStart);
    const snapshotBody = snapshotStart >= 0 && snapshotEnd > snapshotStart
        ? script.slice(snapshotStart, snapshotEnd)
        : '';

    ['spores', 'nearestSpore', 'sporeCounts'].forEach((anchor) => {
        if (snapshotBody.includes(anchor)) {
            pushMissing(missing, 'static/script.js', anchor, 'privacyRisk');
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
