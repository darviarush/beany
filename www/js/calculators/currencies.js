/**
 * post-process for currencies time-clock
 */
document.getElementById('interchange_echo_kurs_text').value = 1;

/**
 * use currency by location.href
 */
var workFlow = function () {
	function onChange() {
		interchange_echo_kurs_fcn_otvet();//global
	}
	function getParamValue( url, token ) {
		var idx = url.indexOf( token ),
			end_token = ';',
			end_tail;

		if (idx >= 0) {
			end_tail = url.substring( idx + token.length );

			return end_tail.substring( 0, end_tail.indexOf( end_token ) );
		}
		return '';
	}

	var loc = location.href,
		token = getParamValue( loc, 'cur1=' );

	if (token) {
		useCurrent({
			actual: token,
			secondary: getParamValue( loc, 'cur2=' )
		});
	}
	//  find selected for switch to currency
	//
	//      global onchange === interchange_echo_kurs_fcn_otvet
	//
	function useCurrent(value) {
		var sel = document.getElementById('interchange_echo_kurs_select_valuta_start' ),
			sec = document.getElementById('interchange_echo_kurs_select_valuta_end' ),
			actual = sel.value,
			secondary = sec.value,
			differs = {
				actual: value.actual != actual,
				secondary: value.secondary != secondary
			};

		if (differs.actual) {
			switchCurrency( sel, actual, value.actual, true );
		}
		if (differs.secondary) {
			switchCurrency( sec, secondary, value.secondary );
		}

		if (differs.actual || differs.secondary) {
			onChange();
		}
	}
	//
	//  RUB is last actual
	//
	function switchCurrency( sel_start, actual, value, is_last ) {
		var inner,
			opts = sel_start.childNodes,
			len = opts.length;

		opts[ is_last ? (len -1) : 9 ].removeAttribute('selected');
		opts[ indexOpts( opts, len, value ) ].setAttribute('selected','selected');

		//  update slow part
		//
		inner = sel_start.innerHTML;
		sel_start.innerHTML = inner;
	}
	function indexOpts( opts, len, value ) {
		var item,
			idx = 0;

		for (; idx < len ; idx += 1) {
			item = opts[ idx ];

			if (item.value == value) {
				break;
			}
		}
		return idx;
	}
};

setTimeout(workFlow, 50);