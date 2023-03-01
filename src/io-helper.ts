import * as core from '@actions/core';
import {InputOptions} from '@actions/core';
import {context} from '@actions/github';
import {Inputs, Outputs} from './constants';

export interface ReleaseInputs {
    owner: string;
    repo: string;
    tag: string;

    type: 'commit' | 'tree' | 'blob';
    message: string;
    tag_sha: string;

    on_tag_exists: 'skip' | 'update' | 'warn' | 'error';

    debug: boolean;
}

export function isBlank(value: any): boolean {
    return value === null || value === undefined || (value.length !== undefined && value.length === 0);
}

export function isNotBlank(value: any): boolean {
    return value !== null && value !== undefined && (value.length === undefined || value.length > 0);
}

export function getBooleanInput(name: string, options?: InputOptions): boolean {
    const value = core.getInput(name, options);
    return isNotBlank(value) &&
        ['y', 'yes', 't', 'true', 'e', 'enable', 'enabled', 'on', 'ok', '1']
            .includes(value.trim().toLowerCase());
}

/**
 * Helper to get all the inputs for the action
 */
export function getInputs(): ReleaseInputs {
    const result: ReleaseInputs | any = {
        latest: false,
        draft: false,
        prerelease: false
    };

    result.owner = core.getInput(Inputs.Owner, {required: false});
    if (isBlank(result.owner))
        result.owner = context.repo.owner;

    result.repo = core.getInput(Inputs.Repo, {required: false});
    if (isBlank(result.repo))
        result.repo = context.repo.repo;

    result.tag = core.getInput(Inputs.TagName, {required: true});
    if (isBlank(result.tag))
        throw new Error(`Tag name is blank.`);

    result.tag_sha = core.getInput(Inputs.TagSha, {required: false});
    if (isBlank(result.tag_sha))
        result.tag_sha = context.sha;

    const type = core.getInput(Inputs.Type, {required: false});
    if (isBlank(type)) {
        result.type = 'commit';
    } else if (['commit', 'tree', 'blob'].includes(type)) {
        result.type = type;
    } else {
        throw new Error(`Invalid type provided! Must be one of 'commit', 'tree', 'blob'.`);
    }

    result.on_tag_exists = core.getInput(Inputs.OnTagExists, {required: false});
    if (!['skip', 'update', 'warn', 'error'].includes(result.on_tag_exists)) {
        result.on_tag_exists = 'skip';
    }

    result.message = core.getInput(Inputs.Message, {required: false});
    if (isBlank(result.message))
        result.message = result.tag;

    result.debug = getBooleanInput(Inputs.Debug, {required: false});

    return result;
}

export function setOutputs(response: any, log?: boolean) {
    // Get the outputs for the created release from the response
    let message = '';
    for (const key in Outputs) {
        const field: string = (Outputs as any)[key];
        if (log)
            message += `\n  ${field}: ${JSON.stringify(response[field])}`;
        core.setOutput(field, response[field]);
    }

    if (log)
        core.info('Outputs:' + message);
}
