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
) => new Promise(() => {
	ReactDOM.render(
		<FlyModal
			contentLabel='Back up site'
			className={classnames('FlyModal')}
			shouldCloseOnOverlayClick={options.shouldCloseOnOverlayClick ?? false}
			onRequestClose={options.onRequestClose}
		>
			{renderContent()}
		</FlyModal>,
		document.getElementById('popup-container'),
	);
});
