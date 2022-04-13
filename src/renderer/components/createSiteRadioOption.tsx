import React, { useEffect, useState } from 'react';
import { Text, TextButtonExternal, Tooltip } from '@getflywheel/local-components';
import { $hub } from '@getflywheel/local/renderer';

// import { selectors } from "../../store/selectors";
// import { actions, store, useStoreSelector } from "../../store/store";

const CreateSiteRadioOption = () => {
	const isLoggedIn = () => $hub.user === null;

	// TODO: Update state to be able to handle various errors
	// const state = useStoreSelector(selectors.selectMultiMachineSliceState);
	// const { isLoading, providerIsErrored, activeError } = state;

	return {
		label: 'Create from a Cloud Backup',
		disabled: isLoggedIn(),

		container: isLoggedIn() && {
			element: (
				<Tooltip
					showDelay={2}
					content={
						<div>
							<h2>Tooltip details</h2>
						</div>
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
					onClick={(evt) => {
						evt.stopPropagation();
					}}
					inline={false}
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
