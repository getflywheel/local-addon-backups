module.exports = {
	preset: 'ts-jest',
	setupFilesAfterEnv: ['jest-extended'],
	moduleNameMapper: {
		'^@getflywheel/local/main': '<rootDir>/test/mockLocalMain.ts',
	},
};
