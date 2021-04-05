import { ipcRenderer } from 'electron';
import { IPCEVENTS } from '../../constants';
import { store, actions } from '../store/store';

export const setupListeners = () => {
	const listeners = [
		{
			channel: IPCEVENTS.BACKUP_STARTED,
			cb: (_) => {
				store.dispatch(actions.setBackupRunningState(true));
			},
		},
		{
			channel: IPCEVENTS.BACKUP_COMPLETED,
			cb: (_) => {
				store.dispatch(actions.setBackupRunningState(false));
			},
		},
	];

	listeners.forEach(({ channel, cb }) => {
		if (!ipcRenderer.listenerCount(channel)) {
			ipcRenderer.on(channel, cb);
		}
	});
};
