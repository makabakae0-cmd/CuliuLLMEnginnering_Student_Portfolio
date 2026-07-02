const http = require('http');

const DEFAULT_ENDPOINT = process.env.SKILL_PLANNER_ENDPOINT || 'http://127.0.0.1:8002/api/generate';

function getRouter() {
    return require('./router');
}

function toCompactFeature(feature) {
    return {
        name: feature.name,
        pipeline: (feature.pipeline || []).map((step) => ({
            id: step.id,
            reads: step.reads,
            writes: step.writes,
            requires: step.requires,
            produces: step.produces
        })),
        inputs: feature.inputs || [],
        outputs: feature.outputs || [],
        validations: (feature.validations || []).map((validation) => ({
            id: validation.id,
            category: validation.category,
            checks: validation.checks
        })),
        fallbacks: feature.fallbacks || [],
        invariants: feature.invariants || []
    };
}

function buildPlannerContext() {
    const { listHandlers, getFeature } = getRouter();
    const skills = listHandlers().map((entry) => toCompactFeature(getFeature(entry.name)));
    return {
        policy: {
            decisionMode: 'llm-required',
            codeRole: 'validate schema and contract only; never make semantic skill decisions',
            fallbackSkillSelectionAllowed: false
        },
        skills
    };
}

function buildPlannerPrompt(userRequest, context = buildPlannerContext()) {
    return [
        'You are the LLM Skill Planner for the Fungi Simulator project.',
        'Choose the best project skill and pipeline steps for the user request.',
        'Do not execute code. Return strict JSON only. No Markdown.',
        '',
        'Rules:',
        '- You, the LLM, must make the semantic skill decision.',
        '- Code will only validate your JSON against the registry and contracts.',
        '- If you are unsure, still choose the best registry skill and lower confidence.',
        '- Pick exactly one selectedSkill from the registry.',
        '- pipelineSteps must be ids that exist in the selected skill pipeline.',
        '- Include concise reason and confidence between 0 and 1.',
        '',
        'Output JSON schema:',
        JSON.stringify({
            selectedSkill: 'skill-name',
            pipelineSteps: ['pipeline-step-id'],
            intent: 'short_intent',
            requires: ['required runtime or API'],
            expectedInputs: ['input'],
            expectedOutputs: ['output'],
            confidence: 0.8,
            reason: 'Why this skill matches.'
        }),
        '',
        'User request:',
        userRequest,
        '',
        'Skill registry context:',
        JSON.stringify(context)
    ].join('\n');
}

function postJson(urlString, payload, timeoutMs = 90000) {
    return new Promise((resolve, reject) => {
        const url = new URL(urlString);
        const body = JSON.stringify(payload);
        const req = http.request({
            hostname: url.hostname,
            port: url.port || 80,
            path: `${url.pathname}${url.search}`,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(body)
            },
            timeout: timeoutMs
        }, (res) => {
            let data = '';
            res.setEncoding('utf8');
            res.on('data', (chunk) => {
                data += chunk;
            });
            res.on('end', () => {
                if (res.statusCode < 200 || res.statusCode >= 300) {
                    reject(new Error(`planner_http_${res.statusCode}: ${data}`));
                    return;
                }
                try {
                    resolve(JSON.parse(data));
                } catch (error) {
                    reject(new Error(`planner_invalid_json: ${error.message}`));
                }
            });
        });
        req.on('error', reject);
        req.on('timeout', () => {
            req.destroy(new Error('planner_request_timeout'));
        });
        req.write(body);
        req.end();
    });
}

function extractTextFromLLMResponse(raw) {
    if (typeof raw === 'string') return raw;
    const content = raw?.choices?.[0]?.message?.content;
    if (typeof content === 'string') return content;
    const text = raw?.text || raw?.content;
    return typeof text === 'string' ? text : JSON.stringify(raw);
}

function tryParseJsonObject(text) {
    if (!text || typeof text !== 'string') return null;
    try {
        return JSON.parse(text);
    } catch (_) {
        const match = text.match(/\{[\s\S]*\}/);
        if (!match) return null;
        try {
            return JSON.parse(match[0]);
        } catch (error) {
            return null;
        }
    }
}

