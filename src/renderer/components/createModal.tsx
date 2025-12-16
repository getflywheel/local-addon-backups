import React from 'react';
import ReactDOM from 'react-dom';
import { FlyModal } from '@getflywheel/local-components';
import classnames from 'classnames';

type CreateModalOptions = {
	onRequestClose?: () => void;
	shouldCloseOnOverlayClick?: boolean;
};

export const createModal = (
	renderContent: () => React.ReactElement,
	options: CreateModalOptions = {},
) => new Promise<void>((resolve, reject) => {
	try {
		const popupContainer = document.getElementById('popup-container');
		if (!popupContainer) {
			throw new Error('Could not find #popup-container for modal rendering');
		}

		// `@types/react-dom` in this repo does not expose `render` (newer React typing),
		// but this addon still uses the legacy render API at runtime.
		(ReactDOM as any).render(
			<FlyModal
				contentLabel='Back up site'
				className={classnames('FlyModal')}
				shouldCloseOnOverlayClick={options.shouldCloseOnOverlayClick ?? false}
				onRequestClose={options.onRequestClose}
			>
				{renderContent()}
			</FlyModal>,
			popupContainer,
		);

		// This helper is primarily used for side-effects; resolve immediately so callers
		// awaiting it don't hang indefinitely.
		resolve();
	} catch (err) {
		reject(err);
	}
});
