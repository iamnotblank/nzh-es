var path = require("path");
var gulp = require("gulp");
var mocha = require("gulp-mocha");
var mochaPhantomjs = require("gulp-mocha-phantomjs");
var browserify = require("gulp-browserify");
var uglify = require("gulp-uglify");
var rename = require("gulp-rename");
var header = require("gulp-header");

var rollupO = require("rollup");
var commonjs = require("rollup-plugin-commonjs");
var resolve = require("rollup-plugin-node-resolve");

// var istanbul = require("gulp-istanbul");
var package = require("./package.json");
var banner =
  "/*!\n" +
  " * " +
  package.name +
  " v" +
  package.version +
  "\n" +
  " * Homepage " +
  package.homepage +
  "\n" +
  " * License " +
  package.license +
  "\n" +
  " */\n";
var outputDir = "dist/";

function runRollup(input, output) {
  var inputopt = {
    // input: './nzh.js',
    plugins: [resolve(), commonjs()],
  };
  var outputopt = {
    // file: './dist/nzh.js',
    format: "esm",
    name: "Nzh",
    banner: banner,
    sourcemap: false,
  };
  return Promise.all([rollupO
    .rollup(
      Object.assign({}, inputopt, {
        input: input,
      })
    )
    .then(function (bundle) {
      return bundle.write(
        Object.assign({}, outputopt, {
          file: output,
        })
      );
    }), rollupO
    .rollup(
      Object.assign({}, inputopt, {
        input: input,
      })
    )
    .then(function (bundle) {
      return bundle.write(
        Object.assign({}, outputopt, {
          file: output.replace('.js', '.esm.js'),
					format: 'esm'
        })
      );
    })]) ;
}

function rollup() {
  return Promise.all([
    runRollup("./nzh.js", outputDir + "nzh.js"),
    runRollup("./cn.js", outputDir + "nzh.cn.js"),
    runRollup("./hk.js", outputDir + "nzh.hk.js"),
  ]);
}

var min = gulp.series(rollup, function () {
  return gulp
    .src(["dist/!(*.min).js"])
    .pipe(uglify())
    .pipe(header(banner))
    .pipe(
      rename({
        suffix: ".min",
      })
    )
    .pipe(gulp.dest(outputDir));
});

function testServer() {
  return gulp
    .src("test/test_mocha.js", { read: false })
    .pipe(mocha({ reporter: "dot" }));
}

function outputTestjsBrowser() {
  return gulp.series(testServer, function () {
    return gulp
      .src("test/test_mocha.js")
      .pipe(browserify({ insertGlobals: true }))
      .pipe(
        rename({
          basename: "tests",
        })
      )
      .pipe(gulp.dest("test/browser"));
  });
}

function testBrowser() {
  return gulp.series(gulp.parallel(outputTestjsBrowser, build), function () {
    return gulp
      .src("test/browser/test.html")
      .pipe(mochaPhantomjs({ reporter: "dot" }));
  });
}

function test() {
  return gulp.parallel(testServer, testBrowser);
}

var build = gulp.parallel(testServer, rollup, min);

exports.build = build;

exports.default = gulp.parallel(build, test);
