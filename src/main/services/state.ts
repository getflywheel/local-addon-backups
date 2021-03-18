export default {
	/**
	 * Keep a reference to in progress state machines so that we can easily
	 * prevent more than one backup or restore process from happening simultaneously
	 */
	inProgressStateMachine: null,
};
