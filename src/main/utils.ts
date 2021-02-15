type GenericObject = { [key: string]: any };

/**
 * Converts a snake case string to a camelCase string
 *
 * @param inputStr
 */
export const snakeToCamelCase = (inputStr: string) => inputStr.split('_').map((s, i) => {
	const lowerCase = s.toLowerCase();
	if (i === 0) {
		return lowerCase;
	}

	return `${lowerCase.substring(0, 1).toUpperCase()}${lowerCase.substring(1)}`;
}).join('');

/**
 * Takes an object and returns a new object with any snake case keys converted to camelCase
 *
 * @param obj
 */
export const convertKeysFromSnakeToCamelCase = (obj: GenericObject) => Object.entries(obj).reduce((acc, [key, value]) => {
	acc[snakeToCamelCase(key)] = value;
	return acc;
}, {});
