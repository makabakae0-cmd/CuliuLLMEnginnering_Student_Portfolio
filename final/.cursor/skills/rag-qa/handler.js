const fs = require('fs');
const path = require('path');

const feature = {
    name: 'rag-qa',
    keyFiles: ['index.html', 'static/script.js', 'backend/flask_glm5_server.py'],
    domIds: ['rag-qa-section', 'rag-question-input', 'rag-ask-btn', 'rag-answer-panel', 'rag-answer-meta', 'rag-answer-content'],
    functions: ['checkRagHealth', 'askRagQuestion', 'fetchStageRagExplanation', 'hydrateStageGuideWithRAG'],
    constants: ['RAG_ASK_ENDPOINT', 'RAG_HEALTH_ENDPOINT'],
    backendRoutes: ['/api/rag/health', '/api/rag/ask'],
    pipeline: [
        { id: 'health', reads: ['RAG_HEALTH_ENDPOINT'], writes: ['rag health status'], requires: ['checkRagHealth'], produces: ['health indicator or readable error'] },
        { id: 'question', reads: ['rag-question-input'], writes: ['question payload'], requires: ['askRagQuestion'], produces: ['validated non-empty question'] },
        { id: 'retrieve', reads: ['/api/rag/ask'], writes: ['retrieved evidence'], requires: ['rag_ask backend route'], produces: ['evidence list and answer'] },
        { id: 'render', reads: ['answer payload'], writes: ['rag answer panel'], requires: ['rag-answer-panel'], produces: ['visible answer and metadata'] }
    ],
    minimalState: ['RAG_ASK_ENDPOINT', 'RAG_HEALTH_ENDPOINT', 'question input value', 'answer panel state', 'retrieved evidence metadata'],
    inputs: ['question text', '/api/rag/health response', '/api/rag/ask response'],
    outputs: ['health status', 'answer text', 'retrieved evidence', 'readable error state'],
    validations: [
        { id: 'symbols-exist', category: 'existence', checks: ['keyFiles', 'domIds', 'functions', 'constants', 'backendRoutes'] },
        { id: 'rag-io', category: 'io', checks: ['question', 'answer', 'retrieved'] },
        { id: 'empty-question', category: 'boundary', checks: ['do not call backend for empty question'] },
        { id: 'rag-error-fallback', category: 'fallback', checks: ['backend errors render in panel', 'optional dependency errors are clear'] },
        { id: 'grounding', category: 'result', checks: ['retrieved evidence visible with answer'] }
    ],
    fallbacks: ['readable panel error', 'local stage guide fallback', 'optional dependency health error'],
    invariants: [
        'Empty questions must not call the backend.',
        'RAG backend failures must render readable panel errors.',
        'Retrieved evidence should stay visible with answer text.',
        'Backend answers must be grounded in retrieved evidence.'
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

    feature.backendRoutes.forEach((route) => {
        if (!files['backend/flask_glm5_server.py'] || !files['backend/flask_glm5_server.py'].includes(route)) {
            pushMissing(missing, 'backend/flask_glm5_server.py', route, 'backendRoute');
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
