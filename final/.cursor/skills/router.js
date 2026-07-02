const fs = require('fs');
const path = require('path');

const skillsDir = __dirname;
const projectRoot = path.resolve(skillsDir, '../..');

function getHandlerPaths() {
    return fs.readdirSync(skillsDir, { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .map((entry) => path.join(skillsDir, entry.name, 'handler.js'))
        .filter((handlerPath) => fs.existsSync(handlerPath))
        .sort();
}

function loadHandler(handlerPath) {
    const handler = require(handlerPath);
    if (!handler || typeof handler !== 'object') {
        throw new Error(`Handler did not export an object: ${handlerPath}`);
    }
    if (!handler.feature || typeof handler.feature.name !== 'string') {
        throw new Error(`Handler missing feature.name: ${handlerPath}`);
    }
    if (typeof handler.validateProject !== 'function') {
        throw new Error(`Handler missing validateProject(root): ${handlerPath}`);
    }
    return handler;
}

function buildRegistry() {
    const registry = new Map();

    getHandlerPaths().forEach((handlerPath) => {
        const handler = loadHandler(handlerPath);
        const name = handler.feature.name;
        if (registry.has(name)) {
            throw new Error(`Duplicate skill handler name: ${name}`);
        }
        registry.set(name, {
            name,
            directory: path.basename(path.dirname(handlerPath)),
            handlerPath,
            handler
        });
    });

    return registry;
}

function listHandlers() {
    return Array.from(buildRegistry().values()).map((entry) => ({
        name: entry.name,
        directory: entry.directory,
        handler: path.relative(projectRoot, entry.handlerPath)
    }));
}

function getRegistryEntry(name) {
    const registry = buildRegistry();
    const entry = registry.get(name);
    if (!entry) {
        const available = Array.from(registry.keys()).sort().join(', ');
        throw new Error(`Unknown skill handler "${name}". Available: ${available}`);
    }
    return entry;
}

function pushContractIssue(issues, type, message, anchor) {
    issues.push({ type, message, anchor });
}

function isNonEmptyArray(value) {
    return Array.isArray(value) && value.length > 0;
}

function validatePipelineStep(step, index, issues) {
    if (!step || typeof step !== 'object') {
        pushContractIssue(issues, 'pipelineInvalid', `Pipeline step ${index} must be an object`, `pipeline[${index}]`);
        return;
    }

    ['id', 'reads', 'writes', 'requires', 'produces'].forEach((field) => {
        const value = step[field];
        const valid = field === 'id'
            ? typeof value === 'string' && value.trim().length > 0
            : isNonEmptyArray(value);
        if (!valid) {
            pushContractIssue(
                issues,
                'pipelineInvalid',
                `Pipeline step ${step.id || index} missing non-empty ${field}`,
                `pipeline[${index}].${field}`
            );
        }
    });
}

function validateFeatureContract(entry) {
    const issues = [];
    const { feature } = entry.handler;
    const requiredFields = ['name', 'keyFiles', 'pipeline', 'minimalState', 'inputs', 'outputs', 'validations', 'fallbacks'];

    if (feature.name !== entry.directory) {
        pushContractIssue(
            issues,
            'contractMissing',
            `Feature name "${feature.name}" must match directory "${entry.directory}"`,
            'feature.name'
        );
    }

    requiredFields.forEach((field) => {
        if (!(field in feature)) {
            pushContractIssue(issues, 'contractMissing', `Missing required contract field: ${field}`, field);
            return;
        }
        if (field !== 'name' && !isNonEmptyArray(feature[field])) {
            pushContractIssue(issues, field === 'minimalState' ? 'stateTooBroad' : 'contractMissing', `${field} must be a non-empty array`, field);
        }
    });

    if (Array.isArray(feature.pipeline)) {
        if (feature.pipeline.length < 2) {
            pushContractIssue(issues, 'pipelineInvalid', 'Pipeline must contain at least two steps', 'pipeline');
        }
        feature.pipeline.forEach((step, index) => validatePipelineStep(step, index, issues));
    }

    if (Array.isArray(feature.inputs) && Array.isArray(feature.outputs) && (feature.inputs.length === 0 || feature.outputs.length === 0)) {
        pushContractIssue(issues, 'ioMismatch', 'inputs and outputs must both be non-empty', 'inputs/outputs');
    }

    if (Array.isArray(feature.validations)) {
        const categories = new Set(feature.validations.map((validation) => validation && validation.category).filter(Boolean));
        ['existence', 'io'].forEach((category) => {
            if (!categories.has(category)) {
                pushContractIssue(issues, 'validationMissing', `Missing validation category: ${category}`, 'validations');
            }
        });
        if (!['fallback', 'privacy', 'boundary', 'result'].some((category) => categories.has(category))) {
            pushContractIssue(issues, 'validationMissing', 'Missing feature-specific validation category', 'validations');
        }
        feature.validations.forEach((validation, index) => {
            if (!validation || typeof validation !== 'object') {
                pushContractIssue(issues, 'validationMissing', `Validation ${index} must be an object`, `validations[${index}]`);
                return;
            }
            ['id', 'category', 'checks'].forEach((field) => {
                const value = validation[field];
                const valid = field === 'checks'
                    ? isNonEmptyArray(value)
                    : typeof value === 'string' && value.trim().length > 0;
                if (!valid) {
                    pushContractIssue(issues, 'validationMissing', `Validation ${validation.id || index} missing ${field}`, `validations[${index}].${field}`);
                }
            });
        });
    }

    return {
        ok: issues.length === 0,
        issues
    };
}

function getHandler(name) {
    return getRegistryEntry(name).handler;
}

function getFeature(name) {
    return getHandler(name).feature;
}

function validateOne(name, root = projectRoot) {
    const entry = getRegistryEntry(name);
    const result = entry.handler.validateProject(root);
    const contract = validateFeatureContract(entry);
    return {
        handler: path.relative(root, entry.handlerPath),
        ...result,
        contract,
        ok: result.ok && contract.ok
    };
}

function validateAll(root = projectRoot) {
    const registry = buildRegistry();
    const results = Array.from(registry.values()).map((entry) => {
        const result = entry.handler.validateProject(root);
        const contract = validateFeatureContract(entry);
        return {
            handler: path.relative(root, entry.handlerPath),
            ...result,
            contract,
            ok: result.ok && contract.ok
        };
    });

    return {
        ok: results.every((result) => result.ok),
        results
    };
}

function printJson(value) {
    console.log(JSON.stringify(value, null, 2));
}

async function runCli(argv) {
    const [command, name] = argv;

    if (!command || command === 'list') {
        printJson({ ok: true, handlers: listHandlers() });
        return 0;
    }

    if (command === 'feature') {
        if (!name) throw new Error('Usage: node .cursor/skills/router.js feature <name>');
        printJson({ ok: true, feature: getFeature(name) });
        return 0;
    }

    if (command === 'check') {
        if (!name) throw new Error('Usage: node .cursor/skills/router.js check <name>');
        const result = validateOne(name, projectRoot);
        printJson(result);
        return result.ok ? 0 : 1;
    }

    if (command === 'check-all') {
        const result = validateAll(projectRoot);
        printJson(result);
        return result.ok ? 0 : 1;
    }

    if (command === 'plan') {
        const userRequest = argv.slice(1).join(' ').trim();
        if (!userRequest) throw new Error('Usage: node .cursor/skills/router.js plan <user_request>');
        const { decideSkillWithLLM } = require('./llm-planner');
        const result = await decideSkillWithLLM(userRequest);
        printJson(result);
        return result.validation?.ok ? 0 : 1;
    }

    if (command === 'plan-offline') {
        const userRequest = argv.slice(1).join(' ').trim();
        if (!userRequest) throw new Error('Usage: node .cursor/skills/router.js plan-offline <user_request>');
        const { buildLLMRequiredFailure } = require('./llm-planner');
        const result = buildLLMRequiredFailure('Offline skill planning is disabled because skill decisions must be made by the LLM.', {
            userRequest
        });
        printJson(result);
        return 1;
    }

    throw new Error(`Unknown command "${command}". Use list, feature, check, check-all, plan, or plan-offline.`);
}

module.exports = {
    listHandlers,
    getHandler,
    getFeature,
    validateOne,
    validateAll,
    validateFeatureContract
};

if (require.main === module) {
    runCli(process.argv.slice(2))
        .then((exitCode) => process.exit(exitCode))
        .catch((error) => {
            console.error(error.message || error);
            process.exit(1);
        });
}
