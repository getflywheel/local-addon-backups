/* eslint-disable @typescript-eslint/no-var-requires */
const path = require('path');
const nodeExternals = require('webpack-node-externals');
const { merge } = require('webpack-merge');
// const glob = require('glob');
/* eslint-enable @typescript-eslint/no-var-requires */


const commonConf = {
	context: path.resolve(__dirname, 'src'),
	externals: [
		'@getflywheel/local/renderer',
		'@getflywheel/local/main',
		'@getflywheel/local',
		'react',
		'@getflywheel/local-components',
		'react-dom',
		'react-router-dom',
	],
	devtool: 'source-map',
	/**
	 * @todo make this configurable
	 */
	mode: 'development',
	module: {
		rules: [
			{
				test: /\.[tj]sx?$/,
				exclude: [/node_modules/],
				use: [
					{
						loader: 'ts-loader',
						options: {
							transpileOnly: true,
							configFile: 'tsconfig.json',
							onlyCompileBundledFiles: true,
						},
					},
				],
			},
		],
	},
	node: {
		global: false,
		__dirname: false,
	},
	resolve: {
		extensions: ['.tsx', '.ts', '.jsx', '.js'],
	},
	output: {
		filename: '[name].js',
		path: path.join(__dirname, 'lib'),
		libraryTarget: 'commonjs2',
	},
};

const configs = [
	{
		entry: {
			renderer: './renderer.tsx',
		},
		module: {
			rules: [
				{
					test: /\.svg$/,
					issuer: {
						and: [/\.[tj]sx?$/],
					},
					use: [
						'babel-loader',
						{
							loader: 'react-svg-loader',
							options: {
								svgo: {
									plugins: [
										{
											inlineStyles: { onlyMatchedOnce: false },
										},
									],
								},
							},
						},
					],
				},
				{
					test: /\.s[ac]ss$/i,
					use: [
						'style-loader',
						{
							loader: 'css-loader',
							options: {
								modules: true,
								sourceMap: true,
								importLoaders: 1,
							},
						},
						'resolve-url-loader',
						'sass-loader',
					],
				  },
			],
		},
		target: 'electron-renderer',
	},
	{
		// entry: glob.sync('./src/main/**/!(test).ts').reduce((entry, file) => {
		// 	// const name = path.basename(file, 'ts');
		// 	let name = file.replace(/^\.\/src\//, '').replace(/\.ts/, '');
		// 	console.log(file, name, path.join(__dirname, file))

		// 	/**
		// 	 * @todo figure out how to exclude test files with the glob pattern
		// 	 */
		// 	if (!name.includes('.test')) {
		// 		entry[name] = path.join(__dirname, file);
		// 	}

		// 	return entry;
		// }, {
		// 	main: './main.ts',
		// }),
		entry: {
			main: './main.ts',
		},
		target: 'electron-main',
		externals: [nodeExternals()],
	},
].map((config) => merge(commonConf, config));

module.exports = configs;
