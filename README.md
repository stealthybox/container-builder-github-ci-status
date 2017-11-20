# Container Builder GitHub CI connector for Google Cloud Functions
Cloud Function to use the PubSub events on the `cloud-builds` topic to update GitHub CI status.

This function is designed to work with GitHub repositories mirrored under Google Cloud Source Control named `github-${config.repoOwner}-${ghRepoName}`.
If you set this through the Container Builder build trigger UI, this will be named automatically.

## Deploy
[Generate a new token](https://github.com/settings/tokens) with the `repo:status` OAuth scope.

Set the following on `config` in [index.js](./index.js):
- `ciUser`
- `ciAccessToken`
- `repoOwner`

Deploy the cloud function to gcloud:
```
PROJECT_ID=$(gcloud config get-value core/project)

gsutil mb gs://${PROJECT_ID}-gcb-cistatus

gcloud beta functions deploy setCIStatus --stage-bucket ${PROJECT_ID}-gcb-cistatus --trigger-topic cloud-builds
```

## Behavior
CI Status **context** will be one of:
- `${projectId}/gcb: ${tags.join('/')}`
- `${projectId}/gcb: ${id.substring(0,8)}`

Use the `tags` field in your build request to name your CI.
Otherwise, it falls back to the build-GUID.

CI Status **description** will either be:
- nothing
- a join of all images to be published:
  `gcr.io/project/image:v1 gcr.io/project/image:latest`
- above all, the duration of the build:
  `3m 27s`
