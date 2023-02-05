import * as core from '@actions/core';
import {getOctokit} from '@actions/github';
import {GitHub} from '@actions/github/lib/utils';
import {RestEndpointMethodTypes} from '@octokit/plugin-rest-endpoint-methods';
import {getInputs, ReleaseInputs, setOutputs} from './io-helper';

function isSuccessStatusCode(statusCode?: number): boolean {
    if (!statusCode) return false;
    return statusCode >= 200 && statusCode < 300;
}

async function getRefByTag(github: InstanceType<typeof GitHub>, inputs: ReleaseInputs): Promise<RestEndpointMethodTypes['git']['getRef']['response']['data'] | undefined> {
    try {
        const ref = await github.rest.git.getRef({
            owner: inputs.owner,
            repo: inputs.repo,
            ref: `refs/tags/${inputs.tag}`
        });
        return ref.data;
    } catch {
        return undefined;
    }
}

(async function run() {
    try {
        const inputs: ReleaseInputs = getInputs();
        const github = getOctokit(process.env.GITHUB_TOKEN as string);

        core.info(`Start get release with:\n  owner: ${inputs.owner}\n  repo: ${inputs.repo}`);

        if (await getRefByTag(github, inputs) != null) {
            const refResponse = await github.rest.git.updateRef({
                owner: inputs.owner,
                repo: inputs.repo,
                ref: `refs/tags/${inputs.tag}`,
                sha: inputs.tag_sha,
                force: true
            });

            if (!isSuccessStatusCode(refResponse.status))
                throw new Error(`Failed to update tag ref with status ${refResponse.status}`);

            setOutputs(refResponse.data);

            core.info(`Updated ${inputs.tag} reference to ${inputs.tag_sha}`);
        } else {
            const createResponse = await github.rest.git.createTag({
                owner: inputs.owner,
                repo: inputs.repo,
                tag: inputs.tag,
                object: inputs.tag_sha,
                type: inputs.type,
                message: inputs.message
            });

            if (!isSuccessStatusCode(createResponse.status))
                throw new Error(`Failed to create tag object with status ${createResponse.status}`);

            const refResponse = await github.rest.git.createRef({
                owner: inputs.owner,
                repo: inputs.repo,
                ref: `refs/tags/${inputs.tag}`,
                sha: inputs.tag_sha
            });

            if (!isSuccessStatusCode(refResponse.status))
                throw new Error(`Failed to create tag ref with status ${refResponse.status}`);

            setOutputs(refResponse.data);

            core.info(`Tagged ${createResponse.data.sha} as ${inputs.tag}`);
        }
    } catch (err: any) {
        core.setFailed(err.message);
    }
})();
