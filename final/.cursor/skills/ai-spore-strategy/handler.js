const fs = require('fs');
const path = require('path');

const feature = {
    name: 'ai-spore-strategy',
    keyFiles: ['index.html', 'static/script.js', 'backend/flask_glm5_server.py'],
    domIds: ['fungus-controls', 'spore-count', 'loading-overlay', 'loading-text'],
    functions: [
        'buildFungusAIStrategyContext',
        'generateAISpores',
        'callGLMAPI',
        'parseDeployments',
        'normalizeSporeDeployments',
        'buildFallbackSporeDeployment',
        'buildCoverageSpore',
        'isNearNestDefenseZone',
        'ensureValidSporeDeployment',
        'randomSporeDeployment',
        'confirmSporeDeployment',
        'renderSpore',
        'updateSporeCount'
    ],
    backendRoutes: ['/api/generate'],
    pipeline: [
        { id: 'build-context', reads: ['fungusType', 'environment', 'nestPosition', 'mapBounds'], writes: ['fungusAIStrategyContext'], requires: ['buildFungusAIStrategyContext'], produces: ['fair fungus context without host spawn'] },
        { id: 'call-ai', reads: ['fungusAIStrategyContext', '/api/generate'], writes: ['rawDeploymentResponse'], requires: ['callGLMAPI'], produces: ['candidate deployment JSON'] },
        { id: 'normalize', reads: ['rawDeploymentResponse'], writes: ['normalizedSpores'], requires: ['parseDeployments', 'normalizeSporeDeployments'], produces: ['10 valid spores'] },
        { id: 'render', reads: ['normalizedSpores'], writes: ['spore DOM', 'spore count'], requires: ['renderSpore', 'updateSporeCount'], produces: ['visible deployment'] }
    ],
    minimalState: ['fungusType', 'environment', 'nestPosition', 'mapBounds', 'layerNames', 'sporeCount'],
    inputs: ['setup selections', 'map bounds', '/api/generate response'],
    outputs: ['normalized spore deployments', 'rendered spores', 'validation summary'],
    validations: [
        { id: 'symbols-exist', category: 'existence', checks: ['keyFiles', 'domIds', 'functions', 'backendRoutes'] },
        { id: 'spore-json-schema', category: 'io', checks: ['layer', 'x', 'y', 'strategy'] },
        { id: 'fungus-privacy', category: 'privacy', checks: ['no hostPosition in fungus context or prompt'] },
        { id: 'fallback-deployment', category: 'fallback', checks: ['buildFallbackSporeDeployment', 'randomSporeDeployment'] },
        { id: 'spore-bounds', category: 'boundary', checks: ['layer 0..2', 'coordinates 0..100', 'exactly 10 spores'] }
    ],
    fallbacks: ['buildFallbackSporeDeployment', 'randomSporeDeployment', 'ensureValidSporeDeployment'],
    invariants: [
        'AI deployment should normalize to exactly 10 spores.',
        'Spore x/y coordinates must remain in 0..100.',
        'Spore layer must remain in 0..2.',
        'Fungus AI must not receive host spawn coordinates.',
        'Failed AI generation should leave manual or fallback deployment usable.',
        'Deployment confirmation should repair the board to 10 valid spores before host phase.'
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
    const contextStart = script.indexOf('function buildFungusAIStrategyContext');
    const contextEnd = script.indexOf('// Call GLM-5 API', contextStart);
    const fungusContextBody = contextStart >= 0 && contextEnd > contextStart
        ? script.slice(contextStart, contextEnd)
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
