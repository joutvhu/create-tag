# Create Tag

GitHub Action to create or update tag

## Usage

See [action.yml](action.yml)

### Inputs

For more information on these inputs, see the [API Documentation](https://developer.github.com/v3/git/tags/#input)

- `owner`: The name of the owner of the repo. Used to identify the owner of the repository. Default: Current owner
- `repo`: The name of the repository. Default: Current repository
- `tag_name`: The name of the tag.
- `tag_sha`: The SHA of the git object this is tagging.
- `type`: The type of the object we're tagging. Normally this is a `commit` but it can also be a `tree` or a `blob`.
- `message`: The tag message.
- `on_tag_exists`: Indicate what to do if the tag_name already exists. Options: skip, update, error. Default skip.

### Outputs

- `tag_name`: The name of the tag.
- `tag_sha`: The SHA of the git object this is tagging.

### Example

The following example is used to create or update the major version tag every time a new release is available.

```yaml
name: Create Major Version Tag

on:
  release:
    types: [released]

jobs:
  test:
    runs-on: ubuntu-latest
    permissions:
      contents: write
    steps:
      - name: Get current release
        id: current_release
        uses: joutvhu/get-release@v1
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}

      # Get major version: (Ex: `v1.0.0` -> `v1`)
      - name: Get major version from release
        id: major_version
        run: |
          echo "::set-output name=version::$(echo ${{ steps.current_release.outputs.tag_name }} | cut -f 1 -d .)"

      # Create or update major version tag (Ex: v1, v2, ...)
      - name: Create or update major version
        uses: joutvhu/create-tag@v1
        with:
          tag_name: ${{ steps.major_version.outputs.version }}
          message: ${{ steps.current_release.outputs.name }}
          on_tag_exists: update
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```
