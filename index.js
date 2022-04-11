const core = require('@actions/core');
const S3 = require('aws-sdk/clients/s3');
const fs = require('fs');
const path = require('path');
const shortid = require('shortid');
const klawSync = require('klaw-sync');
const { lookup } = require('mime-types');

const AWS_KEY_ID = core.getInput('aws_key_id', {
  required: true
});
const SECRET_ACCESS_KEY = core.getInput('aws_secret_access_key', {
  required: true
});
const BUCKET = core.getInput('aws_bucket', {
  required: true
});
const SOURCE_DIR = core.getInput('source_dir', {
  required: true
});
const DESTINATION_DIR = core.getInput('destination_dir', {
  required: false
});

const s3 = new S3({
  accessKeyId: AWS_KEY_ID,
  secretAccessKey: SECRET_ACCESS_KEY
});
console.log('klawSyncBefore')
const destinationDir = DESTINATION_DIR === '/' ? shortid() : DESTINATION_DIR;

let paths = [SOURCE_DIR]

// if (isDir) {
//   paths = klawSync(SOURCE_DIR, {
//     nodir: true
//   });
// }
console.log('klawSyncAfter')

function upload(params) {
  return new Promise(resolve => {
    s3.upload(params, (err, data) => {
      if (err) core.error(err);
      core.info(`uploaded - ${data.Key}`);
      core.info(`located - ${data.Location}`);
      resolve(data.Location);
    });
  });
}

function run() {
  const sourceDir = path.join(process.cwd(), SOURCE_DIR);
  return Promise.all(
    paths.map(p => {
      const fileStream = fs.createReadStream(p);
      const bucketPath = path.join(destinationDir, path.relative(sourceDir, p));
      const params = {
        Bucket: BUCKET,
        ACL: 'public-read',
        Body: fileStream,
        Key: 'linux-latest.yml',
        ContentType: lookup(p) || 'text/plain'
      };
      return upload(params);
    })
  );
}

run()
  .then(locations => {
    core.info(`object key - ${destinationDir}`);
    core.info(`object locations - ${locations}`);
    core.setOutput('object_key', destinationDir);
    core.setOutput('object_locations', locations);
  })
  .catch(err => {
    core.error(err);
    core.setFailed(err.message);
  });
