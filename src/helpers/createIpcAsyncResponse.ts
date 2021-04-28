export interface IpcAsyncResponse<R = any, E = any> {
	error?: {
		code?: string | number;
		extra?: E;
		message?: any;
	};
	/** The site id which is always returned to confirm source of original request **/
	siteId: string;
	result?: R;
}

export function createIpcAsyncResult (result: any, siteId: string): IpcAsyncResponse {
	return {
		result,
		siteId,
	};
}

// eslint-disable-next-line no-redeclare
export function createIpcAsyncError (errorMessage: string, siteId: string): IpcAsyncResponse;
// eslint-disable-next-line no-redeclare
export function createIpcAsyncError (error: Error, siteId: string): IpcAsyncResponse;
// eslint-disable-next-line no-redeclare
export function createIpcAsyncError (arg1: any, arg2?: string): IpcAsyncResponse {
	const error: IpcAsyncResponse['error'] = typeof(arg1) === 'object'
		// if this object has a message then it's likely an Error
		? arg1?.message
			// serialize with replacer to make sure it doesn't bomb out or resolve as undefined (e.g. typeof Error)
			? JSON.parse(JSON.stringify(arg1, Object.getOwnPropertyNames(arg1)))
			: {
				...arg1,
				// explicitly set 'message' because we know from above that it doesn't exist and xstate errors are weird
				message: arg1.toString(),
			}
		: typeof arg1 === 'string'
			? {
				message: arg1,
			}
			: {
				message: 'unknown',
			};

	return {
		error,
		siteId: arg2,
	};
}
