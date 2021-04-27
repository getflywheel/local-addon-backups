import path from 'path';
import fs from 'fs-extra';

interface GraphQLConfig {
	port?: string;
	authToken?: string;
	url?: string;
	subscriptionUrl?: string;
}

export default function readGraphQLConfig (): GraphQLConfig {
	let config = {};
	try {
		const configString = fs.readFileSync(
			/* @ts-ignore ignoring due to the fact that this is added by Local at runtime */
			path.join(process.electronPaths.userDataPath, 'graphql-connection-info.json'),
			'utf8',
		);

		config = JSON.parse(configString);
	} catch (err) {
		console.error(err);
	}

	return config;
}
