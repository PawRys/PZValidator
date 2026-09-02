const charMap: { [key: string]: string } = {
	ą: 'ą',
	ü: 'ć',
	Ċ: 'ę',
	á: 'ł',
	Ĕ: 'ń',
	ó: 'ó',
	Ğ: 'ś',
	Ī: 'ż',
	Ĩ: 'ź',
	Ą: 'Ą',
	û: 'Ć',
	ĉ: 'Ę',
	à: 'Ł',
	ē: 'Ń',
	Ó: 'Ó',
	ĝ: 'Ś',
	ĩ: 'Ż',
	ħ: 'Ź',
};

export const correctText = (input: string): string => {
	return input
		.split('')
		.map(char => charMap[char] || char)
		.join('');
};

export const calcWeight = (text: string, packsCount: number): number => {
	const size = text.match(/([0-9]{1,2}(?:,[0-9])?x[0-9]{2,4}x[0-9]{2,4})/i);
	const density = 700;

	if (size) {
		return (
			size[0]
				.replace(/,/g, '.')
				.split('x')
				.reduce<number>((acc, item) => (acc * Number(item)) / 1000, 1) *
			packsCount *
			density
		);
	}

	return 0;
};

export const combineRegex = (...regexes: RegExp[]) => regexes.map(regex => regex.source).join('');

export function getArrivalPlace(text_rows: string[]): string {
	let result = '';
	text_rows.forEach((textrow, i) => {
		const LF = textrow.includes('Terms of delivery:') ? textrow.replace('Terms of delivery:', '').trim() : '';
		const ST = /100\s*%\s*Prepayment\s*DAP/i.test(textrow) ? textrow.replace(/100\s*%\s*Prepayment/i, '').trim() : '';

		if (LF) result = LF;
		if (ST) result = ST;
	});
	return result;
}

export function getPZNum(text_rows: string[]): string {
	let result = '';
	text_rows.forEach((textrow, i) => {
		const PZ = textrow.match(/\d{2}-PZ\/\d{4}\w+\b/i);
		if (PZ) result = PZ[0];
	});
	return result;
}

export function getInvoiceNum(text_rows: string[]): string {
	let result = '';
	text_rows.forEach((textrow, i) => {
		const LF = textrow.match(/LF[0-9]{2} M[0-9]{6}/i);
		const ST = textrow.match(/DR[0-9]+/i);

		if (LF) result = LF[0];
		if (ST) result = ST[0];
	});
	return result;
}

export function getTruckNum(text_rows: string[]): string {
	let result = '';
	text_rows.forEach((textrow, i) => {
		if (textrow.includes('Carriage by:')) {
			result = textrow.replace('Carriage by:', '').trim();
			return;
		}
	});
	return result;
}

export function getCMRNum(text_rows: string[]): string {
	let result = '';
	text_rows.forEach((textrow, i) => {
		const match = textrow.match(/CMR_[A-Z]{1}[0-9]{6}/i);
		if (match) {
			result = match[0];
			return;
		}
	});
	return result;
}

export function getGlueType(text: string): string {
	let result = '';
	if (/foliowana|antypo|melamin|M\?M/g.test(text)) result = 'WD';
	if (/wodo|\bWD\b|\bEXT\b|\bE\b/g.test(text)) result = 'WD';
	if (/sucho|\bMR\b|\bINT\b/g.test(text)) result = 'MR';
	return result;
}

