import React from 'react';
import type { Site } from '@getflywheel/local';
import { OfflineBanner } from '@getflywheel/local-components';
import { MigrationBanner } from './MigrationBanner';
import useUpdateActiveSiteAndDataSources from '../useUpdateActiveSiteAndDataSources';
import { store, useStoreSelector } from '../../store/store';
import styles from './SiteInfoToolsSection.scss';
import { ToolsHeader } from './ToolsHeader';
import { ToolsContent } from './ToolsContent';
import { getEnabledProvidersHub, updateActiveSiteAndDataSources } from '../../store/thunks';
import TryAgain from './TryAgain';
import { $offline } from '@getflywheel/local/renderer';
import { observer } from 'mobx-react';
import { ipcAsync } from '@getflywheel/local/renderer';
import { IPCASYNC_EVENTS } from '../../../constants';
const { ipcRenderer } = window.require('electron');

interface Props {
    site: Site;
}

const SiteInfoToolsSection = observer(({ site }: Props) => {
    const { offline } = $offline;

    // refresh when going from offline to online
    React.useEffect(() => {
        if (!offline) {
            store.dispatch(updateActiveSiteAndDataSources({ siteId: site.id }));
        }
    }, [offline, site.id]);

    // update active site anytime the site prop changes
    useUpdateActiveSiteAndDataSources(site.id);

    // migration status
    const [migrationStatus, setMigrationStatus] = React.useState<'notStarted' | 'completed'>('notStarted');
    React.useEffect(() => {
        let mounted = true;
        (async () => {
            try {
                const response = await ipcAsync(IPCASYNC_EVENTS.MIGRATE_BACKUPS_STATUS);
                const migrated = response?.result?.migrated === true;
                if (mounted) {
                    setMigrationStatus(migrated ? 'completed' : 'notStarted');
                }
            } catch {
                // noop: default to notStarted on error
            }
        })();
        return () => { mounted = false; };
    }, []);

    // Update banner live when migration completes (also covers post-dismiss).
    React.useEffect(() => {
        const onMigrationComplete = (_event: any, migrationResult: { success?: boolean }) => {
            if (migrationResult?.success) {
                setMigrationStatus('completed');
            }
        };
        ipcRenderer.on(IPCASYNC_EVENTS.MIGRATE_BACKUPS_COMPLETE, onMigrationComplete);
        return () => {
            ipcRenderer.removeListener(IPCASYNC_EVENTS.MIGRATE_BACKUPS_COMPLETE, onMigrationComplete);
        };
    }, []);

    const {
        hasErrorLoadingEnabledProviders,
    } = useStoreSelector((state) => state.providers);
    const { id } = useStoreSelector((state) => state.activeSite);

    /**
     * @todo sometimes the query to hub fails (like if the auth token has expired)
     * we should handle that more gracefully
     */

    if (hasErrorLoadingEnabledProviders && !offline) {
        return (
            <div className={styles.SiteInfoToolsSection}>
                <TryAgain
                    message={'There was an issue retrieving your Cloud Backups providers.'}
                    onClick={() => store.dispatch(getEnabledProvidersHub({ siteId: id }))}
                />
            </div>
        );
    }

    return (
        <div className={styles.SiteInfoToolsSection}>
            <OfflineBanner offline={offline} />
			<MigrationBanner migrationStatus={migrationStatus} siteId={site.id} />
            <ToolsHeader site={site} offline={offline} migrationStatus={migrationStatus} />
            <ToolsContent
                className={styles.SiteInfoToolsSection_Content}
                offline={offline}
                site={site}
            />
        </div>
    );
});

export default SiteInfoToolsSection;
