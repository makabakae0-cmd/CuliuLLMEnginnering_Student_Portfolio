const fs = require('fs');
const path = require('path');

const feature = {
    name: 'ai-commentary',
    keyFiles: ['index.html', 'static/script.js', 'backend/flask_glm5_server.py'],
    domIds: ['ai-commentary-btn', 'ai-commentary-panel', 'ai-commentary-meta', 'ai-commentary-content'],
    functions: [
        'buildAICommentarySnapshot',
        'buildAICommentaryMeta',
        'buildLocalAICommentary',
        'renderAICommentary',
        'showAutoDemoCommentaryPlaceholder',
        'buildFunnyTwoLiner',
        'generateAICommentary',
        'callLLM',
        'tryParseJsonObject',
        'extractTextFromLLMResponse'
    ],
    backendRoutes: ['/api/generate'],
    pipeline: [
        { id: 'snapshot', reads: ['infectionStage', 'survivalDays', 'healthDays', 'foodItems'], writes: ['aiCommentarySnapshot'], requires: ['buildAICommentarySnapshot'], produces: ['infection situation snapshot'] },
        { id: 'call-ai', reads: ['aiCommentarySnapshot', '/api/generate'], writes: ['rawCommentary'], requires: ['generateAICommentary', 'callLLM'], produces: ['candidate commentary JSON'] },
        { id: 'normalize', reads: ['rawCommentary'], writes: ['commentaryViewModel'], requires: ['tryParseJsonObject', 'buildFunnyTwoLiner'], produces: ['complete commentary fields'] },
        { id: 'render', reads: ['commentaryViewModel'], writes: ['ai commentary panel'], requires: ['renderAICommentary'], produces: ['visible analysis and prediction'] }
    ],
    minimalState: ['isInfectionMode', 'currentInfectionStage', 'infectionDaysSurvived', 'infectionHealthDays', 'hostType', 'fungusType', 'environment', 'foodItems'],
    inputs: ['infection snapshot', '/api/generate response'],
    outputs: ['situation summary', 'prediction', 'suggestions', 'funny two liner', 'local fallback commentary'],
    validations: [
        { id: 'symbols-exist', category: 'existence', checks: ['keyFiles', 'domIds', 'functions', 'backendRoutes'] },
        { id: 'commentary-schema', category: 'io', checks: ['funny_two_liner', 'situation_summary', 'prediction', 'suggestions'] },
        { id: 'infection-only', category: 'boundary', checks: ['only run during infection mode'] },
        { id: 'local-fallback', category: 'fallback', checks: ['buildLocalAICommentary', 'renderAICommentary'] },
        { id: 'snapshot-grounding', category: 'result', checks: ['no invented unavailable state'] }
    ],
    fallbacks: ['buildLocalAICommentary', 'showAutoDemoCommentaryPlaceholder'],
    invariants: [
        'Commentary should only run during infection mode.',
        'Invalid model output should still render useful fallback text.',
        'GLM failure should show local commentary instead of an empty panel.',
        'Auto-demo commentary must not block infection settlement indefinitely.',
        'Snapshot data should describe current state without invented facts.'
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
    ['funny_two_liner', 'situation_summary', 'prediction', 'suggestions'].forEach((anchor) => {
        if (!script.includes(anchor)) {
            pushMissing(missing, 'static/script.js', anchor, 'commentarySchema');
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
