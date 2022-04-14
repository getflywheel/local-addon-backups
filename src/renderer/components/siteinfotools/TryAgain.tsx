import React from 'react';
import { PrimaryButton } from '@getflywheel/local-components';
import styles from './TryAgain.scss';

interface Props {
	message: string;
	onClick: () => void;
}

const TryAgain = ({
	message,
	onClick,
}: Props) => (
	<div className={styles.TryAgain}>
		<p className={styles.TryAgain_Message}>
			{ message }
		</p>
		<PrimaryButton
			onClick={onClick}
			privateOptions={{ padding: 'm' }}
		>
			Try again
		</PrimaryButton>
	</div>
);

export default TryAgain;
