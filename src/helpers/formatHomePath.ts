import os from 'os';

const unslashit = (string) => {
	if (typeof string !== 'string') {
		return string;
	}

	return string.replace(/\/+$/, '').replace(/\\+$/, '');
};

export const formatHomePath = (string, untrailingslashit = true) => {
	if (typeof string !== 'string') {
		return string;
	}

	const homedir = os.homedir();

	let output = string.replace(/^~\//, `${homedir}/`).replace(/^~\\/, `${homedir}\\`);

	if (untrailingslashit) {
		output = unslashit(output);
	}

	return output;
};
