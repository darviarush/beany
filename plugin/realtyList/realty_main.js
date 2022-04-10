/**
 * get initiated
 *
 * @type {Object}
 *
 */
app.exports.realty = $.extend( app.exports.realty, {
	getCurrency: function () {			//  выбираем валюту по умолчанию
		return app.currency.id();
	},
	bindHover: function ($node) {		// устанавливает всплывающую кнопку
		var nodes = {
			$info: $node.find( '.float-info' ),
			$button: $node.find( '.float-info-button' )
		};

		$node
			.on('mouseenter', function () {
				//nodes.$info.hide("fast");
				nodes.$button.show("fast");
			} )
			.on('mouseleave', function () {
				//nodes.$info.show("fast");
				nodes.$button.hide("fast");
			});
	},
	fltChanger: {
		callback: $.noop,
		registerCallback: function (fn) {
			this.callback = fn;
		},
		use_list_params: function ( params ) {
			var changeDepartureParam = function (id, value, params) {
				var is_empty = /(00-\d{2}|00)$/.test( value );

				params[ id.replace(/^#\w+-(\w+)-\w+$/, 'date_$1') ] = is_empty ? '' : value;
			};

			changeDepartureParam( 'flt-from-dp', $( '#flt-from-dp' ).val(), params );
			changeDepartureParam( 'flt-to-dp', $( '#flt-to-dp' ).val(), params );

			return params;
		},
		on_list: function ( params ) {
			var departure_params = params ? params : {};

			departure_params = this.use_list_params( departure_params );
			if ( params ) {
				return departure_params;
			}

			this.callback( departure_params );
		},
		dayRender: function (day, val) {
			var value = day.val(),
				mon = new Date( val[0], val[1], 0 ).getDate(),
				tpl = '<option value="{$idx}">{$text}</option>',
				text,
				inner = '';

			day.find( ":not(:eq(0))" )
				.remove();

			for (var i = 1; i <= mon ; i++ ) {
				text = _( datePickerSelectors.dayMins[ new Date( val[0], val[1]-1, i ).getDay() ] );

				inner += tpl.replace( '{$idx}', i )
					.replace( '{$text}', text +' '+ i );
			}

			day.append( inner )
				.val( value );
		},
		//  helpers
		twoDigits: function (val) {
			return val < 10 ? "0"+ val : val;
		}
	}
});
