/* eslint-disable linebreak-style */
/* eslint-disable consistent-return */
/* eslint-disable no-console */

const fs = require('fs');

let fileName = '';

function setOutputFileName(name) {
  fileName = name;
}

async function write(text) {
  console.log(text);

  fs.appendFileSync(fileName, `${text}\n`, (err) => {
    if (err) return console.log(err);
  });
}

async function createDir(name) {
  if (!fs.existsSync(name)) {
    fs.mkdirSync(name);
  }
}

exports.setOutputFileName = setOutputFileName;
exports.write = write;
exports.createDir = createDir;
