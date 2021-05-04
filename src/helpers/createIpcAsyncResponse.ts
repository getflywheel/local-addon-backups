/**
 * This IPC Response object represents a constant and predictable response type for all IPC calls.
 * This response always includes a siteId property which can be used to verify which site requested data upon return.
 * This response will always include either an error or result property but never both.
 */
export interface IpcAsyncResponse<R = any, E = any> {
	error?: {
		/** optional error code which can be explicitly set by the dispatcher of this error **/
		code?: string | number;
		/** if hub graphql call and the error is due to an authentication issue like expired token **/
		isHubGraphQLAuthError?: boolean;
		/** if hub graphql call and the error is due to a network error **/
		isHubGraphQLNetworkError?: boolean;
		/** if any extra data needs to be passed from the main thread to renderer along with this error **/
		extra?: E;
		/** the original error message **/
		message?: any;
		/** if `createIpcAsyncError` has an error passed to it, this will be a copy of that error object **/
		original?: {
			/** if graphql call, this should be either be null or an array of error messages objects **/
			graphQLErrors: { message: string }[],
			/** standard error message **/
			message: string,
			/** if graphql call, this should be either be null or a string error message **/
			networkError?: string | null,
			/** if stacktrace is available **/
			stack?: string,
		}
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
	let error: IpcAsyncResponse['error'];

	if (typeof (arg1) === 'object') {
		// if this object has a message then it's likely an Error
		error = arg1?.message
			// serialize with replacer to make sure it doesn't bomb out or resolve as undefined (e.g. typeof Error)
			? {
				message: arg1?.message,
				original: JSON.parse(JSON.stringify(arg1, Object.getOwnPropertyNames(arg1))),
			}
			: {
				...arg1,
				// explicitly set 'message' because we know from above that it doesn't exist and xstate errors are weird
				message: arg1.toString(),
			};

		// if graphql error return authentication error
		// todo - crum: will this work in production ???
		error.isHubGraphQLAuthError = !!arg1?.graphQLErrors?.find(
			(item) => item.debugMessage.includes('Unauthenticated'),
		);
		// if graphql error returns a network error
		error.isHubGraphQLNetworkError = !!arg1?.networkError;
	} else {
		error = typeof arg1 === 'string'
			? {
				message: arg1,
			}
			: {
				message: 'unknown',
			};
	}

	return {
		error,
		siteId: arg2,
	};
}
