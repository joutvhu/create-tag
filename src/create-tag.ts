import * as core from '@actions/core';
import {getOctokit} from '@actions/github';
import {GitHub} from '@actions/github/lib/utils';
import {RestEndpointMethodTypes} from '@octokit/plugin-rest-endpoint-methods';
import {getInputs, ReleaseInputs, setOutputs} from './io-helper';

function isSuccessStatusCode(statusCode?: number): boolean {
    if (!statusCode) return false;
    return statusCode >= 200 && statusCode < 300;
}

async function isRefTagExists(github: InstanceType<typeof GitHub>, inputs: ReleaseInputs): Promise<boolean> {
    try {
        const params: RestEndpointMethodTypes["git"]["getRef"]["parameters"] = {
            owner: inputs.owner,
            repo: inputs.repo,
            ref: `tags/${inputs.tag}`
        };
        core.debug(`Getting reference for ${inputs.tag} tag with params: ${JSON.stringify(params)}.`);
        const ref = await github.rest.git.getRef(params);
        core.debug(`The reference data of ${inputs.tag} tag: ${JSON.stringify(ref.data)}.`);
        return ref.data != null;
    } catch (e: any) {
        core.warning(`Get reference of ${inputs.tag} tag error with status ${e.status}, message: ${e.message}.`);
        return false;
    }
}

(async function run() {
    try {
        const inputs: ReleaseInputs = getInputs();
        const github = getOctokit(process.env.GITHUB_TOKEN as string);

        core.info(`Start get release with:\n  owner: ${inputs.owner}\n  repo: ${inputs.repo}`);

        if (await isRefTagExists(github, inputs)) {
            if (inputs.on_tag_exists === 'error')
                throw new Error(`The ${inputs.tag} tag already exists.`);
            if (inputs.on_tag_exists === 'skip') {
                core.warning(`The ${inputs.tag} tag already exists.`);
            } else if (inputs.on_tag_exists === 'update') {
                const params: RestEndpointMethodTypes["git"]["updateRef"]["parameters"] = {
                    owner: inputs.owner,
                    repo: inputs.repo,
                    ref: `tags/${inputs.tag}`,
                    sha: inputs.tag_sha,
                    force: true
                }
                core.debug(`Updating reference for ${inputs.tag} tag with params: ${JSON.stringify(params)}.`);
                const refResponse = await github.rest.git.updateRef(params);

                if (!isSuccessStatusCode(refResponse.status))
                    throw new Error(`Failed to update tag ref with status ${refResponse.status}`);

                setOutputs(refResponse.data, inputs.debug);

                core.info(`Updated ${inputs.tag} reference to ${inputs.tag_sha}`);
            }
        } else {
            const params: RestEndpointMethodTypes["git"]["createTag"]["parameters"] = {
                owner: inputs.owner,
                repo: inputs.repo,
                tag: inputs.tag,
                object: inputs.tag_sha,
                type: inputs.type,
                message: inputs.message
            };
            core.debug(`Creating ${inputs.tag} tag with params: ${JSON.stringify(params)}.`);
            const createResponse = await github.rest.git.createTag(params);

            if (!isSuccessStatusCode(createResponse.status))
                throw new Error(`Failed to create tag object with status ${createResponse.status}`);

            const refParams: RestEndpointMethodTypes["git"]["createRef"]["parameters"] = {
                owner: inputs.owner,
                repo: inputs.repo,
                ref: `refs/tags/${inputs.tag}`,
                sha: inputs.tag_sha
            };
            core.debug(`Creating reference for ${inputs.tag} tag with params: ${JSON.stringify(params)}.`);
            const refResponse = await github.rest.git.createRef(refParams);

            if (!isSuccessStatusCode(refResponse.status))
                throw new Error(`Failed to create tag ref with status ${refResponse.status}`);

            setOutputs(refResponse.data, inputs.debug);

            core.info(`Tagged ${createResponse.data.sha} as ${inputs.tag}`);
        }
    } catch (err: any) {
        core.debug(`Error status: ${err.status}`);
        core.setFailed(err.message);
    }
})();
