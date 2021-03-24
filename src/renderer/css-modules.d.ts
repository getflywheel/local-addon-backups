declare module '*.sass' {
	const sass: {[className: string]: string};
	export = sass;
}

declare module '*.scss' {
	const scss: {[className: string]: string};
	export = scss;
}
