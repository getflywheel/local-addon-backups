import React from 'react';
import styles from './MigrationResultBanners.scss';
import SuccessIcon from '../../assets/success-icon.svg';
import WarningIcon from '../../assets/warning.svg';
import InformationIcon from '../../assets/information-icon.svg';

type Variant = 'success' | 'warning' | 'error' | 'neutral';

interface Props {
	variant: Variant;
	text?: React.ReactNode;
	subText?: React.ReactNode;
	className?: string;
}

export const MigrationBanner: React.FC<Props> = ({ variant, text, subText, className }) => {
	const iconForVariant = (v: Variant) => {
		switch (v) {
			case 'success':
				return <SuccessIcon />;
			case 'warning':
				return <WarningIcon />;
			case 'error':
				return '✗';
			case 'neutral':
			default:
				return  <InformationIcon />;
		}
	};

	return (
		<div className={`${styles.MigrationBanner} ${styles[variant]} ${className ?? ''}`.trim()}>
			<div className={styles.MigrationBanner_icon} aria-hidden>
				{iconForVariant(variant)}
			</div>
			<div className={styles.MigrationBanner_content}>
				{text && <div className={styles.MigrationBanner_text}>{text}</div>}
				{subText && <div className={styles.MigrationBanner_subText}>{subText}</div>}
			</div>
		</div>
	);
};

export default MigrationBanner;
