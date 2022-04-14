import React from 'react';
import { Container, Text, TextButtonExternal, Tooltip } from '@getflywheel/local-components';
import { $hub } from '@getflywheel/local/renderer';

/*
 * Defines the RadioItem that Local Core uses within the RadioBlock during
 * the CreateSite flow.
 */
const CreateSiteRadioOption = () => {
	const isLoggedOut = $hub.user === null;

	return {
		label: 'Create from a Cloud Backup',
		key: 'create-site-option-from-backup',
		disabled: isLoggedOut,

		container: isLoggedOut && {
			element: (
				<Tooltip
					showDelay={2}
					content={
						<Container margin="s">
							<Text tag="p">
								Uh oh!
								<br />
								You need to log into your Local Account to use Cloud Backups.
							</Text>
							<TextButtonExternal
								onClick={() => {
									$hub.login();
								}}
							>
								Log into Local Account
							</TextButtonExternal>
						</Container>
					}
					popperOffsetModifier={{
						offset: [0, 12],
					}}
					position="top"
				/>
			),
		},

		content: (
			<>
				<Text>Pull a saved site down to Local from Google Drive or Dropbox.</Text>
				<TextButtonExternal
					onClick={(evt: Event) => {
						evt.stopPropagation();
					}}
					inline
					style={{ paddingTop: 7 }}
					href="https://localwp.com/help-docs/local-add-ons-help/cloud-backups/"
				>
					What&apos;s this?
				</TextButtonExternal>
			</>
		),
	};
};

export default CreateSiteRadioOption;
