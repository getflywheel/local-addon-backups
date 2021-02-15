import 'jest-extended';
import { snakeToCamelCase, convertKeysFromSnakeToCamelCase } from './utils';

describe('snakeToCamelCase', () => {
	it('converts strings in snake case to camel case', () => {
		const testWords = [['snake_case', 'snakeCase'], ['hello', 'hello'], ['get_the_morning_times', 'getTheMorningTimes']];
		testWords.forEach(([snake, camel]) => expect(snakeToCamelCase(snake)).toEqual(camel));
	});
});

describe('convertKeysFromSnakeToCamelCase', () => {
	it('converts snake case keys in an object to camelCase', () => {
		const testObj = {
			client_id: '1234',
			client_secret: 'very-secret',
		};

		const result = convertKeysFromSnakeToCamelCase({
			client_id: '1234',
			client_secret: 'very-secret',
		});

		expect(result.clientId).toEqual('1234');
		expect(result.clientSecret).toEqual('very-secret');
		expect(result.client_id).toBeUndefined();
		expect(result.client_secret).toBeUndefined();
	});
	it('does not mutate the input object', () => {
		const testObj = {
			client_id: '1234',
		};

		expect(convertKeysFromSnakeToCamelCase(testObj)).not.toEqual(testObj);
	});
});
