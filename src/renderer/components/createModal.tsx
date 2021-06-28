import React from 'react';
import ReactDOM from 'react-dom';
import { FlyModal } from '@getflywheel/local-components';
import classnames from 'classnames';

export const createModal = (
	renderContent: () => React.ReactElement,
) => new Promise(() => {
	ReactDOM.render(
		<FlyModal
			contentLabel='Back up site'
			className={classnames('FlyModal')}
			shouldCloseOnOverlayClick={false}
		>
			{renderContent()}
		</FlyModal>,
		document.getElementById('popup-container'),
	);
});
