import React, { useEffect, useState } from 'react';
import { Banner } from '@getflywheel/local-components';
import { ipcAsync } from '@getflywheel/local/renderer';
import { IPCASYNC_EVENTS } from '../../constants';
import styles from './PromoBanner.scss';

/*
 * Promo Banner for new users of Cloud Backups.
 */
const PromoBanner = () => {
	const [showBanner, setShowBanner] = useState(false);

	const onPromoBannerDismiss = async () => {
		await ipcAsync(IPCASYNC_EVENTS.REMOVE_PROMO_BANNER);
		setShowBanner(false);
	};

	useEffect(() => {
		const getUserDataShowPromoBanner = async () => {
			const showBanner = await ipcAsync(
				IPCASYNC_EVENTS.SHOULD_LOAD_PROMO_BANNER,
			);
			if (showBanner && showBanner?.show === true) {
				setShowBanner(true);
			}
		};
		getUserDataShowPromoBanner();
	});

	return (
		showBanner && (
			<Banner
				className={styles.promoBanner}
				key="cloud-backups-new-user-promo-banner"
				variant="neutral"
				onDismiss={onPromoBannerDismiss}
				icon="none"
			>
				<p>&#127881;&nbsp;&nbsp;</p>
				<p>
					You can now create a site from a Cloud Backup! Select this
					option to get started.
				</p>
			</Banner>
		)
	);
};

export default PromoBanner;