function getRegistryMap(context = buildPlannerContext()) {
    return new Map(context.skills.map((skill) => [skill.name, skill]));
}

function asArray(value) {
    if (Array.isArray(value)) return value.filter((item) => typeof item === 'string' && item.trim()).map((item) => item.trim());
    if (typeof value === 'string' && value.trim()) return [value.trim()];
    return [];
}

function normalizeSkillDecision(raw, registry = getRegistryMap()) {
    const selectedSkill = String(raw?.selectedSkill || raw?.skill || raw?.name || '').trim();
    const skill = registry.get(selectedSkill);
    const pipelineSteps = asArray(raw?.pipelineSteps || raw?.steps);
    const defaultSteps = skill ? skill.pipeline.map((step) => step.id) : [];
    const confidence = Number(raw?.confidence);

    return {
        selectedSkill,
        pipelineSteps: pipelineSteps.length > 0 ? pipelineSteps : defaultSteps,
        intent: String(raw?.intent || 'unspecified').trim(),
        requires: asArray(raw?.requires),
        expectedInputs: asArray(raw?.expectedInputs || raw?.inputs),
        expectedOutputs: asArray(raw?.expectedOutputs || raw?.outputs),
        confidence: Number.isFinite(confidence) ? Math.max(0, Math.min(1, confidence)) : 0,
        reason: String(raw?.reason || '').trim(),
        source: 'llm'
    };
}

function validateSkillDecision(decision, registry = getRegistryMap()) {
    const issues = [];
    const skill = registry.get(decision.selectedSkill);
    if (!skill) {
        issues.push({ type: 'unknownSkill', message: `Unknown skill: ${decision.selectedSkill}` });
        return { ok: false, issues };
    }

    const allowedSteps = new Set(skill.pipeline.map((step) => step.id));
    decision.pipelineSteps.forEach((stepId) => {
        if (!allowedSteps.has(stepId)) {
            issues.push({ type: 'unknownPipelineStep', message: `Unknown pipeline step for ${decision.selectedSkill}: ${stepId}` });
        }
    });

    if (decision.pipelineSteps.length === 0) {
        issues.push({ type: 'emptyPipeline', message: 'Decision must include at least one pipeline step' });
    }
    if (!decision.reason) {
        issues.push({ type: 'missingReason', message: 'Decision must include a reason' });
    }
    if (decision.source !== 'llm') {
        issues.push({ type: 'invalidSource', message: 'Decision source must be llm' });
    }

    return { ok: issues.length === 0, issues };
}

function buildLLMRequiredFailure(reason, details = {}) {
    return {
        ok: false,
        decision: null,
        validation: {
            ok: false,
            issues: [{ type: 'llmRequired', message: reason }]
        },
        ...details
    };
}

async function decideSkillWithLLM(userRequest, options = {}) {
    const context = options.context || buildPlannerContext();
    const registry = getRegistryMap(context);
    const prompt = buildPlannerPrompt(userRequest, context);

    try {
        const rawResponse = await postJson(options.endpoint || DEFAULT_ENDPOINT, {
            prompt,
            temperature: options.temperature ?? 0.1,
            max_tokens: options.max_tokens ?? 1200
        }, options.timeoutMs || 90000);
        const parsed = tryParseJsonObject(extractTextFromLLMResponse(rawResponse));
        const decision = normalizeSkillDecision(parsed, registry);
        const validation = validateSkillDecision(decision, registry);
        if (validation.ok) {
            return { ok: true, decision, validation, raw: rawResponse };
        }
        return buildLLMRequiredFailure('LLM returned a decision that failed contract validation.', {
            llmDecision: decision,
            llmValidation: validation,
            raw: rawResponse,
        });
    } catch (error) {
        return buildLLMRequiredFailure('LLM planner is required but unavailable.', {
            error: error.message || String(error),
        });
    }
}

module.exports = {
    buildPlannerContext,
    buildPlannerPrompt,
    decideSkillWithLLM,
    normalizeSkillDecision,
    validateSkillDecision,
    buildLLMRequiredFailure
};
