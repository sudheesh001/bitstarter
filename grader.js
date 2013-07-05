#!/usr/bin/env node
/*
Automatically grade files for the presence of specified HTML tags/attributes.
Uses commander.js and cheerio. Teaches command line application development
and basic DOM parsing.

References:

 + cheerio
   - https://github.com/MatthewMueller/cheerio
   - http://encosia.com/cheerio-faster-windows-friendly-alternative-jsdom/
   - http://maxogden.com/scraping-with-node.html

 + commander.js
   - https://github.com/visionmedia/commander.js
   - http://tjholowaychuk.com/post/9103188408/commander-js-nodejs-command-line-interfaces-made-easy

 + JSON
   - http://en.wikipedia.org/wiki/JSON
   - https://developer.mozilla.org/en-US/docs/JSON
   - https://developer.mozilla.org/en-US/docs/JSON#JSON_in_Firefox_2
*/

"use strict";

var fs = require('fs');
var program = require('commander');
var cheerio = require('cheerio');
var rest = require('restler');

var HTMLFILE_DEFAULT = "index.html";
var CHECKSFILE_DEFAULT = "checks.json";
var URL_DEFAULT = "http://safe-reef-3808.herokuapp.com/";

var assertFileExists = function(file) {
  if(program.verbose) { console.log('Checking for file ' + file); }
  var instr = file.toString();
  if(!fs.existsSync(instr)) {
    console.error("%s does not exist. Exiting.", instr);
    process.exit(1);
  }
  return instr;
};

var assertUrlExists = function(url) {
  // TODO: dummy function, check if it's necessary for commander.js to work
  if(program.verbose) { console.log('Checking for url ' + url); }
  return url.toString();
};

var doChecksForFile = function(file, processDomFunction) {
  if(program.verbose) { console.log('Checking file ' + file); }
  fs.readFile(file, function(err, data) {
    var cheerioHtmlDom = cheerio.load(data);
    processDomFunction(cheerioHtmlDom);
  });
};


var doChecksForUrl = function(url, processDomFunction) {
  if(program.verbose) { console.log('Checking url ' + url); }
  rest.get(url).on('complete', function(data, response) {
    var cheerioHtmlDom = cheerio.load(data);
    processDomFunction(cheerioHtmlDom);
  });
};


var checksFromFile = function(checksfile) {
  if(program.verbose) { console.log('Checking using file ' + checksfile); }
  var checksJSON = fs.readFileSync(checksfile);
  return JSON.parse(checksJSON);
};


var doCheck = function(cheerioHtmlDom, checksJSON) {
  var resultsJSON = {};
  for(var currentCheck = 0; currentCheck < checksJSON.length; currentCheck++) {
    var currentResult = cheerioHtmlDom(checksJSON[currentCheck]).length > 0;
    resultsJSON[checksJSON[currentCheck]] = currentResult;
  }
  
  return resultsJSON;
};


var processHtmlDomFunction = function(cheerioHtmlDom) {
  var checksJSON = checksFromFile(program.checks).sort();
  var resultsJSON = doCheck(cheerioHtmlDom, checksJSON);
  var resultsJSONString = JSON.stringify(resultsJSON, null, 4);
  console.log(resultsJSONString);
};

// Workaround for commander.js issue <http://stackoverflow.com/a/6772648>
var clone = function(fn) {
    return fn.bind({});
};

var processCommandLineArguments = function(commandLineArguments) {
  // TODO: rework this default parameter logic. Today it assertFileExists for file options, even when using url option, etc.
  // The solution is probably to not accept default parameter via commander, but bring them in later if necessary

  program
    .option('-v, --verbose', 'Generates additional output messages')
    .option('-c, --checks <check_file> ', 'Path to checks.json (tests to be performed)', clone(assertFileExists), CHECKSFILE_DEFAULT)
    .option('-t, --type <type>', 'Type of check (file or url)', 'file')
    .option('-f, --file <html_file>', 'Path to index.html (file to be checked)', clone(assertFileExists), HTMLFILE_DEFAULT)
    .option('-u, --url <url>', 'Url to be checked', clone(assertUrlExists), URL_DEFAULT)
    .parse(commandLineArguments);

  if(program.verbose) { console.log('\nCommand line arguments: ' + commandLineArguments); }
};


var gradeViaCommandLine = function(commandLineArguments) {
  processCommandLineArguments(commandLineArguments);

  if(program.verbose) { console.log('Checking using type: ' + program.type); }

  if(program.type === 'file') {
    doChecksForFile(program.file, processHtmlDomFunction);
  }
  else {
    doChecksForUrl(program.url, processHtmlDomFunction);
  }
};


if(require.main === module) {
  gradeViaCommandLine(process.argv);
} else {
  exports.processCommandLineArguments = processCommandLineArguments;
  exports.program = program;
}

