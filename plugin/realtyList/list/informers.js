/**
 * informers
 * ===================================================
 *
 */
(function () {
	var rent = app.exports.realty;

	var currencyCalculator = {
		classes: {
			icon: 'currency-widget__icon',
			list: 'currency-widget__list',
			item: 'currency-widget__list-item',
			dialog: 'currency-widget__dialog',
			iframe: 'currency-widget__frame'
		},
		tpls: {
			icon: '<div class="{$class} fl"></div>',
			list: '<ul class="{$class}">',
			item: '<li class="{$class}">',
			dialog: '<div class="{$class}" style="display:none;"></div>',
			//
			//  use host?
			//
			iframe: [
				'<iframe frameborder="0" class="{$class}" ',
				' src="js/calculators/currencies.html?cur1={$cur1};cur2={$cur2};usd" ',
				'></iframe>'
			].join( '' )
		},
		getTpl:function (name) {
			return this.tpls[ name ]
				.replace( '{$class}', this.classes[ name ] );
		},
		//
		//  makes iframe there
		//
		openClickable:function ($ctx) {
			var digest = this.currencies.digest,
				html = this.getTpl( 'iframe' ).replace( '{$cur1}', digest ),
				previous = this.currencies.previous;

			if ( !previous ) {
				previous = digest === 'RUB' ? 'USD' : 'RUB';
			}

			$ctx.append( html.replace( '{$cur2}', previous ) );
		},
		makeClickable:function ($holder) {
			var self = this,
				$node = $( '.' + self.classes.icon, $holder ),
				dialog_query = '.' + self.classes.dialog;

			$node
				.append( this.getTpl( 'dialog' ) )
				.on( 'click', function () {
					$( dialog_query, $node ).dialog( {
						resizable: false,
						modal: true,
						open:function () {
							self.openClickable( $( this ) );
						},
						close:function () {
							self.makeClickable( $holder );
						}
					} );
					return false;
				} );
		},
		currencies: {
			digest: 'RUB',
			previous: '',
			exactness: 3
		},
		setDigestCurrency:function (list) {
			var currents = this.currencies,
				last = currents.previous,
				currency = rent.getCurrency(),
				actual = list[ currency ? currency : 0 ].name;

			if ( !last || last != actual ) {
				currents.previous = currents.digest;
			}

			currents.digest = actual;
		},
		update:function () {
			var list = app.data.CURRENCY;

			this.setDigestCurrency( list );

			if ( this.initiated ) {
				this.updateDigestList( list );
			}
		},
		updateDigestList:function (list) {
			var $holder = $( '.' + this.classes.list );

			$holder.html( this.getDigestListItems( list ) );
		},
		/**
		 * 0: Object
		 id: ""
		 name: "-- не выбрано --"
		 1: Object
		 id: 1
		 name: "RUB"
		 value: "1"
		 */
		getDigestListItems:function (list) {
			var filter_current = this.currencies.digest,
				precision = this.currencies.exactness,
				actual_price = parseFloat( list[ rent.getCurrency() ].value ),
				items = '',
				item,
				tpl = this.getTpl( 'item' );

			$.each( list, function (i, v) {
				if ( i && v.name != filter_current ) {
					//  with recalculated prices
					item = ( parseFloat( v.value ) / actual_price ).toFixed( precision );
					item += ' ' + filter_current;

					items += tpl + v.name + ' = ' + item + '</li>';
				}
			} );

			return items;
		},
		/**
		 * gets initiated after start-find
		 */
		init:function () {
			var content = '',
				$holder = $( '.currencies', serviceInformers.$services ),
				list = app.data.CURRENCY;

			content += this.getTpl( 'icon' );//add picture

			this.initiated = true;
			content += this.getTpl( 'list' ) + this.getDigestListItems( list ) + '</ul>';

			$( '<div>' + content + '</div>' )
				.appendTo( $holder );

			this.makeClickable( $holder );
		}
	};

	var weather_informer = {
		$service: $( "#informers" ),
		$weather: $( "#rp5-informer" ),
		settings: {
			weather_root: 'http://rp5.ru/',
			weather_image_path: 'informer/100x60x2.php?callback2&um=00000',
			getWeatherUrl:function (id, lang) {
				return this.weather_root + id + "/" + lang;
			},
			getWeatherImage:function (id, lang) {
				lang = encodeURIComponent( lang );

				return this.weather_root + this.weather_image_path + "&id=" + id + "&lang=" + lang;
			},
			getLang:function (lang) {
				var app_lang = app.lang.lang;

				if ( lang && lang.search && lang.search( app_lang ) != -1 ) {
					lang = app_lang;
				} else if ( !lang || lang.search( 'en' ) != -1 ) {
					lang = 'en'//en
				} else {
					lang = lang.replace( /,.*/, '' );
				}
				return lang;
			}
		},
		fire:function (place) {
			var helper = this.settings,
				place_id = place.rp5_id,
				lang = helper.getLang( cookies().lang );//place.lang

			if ( place_id && lang ) {
				this.$weather.attr( "href", helper.getWeatherUrl( place_id, lang ) )
					.children().attr( "src", helper.getWeatherImage( place_id, lang ) );
			}
		},
		init:function () {
			this.$service.show();
		}
	};
	rent.weather_informer = weather_informer;



	var serviceInformers = {
		$services: $( '#informer-services' ),
		init:function (callback) {
			this.makeServices();

			callback( this.$services );
		},
		makeServices:function () {
			//weather_informer.$service.appendTo( $( '.weather', this.$services.show() ) );

			app.exports.realtyMetroAttach = $.proxy( this.metroAppendCallback, this );

			console.log( 'makesrvs' );
		},
		//
		metroAppendCallback:function ($map_show) {
			//$map_show.appendTo( $( '.search', this.$services ) );
		}
	};
	rent.serviceInformers = serviceInformers;


	rent.applyStartInformers = function () {
		weather_informer.init();
		function change_informer() { weather_informer.fire( place ); }
		app.event.add( "lang.change", "rp5-inf", change_informer );
		change_informer();

		//app.exports.realtyMetroStart(); todo uncomment

		currencyCalculator.init();
	};

}());