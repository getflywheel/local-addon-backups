import React from 'react';
import { useStoreSelector } from '../../store/store';
import { selectors } from '../../store/selectors';
import {
	Close,
} from '@getflywheel/local-components';
import styles from './CloseButtonWithStore.scss';

interface Props {
	onClose: () => void;
}

export const CloseButtonWithStore = (props: Props) => {
	const state = useStoreSelector(selectors.selectMultiMachineSliceState);
	const { isErrored } = state;

	return (
		<Close
			className={isErrored && styles.erroredState}
			onClick={props.onClose}
		/>
	);
};