export function getFaceType(text: string): string {
	let result = '';

	const regexpGrade = /\b(S|B|BB|CP|WG|WGE|C|CC|V|[WFM]( ?[ALT])?( I{1,2})?)\b/;
	const expression = new RegExp(`${regexpGrade.source}/${regexpGrade.source}`, 'gi');
	if (expression.test(text)) {
		const grade = text.match(expression);
		result = grade ? grade[0] : '??/??';
		result = result.replace(/( ?[ALT])?( I{1,2})?/g, '');
	}
	/*!!! Keep order. Any order if equal number. !!! */

	/*1*/ if (/s01\//gi.test(text)) result = 'B/B';
	/*1*/ if (/s02\//gi.test(text)) result = 'B/BB';
	/*1*/ if (/s03\//gi.test(text)) result = 'S/BB';
	/*1*/ if (/s04\//gi.test(text)) result = 'BB/BB';
	/*1*/ if (/s05\//gi.test(text)) result = 'BB/CP';
	/*1*/ if (/s06\//gi.test(text)) result = 'BB/WG';
	/*1*/ if (/s07\//gi.test(text)) result = 'CP/CP';
	/*1*/ if (/s08\//gi.test(text)) result = 'WGE/WGE';
	/*1*/ if (/s09\//gi.test(text)) result = 'WG/WG';
	/*1*/ if (/s10\//gi.test(text)) result = 'C/C';
	/*1*/ if (/s11\//gi.test(text)) result = 'Kilo';
	/*1*/ if (/s12\/|s13\//gi.test(text)) result = 'F/F'; // II applied in *4*
	/*1*/ if (/s14\/|s15\//gi.test(text)) result = 'W/F'; // II applied in *4*
	/*1*/ if (/s16\/|s17\//gi.test(text)) result = 'W/W'; // II applied in *4*
	/*1*/ if (/s18\//gi.test(text)) result = 'CP/C';
	/*1*/ if (/s19\//gi.test(text)) result = 'M/WG';
	/*1*/ if (/s20\//gi.test(text)) result = 'F/BB';
	/*1*/ if (/s21\//gi.test(text)) result = 'F/WG';
	/*1*/ if (/s22\//gi.test(text)) result = 'BB/C';
	/*1*/ if (/s23\//gi.test(text)) result = 'W/BB';
	/*1*/ if (/s24\//gi.test(text)) result = 'W/WG';
	/*1*/ if (/s25\//gi.test(text)) result = 'B/WG';
	/*1*/ if (/s26\//gi.test(text)) result = 'F/WH';
	/*1*/ if (/s27\//gi.test(text)) result = 'W/CP';
	/*1*/ if (/s28\//gi.test(text)) result = 'S/WG';
	/*1*/ if (/s29\//gi.test(text)) result = 'S/CP';
	/*1*/ if (/s30\//gi.test(text)) result = 'V/V';
	/*1*/ if (/s31\//gi.test(text)) result = 'OSB3';
	/*1*/ if (/s32\//gi.test(text)) result = 'OSB T&G';
	/*1*/ if (/s35\//gi.test(text)) result = 'BB/CC';

	/*2.1*/ if (/\bkilo\b/gi.test(text)) result = 'Kilo';
	/*2.2*/ if (/\bPQ\b/gi.test(text)) result = 'PQ';
	/*2.3*/ if (/\bPQ\W?F\b/gi.test(text)) result = 'PQF';
	/*3*/ if (/\bF\/W\W?H\b|Heksa/gi.test(text)) result = 'Heksa';
	/*3*/ if (/\bF\/W\W?H\W?\+|Heksa\W?\+|Heksa Plus/gi.test(text)) result = 'Heksa Plus';
	/*3*/ if (/\bM\/M\b|\bopal white\b/gi.test(text)) result = 'M/M';
	// /*3*/ if (/\bhoney\b/gi.test(text)) result = 'Honey'
	// /*3*/ if (/\bM\/M\b|mel/gi.test(text)) result = 'M/M'
	// /*3*/ if (/\bopal\b/gi.test(text)) result = 'Opal'
	// /*3*/ if (/\bopal white\b/gi.test(text)) result = 'Opal White'
	/*3*/ if (/\bPF\b|poliform/gi.test(text)) result = 'Poliform';
	/*3*/ if (/\bPPL\b/gi.test(text)) result = 'PPL';
	/*3*/ if (/OSB/gi.test(text)) result = 'OSB';

	/*4*/ // !important Apply II grade at the end
	// /*4*/ if (/s13\/|s15\/|s17\/|((WT|FA|MA|W|F|M) II)/gi.test(text)) result += ' II'
	/*4*/ if (/s13\/|s15\/|s17\/|([WFM]( ?[ALT])? II)/gi.test(text)) result += ' II';

	return result;
}

export function getColor(text: string, faceType: string): string | null {
	const results = new Set();

	if (/\bhoney\b/gi.test(text)) results.add('honey');
	if (/yell|zółt[ya]/gi.test(text)) results.add('yellow');
	if (/black|czarn[ya]/gi.test(text)) results.add('black');
	if (/green|zielon[ya]/gi.test(text)) results.add('green');
	if (/blue|niebiesk[ia]/gi.test(text)) results.add('blue');
	if (/\bred\b|czerwon[ya]/gi.test(text)) results.add('red');
	if (/(?<!(opal ?))(white)/gi.test(text)) results.add('white');
	if (/(?<=(opal ?))(white)/gi.test(text)) results.add('opal white');
	if (/c\.less|transp|bezbarwna|colorless/gi.test(text)) results.add('c.less');
	if (/(?<!(l\. ?|jasn[yoa] ?|light ?))(grey|szar[ya])/gi.test(text)) results.add('grey');
	if (/(?<=(l\. ?|jasn[yoa] ?|light ?))(grey|szar[ya])/gi.test(text)) results.add('l.grey');
	if (/(?<=(l\. ?|jasn[yoa] ?|light ?))(br|brąz|brown)/gi.test(text)) results.add('l.brown');
	if (/(?<!(l\. ?|jasn[yoa] ?|light ?))(d\.)?(br|brąz|brown)\b/gi.test(text)) results.add('d.brown');

	/* Apply defaults if no color specified */
	if (results.size === 0) {
		if (faceType?.match('F/F')) results.add('d.brown');
		if (faceType?.match('F/W')) results.add('d.brown');
		if (faceType?.match('W/F')) results.add('d.brown');
		if (faceType?.match('W/W')) results.add('d.brown');
		if (faceType?.match('Heksa')) results.add('d.brown');
		if (faceType?.match('M/M')) results.add('white');
		// if (faceType?.match('Poliform')) results.add('(nieznany)');
		// if (faceType?.match('PPL')) results.add('(nieznany)');
		// if (faceType?.match('PQF')) results.add('(nieznany)');
	}

	// if (results.size === 0 && faceType) results.add('(brak)')
	// else results.add('(laminat)')
	// if (results.size === 0) results.add('(---)')
	// if (/\b(S|B|BB|CP|WG|WGE|C|CC|V|KILO|PQ)\b/.test(text)) results.add('');
	return results.size ? Array.from(results).join(' ') : null;
}
