import { ipcRenderer } from 'electron';

export const setupListeners = () => {
	const listeners = [];

	listeners.forEach(({ channel, cb }) => {
		if (!ipcRenderer.listenerCount(channel)) {
			ipcRenderer.on(channel, cb);
		}
	});
};
