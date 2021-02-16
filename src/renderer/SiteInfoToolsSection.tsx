import React from 'react';
import { EmptyArea, Text } from '@getflywheel/local-components';
import GoogleDriveIcon from './assets/google-drive.svg';

interface Props {}

const SiteInfoToolsSection = (props: Props) => {

    return (
        <EmptyArea>
            <GoogleDriveIcon />
            <Text>No backups created yet</Text>
        </EmptyArea>
    );
};

export default SiteInfoToolsSection;
