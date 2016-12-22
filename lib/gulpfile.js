'use strict';

//const install = require('./install');
//const runCmd = require('./runCmd');
//const runCmdWithOut = require('./runCmdWithOut');
const babelConfig = require('./getBabelCommonConfig')();
//const merge2 = require('merge2');
//const through2 = require('through2');
const gulpEs3ify = require('./gulpEs3ify');



//const getNpm = require('./getNpm');
//const selfPackage = require('../package.json');
//const chalk = require('chalk');
//const getNpmArgs = require('./utils/get-npm-args');
//const watch = require('gulp-watch');
//const ts = require('gulp-typescript');
//const tsConfig = require('./getTSCommonConfig')();


///有效
const path = require('path');
const del = require('del');
const _ = require('lodash');
const gulp = require('gulp');
const babel = require('gulp-babel');
const argv = require('minimist')(process.argv.slice(2));
const execSync = require('child_process').execSync;
const packageJson = require(`${process.cwd()}/package.json`);
const replace = require("replace");
var addsrc = require('gulp-add-src');
const javac = require('./javac');
const fs = require('fs');
var fse = require('fs-extra')
const program = require('commander');
//const tsDefaultReporter = ts.reporter.defaultReporter();
const cwd = process.cwd();
const appName = _.lowerCase(packageJson.name);

program.parse(process.argv);

delete babelConfig.cacheDirectory;


function tag() {
  console.log('tagging');
  const version = packageJson.version;
  execSync(`git tag ${version}`);
  execSync(`git push origin ${version}:${version}`);
  console.log('tagged');
}


gulp.task('clean', () => {
  del.sync('dist',{force:true});
});

gulp.task('install', (done) => {
  //install(done);
});


function travel(dir) {
  var pjInfo = {};
  var projects = pjInfo.projects = [];
  console.log(" Scanning for projects...");
  console.log(" ------------------------------------------------------------------------");  
  fs.readdirSync(dir).forEach(function (project) {
	if(_.startsWith(_.lowerCase(project),appName)){
		var pathname = path.join(dir, project);
	    if (fs.statSync(pathname).isDirectory()) {
		    if(_.endsWith(project,'-lib')){
				pjInfo.libDir = project;
			}else{
				if(_.endsWith(project,'-web')){
					pjInfo.webDir = project;
				}
				console.log(`  ${project}`);
				projects.push(project);
			}
	    }
	}
  });
 console.log(" ------------------------------------------------------------------------");
 console.log(` Building ${packageJson.name} ${packageJson.version}`);
 console.log(" ------------------------------------------------------------------------");
 return pjInfo;
}

const jc = _.extend({
	  src:"src/main/java",
	  resources:"src/main/resources",
	  sourceEncoding:"UTF-8",
	  version:"1.8"},packageJson.java);

console.log(`>build.sourceEncoding:    ${jc.sourceEncoding}`);
console.log(`>compiler.version:         ${jc.version}`);
console.log(`>compiler.srcDir:        ${jc.src}`);
console.log(`>compiler.resourcesDir:  ${jc.resources}`);
const pjInfo = travel(cwd);

pjInfo.projects.forEach((project)=>{
	gulp.task(project, function() {
        if(pjInfo.webDir === project){
			return gulp.src([`${project}/${jc.src}/**/*.java`])
			.pipe(javac.javac({encoding:' utf-8',projectName:project,traceEnabled:false}).addLibraries(`${pjInfo.libDir}/**/*.jar`))
			.pipe(addsrc([`${project}/${jc.resources}/**/*.*`,`!${project}/${jc.resources}/web/**/*.*`]))
			.pipe(gulp.dest(`dist/${project}/WEB-INF/classes`))
		}

		return gulp.src([`${project}/${jc.src}/**/*.java`])
		.pipe(javac.javac({encoding:' utf-8',projectName:project,traceEnabled:false}).addLibraries(`${pjInfo.libDir}/**/*.jar`))
	    .pipe(addsrc([`${project}/${jc.resources}/**/*.*`,`!${project}/${jc.resources}/web/**/*.*`]))
		.pipe(gulp.dest(`dist/classes/${project}`))
		.pipe(javac.jar(`${project}.jar`,{traceEnabled:false}))
        .pipe(gulp.dest(`dist/classes`))
	})
})

gulp.task('jsxc', function() {
  del.sync('dist/jsx',{force:true});
  var jsxSrc = [];

  pjInfo.projects.forEach((project)=>{
	 jsxSrc.push(`${project}/${jc.resources}/web/**/*.jsx`);
  })		
  var jsx = gulp.src(jsxSrc)
	 .pipe(babel(babelConfig))
     .pipe(gulpEs3ify());

  pjInfo.projects.forEach((project)=>{
	  jsx = jsx.pipe(addsrc([`${project}/${jc.resources}/web/**/*.*`,`!${project}/${jc.resources}/web/**/*.jsx`]))
  })

  return jsx.pipe(gulp.dest('dist/jsx/web'))	 
})


gulp.task('jsx',['jsxc'], function() {
   return gulp.src('dist/jsx/**/*.*')
	.pipe(javac.jar(`${appName}-static-resources.jar`,{traceEnabled:false}))
	.pipe(gulp.dest('dist/jsx'))
});

gulp.task('jar', function() {
	del.sync('dist/classes',{force:true});
	gulp.start(pjInfo.projects);
});


gulp.task('war-pre',['clean','jar','jsx'], function() {
	var libSrc = [`dist/classes/*.jar`,`dist/jsx/${appName}-static-resources.jar`];
	fs.readdirSync(pjInfo.libDir).forEach(function (libDir) {
		var pathname = path.join(pjInfo.libDir, libDir);
	    if (fs.statSync(pathname).isDirectory()) {
		     libSrc.push(`${pjInfo.libDir}/${libDir}/*.jar`);
	    }
    });
	return gulp.src(libSrc)
	.pipe(gulp.dest(`dist/${pjInfo.webDir}/WEB-INF/lib`))
})


gulp.task('war',['clean','war-pre'], function() {

    var profile = program.args[1] || 'sit';

	console.log(` Building war '${profile}' profile ${packageJson.version}`);

	fse.copySync(`${pjInfo.webDir}/src/main/webapp`,`dist/${pjInfo.webDir}`);

	replace({
		regex: "<param-value>dev</param-value>",
		replacement: `<param-value>${profile}</param-value>`,
		paths: [`dist/${pjInfo.webDir}/WEB-INF/web.xml`],
		recursive: false,
		silent: true,
	});
		
	return gulp.src([`dist/${pjInfo.webDir}/**/*.*`])
	.pipe(javac.jar(`${appName}-${profile}.war`,{traceEnabled:false}))
	.pipe(gulp.dest('dist/'))
})


gulp.task('test', function() {
	fse.copySync(`${pjInfo.webDir}/src/main/webapp`,`dist/${pjInfo.webDir}`);
  	return gulp.src([`dist/${pjInfo.webDir}/**/*.*`])
	.pipe(javac.jar(`${appName}.war`,{traceEnabled:false}))
	.pipe(gulp.dest(`dist/`))
})
