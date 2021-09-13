import { IpcAsyncResponse } from '../../helpers/createIpcAsyncResponse';
import { ipcAsync } from '@getflywheel/local/renderer';
import { clearSiteBanner } from './clearSiteBanner';
import { showSiteBanner } from './showSiteBanner';

/**
 * Typing for the `rejectWithValue` thunk response for an error.
 * Copied from internal redux toolkit library.
 */
declare class RejectWithValue<RejectValue> {
	readonly payload: RejectValue;
	name: string;
	message: string;
	constructor(payload: RejectValue);
}

/**
 * The `returnIPCResponseOrRejectWithError` helper response data type.
 */
interface onReponseDetails {
	/** optional id used to clear banners (only use if `onResponseIfNotAuthOrNetwork` might call `showSiteBanner` **/
	bannerId?: string;
	/** name of the ipc event **/
	ipcEventId: string;
	/** if request had an error **/
	isError: boolean;
	/** if error and it hasn't not been intercepted/captured globally (e.g. auth error banner) **/
	isErrorAndUncaptured: boolean;
	/** if successful result **/
	isResult: boolean;
	/** id of the site the request is for **/
	siteId: string;
}

const GRAPHQL_COMMON_BANNER_ID = 'GraphQL Internal Error';

const processAndCheckIfGlobalGraphQLError = (error: IpcAsyncResponse['error'], siteId: string) => {
	// if rejected error payload is explicitly set to an IpcAsyncResponse that failed Hub GraphQL authentication
	if (error?.isHubGraphQLAuthError) {
		showSiteBanner({
			icon: 'warning',
			id: GRAPHQL_COMMON_BANNER_ID,
			/*
			// todo - crum: this would be nice but requires exposing the hub ipc event to login
			linkText: 'Log in to Hub',
			linkHref: 'https://localwp.com/help-docs/advanced/updating-rsync-on-linux/',
			*/
			message: 'There was an issue authenticating your Local account. Please log in and try again.',
			siteID: siteId,
			variant: 'error',
		});
	} else if (error?.isHubGraphQLNetworkError && navigator.onLine) {
		showSiteBanner({
			icon: 'warning',
			id: GRAPHQL_COMMON_BANNER_ID,
			message: 'Cloud Backups requires internet access and there was an issue with the network. Please check your connection and try again.',
			siteID: siteId,
			title: 'Connection Error',
			variant: 'error',
		});
	}
};

/**
 * Convenience method that abstracts out repeated logic of handling global banners from ipc events or valid results.
 * @param ipcEventId
 * @param ipcEventParams
 * @param siteId
 * @param rejectWithValue
 * @param onResponseIfNotAuthOrNetwork
 * @param bannerId
 */
export async function callIPCAsyncAndProcessResponse<R = any, E = any> (
	/** name of the ipc event **/
	ipcEventId: string,
	/** params for the ipc event **/
	ipcEventParams: any[],
	/** id of the site the request is for **/
	siteId: string,
	/** function for the thunk rejectWithValue **/
	rejectWithValue: (value: IpcAsyncResponse<any, E>['error']) => RejectWithValue<IpcAsyncResponse<any, E>['error']>,
	/** callback for the response regardless of error or result and indicating if globally captured or not **/
	onResponseIfNotAuthOrNetwork: (details: onReponseDetails, response: IpcAsyncResponse<R, E>) => void,
	/** optional id used to clear banners (only use if `onResponseIfNotAuthOrNetwork` might call `showSiteBanner` **/
	bannerId?: string,
): Promise<IpcAsyncResponse<R> | RejectWithValue<IpcAsyncResponse<any, E>['error']>> {
	// clear out any previous common graphql banners for the site
	clearSiteBanner(siteId, GRAPHQL_COMMON_BANNER_ID);

	if (bannerId) {
		// clear out any previous banner caused by this thunk
		clearSiteBanner(siteId, bannerId);
	}

	const response: IpcAsyncResponse<R, E> = await ipcAsync(ipcEventId, ...ipcEventParams);
	const error = response.error;

	if (error) {
		processAndCheckIfGlobalGraphQLError(error, siteId);
	}

	// call thunk's optional onResponse handler
	onResponseIfNotAuthOrNetwork(
		{
			bannerId,
			ipcEventId,
			isError: !!error,
			isErrorAndUncaptured: error && !error.isHubGraphQLAuthError && !error.isHubGraphQLNetworkError,
			isResult: !error,
			siteId,
		},
		response,
	);

	if (error) {
		return rejectWithValue(error);
	}

	return response;
}
