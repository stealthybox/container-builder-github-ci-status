const GitHubApi = require('github')

const config = {
  ciUser: "githubUser", // document your CI user here
  ciAccessToken: "personalAccessToken", // document which token you're using
  repoOwner: "beatport"
}

// Can be one of error, failure, pending, or success.
const statusMap = {
  QUEUED: "pending",
  WORKING: "pending",
  SUCCESS: "success",
  FAILURE: "failure",
  CANCELLED: "failure",
  TIMEOUT: "error",
  INTERNAL_ERROR: "error"
}

// setCIStatus is the main function.
module.exports.setCIStatus = (event) => {
  build = eventToBuild(event.data.data)
  console.log(`gcloud container builds describe --format=json ${build.id}`)

  const {
    id,
    projectId,
    status,
    images,
    sourceProvenance: {
      resolvedRepoSource: repoSource
    },
    logUrl,
    tags,
    createTime,
    finishTime,
  } = build

  const ghStatus = statusMap[status]

  if (!repoSource || !ghStatus) return

  const ghRepo = repoSource.repoName.indexOf(`github-${config.repoOwner}-`) == 0
    ? repoSource.repoName.replace(`github-${config.repoOwner}-`, '')
    : false
  if (!ghRepo) return

  const ghContext = tags && tags.length > 0
    ? `${projectId}/gcb: ${tags.join('/')}`
    : `${projectId}/gcb: ${id.substring(0,8)}`

  const ghDescription = (
    createTime && finishTime
    ? secondsToString((new Date(finishTime) - new Date(createTime)) / 1000)
    : images && images.length > 0
      ? `${images.join('\n')}`
      : ''
  ).substring(0,140)

  console.log(status, ghStatus)
  console.log(ghRepo, repoSource)
  console.log(ghContext, tags)
  console.log(ghDescription, createTime, finishTime, images)

  let github = new GitHubApi()
  github.authenticate({
    type: 'token',
    token: config.ciAccessToken
  })

  let request = {
    owner: config.repoOwner,
    repo: ghRepo,
    sha: repoSource.commitSha,
    state: ghStatus,
    target_url: logUrl,
    description: ghDescription,
    context: ghContext
  }

  console.log(JSON.stringify(request, null, 2))

  return github.repos.createStatus(request)
}

// eventToBuild transforms pubsub event message to a build object.
const eventToBuild = (data) =>
  JSON.parse(new Buffer(data, 'base64').toString())

// secondsToString turns a number of seconds into a human-readable duration.
const secondsToString = (s) => {
  const years   = Math.floor(s / 31536000)
  const days    = Math.floor((s % 31536000) / 86400)
  const hours   = Math.floor(((s % 31536000) % 86400) / 3600)
  const minutes = Math.floor((((s % 31536000) % 86400) % 3600) / 60)
  const seconds = Math.floor((((s % 31536000) % 86400) % 3600) % 60)

  return `${years}y ${days}d ${hours}h ${minutes}m ${seconds}s`
    .replace(/^(0[ydhm] )*/g, '')
}
