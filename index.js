#!/usr/bin/env node
var program = require('commander');
var fs = require('fs');
var chalk = require('chalk');
var css = require('css');
var sameValueAs = require('same-values-as').compare;
var postcss = require('postcss');
var stylefmt = require('stylefmt');

// Init commander
program.arguments('<originFile> <newFile>').parse(process.argv);

// Disable help page on calls without arguments
if ( !process.argv.slice(2).length ) {
	program.outputHelp();
	process.exit(0);
}

// Run program
try {
	// Get file objects
	var originFile = fs.readFileSync(program.args[0]);
	var newFile = fs.readFileSync(program.args[1]);

	postcss([stylefmt]).process(originFile).then(function (resultOriginFile) {
		postcss([stylefmt]).process(newFile).then(function (resultNewFile) {
			// Read file and parse them
			var originFileCSS = css.parse(resultOriginFile.css);
			var newFileCSS = css.parse(resultNewFile.css);

			// 1. Find all selectors missing in new files
			originFileCSS.stylesheet.rules.forEach(function(rule) {
				if ( 'rule' !== rule.type ) return;

				var newSelectors = newFileCSS.stylesheet.rules.find(function(newRule) {
					try {
						if ( 'rule' !== newRule.type ) return false;
						return sameValueAs(newRule.selectors, rule.selectors);
					} catch( e ) {
						return false;
					}
				});

				if ( typeof newSelectors === "undefined" ) {
					console.log(chalk.yellow('- %s'), rule.selectors.join(', '));
				} else {
					var onlyInA = rule.declarations.filter(function(current) {
						return newSelectors.declarations.filter(function(current_b) {
							return current_b.value.toLowerCase() == current.value.toLowerCase() && current_b.property.toLowerCase() == current.property.toLowerCase()
						}).length == 0
					})

					var onlyInB = newSelectors.declarations.filter(function(current) {
						return rule.declarations.filter(function(current_a) {
							return current_a.value.toLowerCase() == current.value.toLowerCase() && current_a.property.toLowerCase() == current.property.toLowerCase()
						}).length == 0
					});

					if ( onlyInA.length > 0 || onlyInB.length > 0 ) {
						console.log(chalk.blue('# %s'), rule.selectors.join(', '));

						onlyInA.forEach(function (difference) {
							console.log(chalk.red('  - %s: %s;'), difference.property, difference.value);
						});

						onlyInB.forEach(function (difference) {
							console.log(chalk.green('  + %s: %s;'), difference.property, difference.value);
						});
					}
				}
			});
		});
	});

} catch( e ) {
	console.log(e);

	// Return with colored error output
	console.error(chalk.red(e.message));
	process.exit(1);
}
