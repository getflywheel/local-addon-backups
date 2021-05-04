import { IpcAsyncResponse } from '../../helpers/createIpcAsyncResponse';
import { ipcAsync } from '@getflywheel/local/renderer';
import { clearSiteBanner } from './clearSiteBanner';

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
	/** id of the site the request is for **/
	siteId: string;
}

/**
 * Convenience method that abstracts out repeated logic of handling global banners from ipc events or valid results.
 * @param ipcEventId
 * @param siteId
 * @param rejectWithValue
 * @param onResponseIfNotAuthOrNetwork
 * @param bannerId
 */
export async function handleIPCResponseOrRejectWithError<R = any, E = any> (
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
	if (bannerId) {
		// clear out any previous banner caused by this thunk
		clearSiteBanner(siteId, bannerId);
	}

	const response: IpcAsyncResponse<R, E> = await ipcAsync(ipcEventId, ...ipcEventParams);
	const error = response.error;

	// call thunk's optional onResponse handler
	onResponseIfNotAuthOrNetwork(
		{
			bannerId,
			ipcEventId,
			isError: !!error,
			isErrorAndUncaptured: error && !error.isHubGraphQLAuthError && !error.isHubGraphQLNetworkError,
			siteId,
		},
		response,
	);

	if (error) {
		return rejectWithValue(error);
	}

	return response;
}
