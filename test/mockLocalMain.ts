export const ServiceContainer = {
	cradle: {
		localLogger: { child: jest.fn() },
		userData: {
			get: jest.fn(() => ({ a: 'brian eno' })),
			set: jest.fn(),
		},
	},
};

export const getServiceContainer = () => ServiceContainer;
