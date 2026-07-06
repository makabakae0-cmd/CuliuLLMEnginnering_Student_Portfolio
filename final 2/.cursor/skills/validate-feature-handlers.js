const path = require('path');
const fs = require('fs');
const { validateAll } = require('./router');

const skillsDir = __dirname;
const projectRoot = path.resolve(skillsDir, '../..');

function validatePlanner() {
    const plannerPath = path.join(skillsDir, 'llm-planner.js');
    const issues = [];
    if (!fs.existsSync(plannerPath)) {
        return {
            ok: false,
            issues: [{ type: 'plannerMissing', message: 'Missing .cursor/skills/llm-planner.js' }]
        };
    }

    const planner = require(plannerPath);
    [
        'buildPlannerContext',
        'buildPlannerPrompt',
        'decideSkillWithLLM',
        'normalizeSkillDecision',
        'validateSkillDecision',
        'buildLLMRequiredFailure'
    ].forEach((name) => {
        if (typeof planner[name] !== 'function') {
            issues.push({ type: 'plannerExportMissing', message: `Missing planner export: ${name}` });
        }
    });

    if (typeof planner.getFallbackSkillDecision === 'function') {
        issues.push({
            type: 'plannerFallbackDecisionPresent',
            message: 'Planner must not export a deterministic skill decision fallback.'
        });
    }

    if (issues.length === 0) {
        const failure = planner.buildLLMRequiredFailure('LLM is required for skill decisions.');
        if (failure.ok !== false || failure.decision !== null || failure.validation?.issues?.[0]?.type !== 'llmRequired') {
            issues.push({
                type: 'plannerSmokeFailed',
                message: 'Planner must fail closed when no LLM decision is available.',
                failure
            });
        }
    }

    return {
        ok: issues.length === 0,
        issues
    };
}

function summarize(result) {
    const issueCounts = {};
    result.results.forEach((item) => {
        (item.contract?.issues || []).forEach((issue) => {
            issueCounts[issue.type] = (issueCounts[issue.type] || 0) + 1;
        });
    });

    return {
        ok: result.ok,
        handlerCount: result.results.length,
        contractOk: result.results.every((item) => item.contract?.ok),
        plannerOk: result.planner?.ok === true,
        issueCounts
    };
}

if (require.main === module) {
    const result = validateAll(projectRoot);
    result.planner = validatePlanner();
    result.ok = result.ok && result.planner.ok;
    console.log(JSON.stringify({ summary: summarize(result), ...result }, null, 2));
    process.exit(result.ok ? 0 : 1);
}

module.exports = { validateAll, summarize, validatePlanner };
