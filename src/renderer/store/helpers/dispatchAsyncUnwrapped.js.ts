import { unwrapResult, Action, AnyAction, ThunkAction } from '@reduxjs/toolkit';
import { store } from '../store';

/**
 * This helper function unwraps the redux thunk return to allow `await dispatch` to work.
 * Here's officially supported recommendation this is based on: https://redux-toolkit.js.org/api/createAsyncThunk#unwrapping-result-actions
 * @param action the redux action or thunk call to be dispatched to the store and its reducers/extraReducers
 */
export default function dispatchAsyncThunk (action: any) {
	return new Promise((resolve, reject) => {
		try {
			store.dispatch(action)
				.then(unwrapResult)
				.then(resolve)
				.catch(reject);
		} catch (error) {
			reject(error);
		}
	});
}
