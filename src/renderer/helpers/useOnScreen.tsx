import {
	useEffect,
	useState,
} from 'react';

/**
 * Checks if element is visible on the screen.
 * This includes checking whether the ref element is scrolled into a visible position.
 * @param ref
 * @example
 * ```js
 * const DummyComponent = () => {
 *   const ref = useRef()
 *   const isVisible = useOnScreen(ref)
 *   return <div ref={ref}>{isVisible && `Yep, I'm on screen`}</div>
 * }
 * ```
 */
export default function useOnScreen (ref) {
	const [isIntersecting, setIntersecting] = useState(false);

	const observer = new IntersectionObserver(
		([entry]) => setIntersecting(entry.isIntersecting),
	);

	useEffect(() => {
		observer.observe(ref.current);

		// Remove the observer as soon as the component is unmounted
		return () => {
			observer.disconnect();
		};
	}, []);

	return isIntersecting;
}
