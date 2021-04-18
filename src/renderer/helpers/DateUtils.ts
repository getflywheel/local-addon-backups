/**
 * Misc static date utility functions organized under one class to increase visibility and ease of use.
 */
 export default class DateUtils {
	/**
	 * Array of full month names.
	 */
	static monthFullNames = [
		'January',
		'February',
		'March',
		'April',
		'May',
		'June',
		'July',
		'August',
		'September',
		'October',
		'November',
		'December',
	];

	/**
	 * Array of month names abbreviated to 3 characters.
	 */
	static monthVariation3Names = [
		'Jan',
		'Feb',
		'Mar',
		'Apr',
		'May',
		'Jun',
		'Jul',
		'Aug',
		'Sep',
		'Oct',
		'Nov',
		'Dec',
	];

	/**
	 * Array of month names abbreviated to 4 characters.
	 */
	static monthVariation4Names = [
		'Jan',
		'Feb',
		'Mar',
		'Apr',
		'May',
		'June',
		'July',
		'Aug',
		'Sept',
		'Oct',
		'Nov',
		'Dec',
	];

	/**
	 * Format date to a variety of month, day, year patterns.
	 * @param time Time represented as either milliseconds or a Date object.
	 * @param unit1
	 * @param unit2
	 * @param unit3
	 * @param delimiter
	 */
	static format(
		time: number | Date,
		unit1: 'm' | 'mon' | 'mont' | 'month' = 'm',
		unit2: 'd' = 'd',
		unit3: 'yy' | 'yyyy' | '' = 'yy',
		delimiter: '/' | ' ' = '/',
		commaAfterDay: boolean = true,
	): string {
		const date: Date = typeof time === 'number' ? new Date(time) : time;
		const result: (string | number)[] = [];

		switch (unit1) {
			case 'm': // 1 (for January)
				result.push(date.getMonth() + 1);
				break;
			case 'mon': // Sep
			case 'mont': // Sept
			case 'month': // September
				result.push(this.getMonthByIndex(date.getMonth(), unit1));
				break;
			default:
		}

		switch (unit2) {
			case 'd': // 1
				result.push(`${date.getDate()}${commaAfterDay ? ',' : ''}`);
				break;
			default:
		}

		switch (unit3) {
			case 'yyyy': // 2019
				result.push(date.getFullYear());
				break;
			case 'yy': // 19
				result.push(date.getFullYear().toString().substr(-2));
				break;
			case '':
			default:
		}

		return result.join(delimiter);
	}

	/**
	 * Format as m/d/yy (e.g. 12/1/19).
	 * @param timeMs
	 */
	static formatmdyy(timeMs: number) {
		return this.format(timeMs, 'm', 'd', 'yy');
	}

	/**
	 * Format as day and month (e.g. September 1, Sept 1).
	 * @param timeMs
	 * @param variation mon=Sep, mont=Sept, month=September
	 */
	static formatMonthDay(timeMs: number, variation: 'mon' | 'mont' | 'month' = 'mont'): string {
		return this.format(timeMs, variation, 'd', '', ' ');
	}

	/**
	 * Format as `Today`, `Sept 1`, or `11/1/19` depending on whether it's today, this year, or past years.
	 * @param timeMs
	 */
	static formatAsTodayThisYearAndHistorical(timeMs: number): string {
		const dateLast = new Date(timeMs);
		const dateNow = new Date();

		// if not this calendar year
		if (dateLast.getFullYear() !== dateNow.getFullYear()) {
			return DateUtils.formatmdyy(timeMs);
			// if this year and the day and month match
		} if (dateLast.getDate() === dateNow.getDate() && dateLast.getMonth() === dateNow.getMonth()) {
			return 'Today';
		}

		return DateUtils.formatMonthDay(timeMs);
	}

	/**
	 * Get month name by index.
	 * @param index
	 * @param variation mon=Sep, mont=Sept, month=September
	 */
	static getMonthByIndex(index: number, variation: 'mon' | 'mont' | 'month' = 'mont'): string {
		switch (variation) {
			case 'mon':
				return this.monthVariation3Names[index];
			case 'mont':
				return this.monthVariation4Names[index];
			case 'month':
			default:
		}

		return this.monthFullNames[index];
	}

	static formatDateTimeAmPm = (date: Date): string => {
		let hours = date.getHours();
		let minutes: number | string = date.getMinutes();
		const ampm = hours >= 12 ? 'p.m.' : 'a.m.';
		hours = hours % 12;
		hours = hours ? hours : 12; // the hour '0' should be '12'
		minutes = minutes < 10 ? '0' + minutes : minutes;
		const strTime = hours + ':' + minutes + ' ' + ampm;

		return strTime;
	};

	static formatDate = (updatedAt: string) => {
		const date = new Date(updatedAt);

		return [
			DateUtils.format(date.getTime(), 'mon', 'd', 'yyyy', ' '),
			DateUtils.formatDateTimeAmPm(date),
		];
	};
}
