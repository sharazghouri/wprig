/* eslint-env es6 */
'use strict';

// External dependencies
import {src, dest} from 'gulp';
import postcssPresetEnv from 'postcss-preset-env';
import AtImport from 'postcss-import';
import postcssCustomProperties from 'postcss-custom-properties';
import postcssCustomMedia from 'postcss-custom-media';
import pump from 'pump';

// Internal dependencies
import {rootPath, paths, gulpPlugins, isProd} from './constants';
import {getThemeConfig, getStringReplacementTasks, logError} from './utils';
import {server} from './browserSync';

/**
* CSS via PostCSS + CSSNext (includes Autoprefixer by default).
*/
export default function styles(done) {
	// get a fresh copy of the config
	const config = getThemeConfig(true);

	const beforeReplacement = [
		src( paths.styles.srcWithIgnored, {sourcemaps: !isProd} ),
		logError('CSS'),
		gulpPlugins.newer({
			dest: paths.styles.dest,
			extra: [paths.config.themeConfig]
		}),
		gulpPlugins.phpcs({
			bin: `${rootPath}/vendor/bin/phpcs`,
			standard: 'WordPress',
			warningSeverity: 0
		}),
		// Log all problems that were found.
		gulpPlugins.phpcs.reporter('log'),
		gulpPlugins.postcss([
			AtImport(),
			postcssCustomProperties({
				'preserve': (
					configValueDefined('config.dev.styles.postCSSPreserve') ?
					config.dev.styles.postCSSPreserve :
					true
				),
			}),
			postcssCustomMedia({
				'preserve': (
					configValueDefined('config.dev.styles.postCSSPreserve') ?
					config.dev.styles.postCSSPreserve :
					true
				),
			}),
			postcssPresetEnv({
				stage: 3
			})
		]),
	];

	const afterReplacement = [
		gulpPlugins.stylelint({
			failAfterError: false,
			fix: true,
			reporters: [
				{
					formatter: 'string',
					console: true
				}
			]
		}),
		gulpPlugins.if(
			!config.dev.debug.styles,
			gulpPlugins.cssnano()
		),
		gulpPlugins.rename({
			suffix: '.min'
		}),
		server.stream({match: "**/*.css"}),
		dest(paths.styles.dest, {sourcemaps: !isProd}),
	];

	pump(
		[].concat(
			beforeReplacement,
			// Only do string replacements when building for production
			gulpPlugins.if(
				isProd,
				getStringReplacementTasks(),
				[]
			),
			afterReplacement
		),
		done
	);
}
