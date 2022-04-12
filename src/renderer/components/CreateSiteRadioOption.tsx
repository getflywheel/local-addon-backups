import React from "react";
import {
	Text,
	TextButtonExternal,
	Tooltip,
} from "@getflywheel/local-components";
import { $hub } from "@getflywheel/local/renderer";

const CreateSiteRadioOption = () => {
	const isLoggedIn = () => $hub.user === null;
	return {
		label: "Create from a Backup",
		disabled: isLoggedIn(),

		container: {
			element: (
				<Tooltip
					forceShow
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
				>
					<Text>
						Pull a saved site down to Local from Google Drive or
						Dropbox.
					</Text>
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
				</Tooltip>
			),
		},
	};
};

export default CreateSiteRadioOption;
