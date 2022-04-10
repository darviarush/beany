/**
 *  for city and armory - todo change package name
 */
(function () {
	var rent = app.exports.realty,
		//  in terms
		cached = {};

	var realtyListMethods = {
		//
		//  @param {string} plugin_query -url адрес запроса к контроллеру
		//  @param {boolean} is_full -make content on response
		//
		create_city: function ($elem, plugin_query, is_full) {
			//  serialize to html geo-properties
			//  @param {object} item -геоположение
			var get_line = (function () {
				var general = function (item, has_count) {
					var tpl = '{$city}{$vicinity}{$region}{$country}',
						tokens = {
							city: (item.city ? item.city : ""),
							vicinity: (item.vicinity ? " <u>"+ item.vicinity +"</u>" : ""),
							region: (item.region?" <i>"+ item.region +"</i>" : ""),
							country: " <b>"+ item.country +"</b>"
						};

					if ( has_count ) {
						tokens.country += " <em>"+ item.count +"</em>";
					}
					return tpl.replace('{$city}', tokens.city)
						.replace('{$vicinity}', tokens.vicinity)
						.replace('{$region}', tokens.region)
						.replace('{$country}', tokens.country);

				};
				return {
					full: function (item) {
						return general(item, true);
					},
					short: function (item) {
						return general(item, false);
					}
				}
			}());

			var stuffLink = get_line[ is_full ? 'full' : 'short' ],
				setLabelValue = function (idx, item) {
					var value = item.city || item.vicinity || item.region || item.country;

					item.label = item.value = value;
				},
				traceConsole = {
					focus: function (event, ui) {
						console.log( "focus="+ app.exports.repr(ui.item) );
					},
					/*search: function (event, ui) {
					 console.log( "search="+ app.exports.repr(ui));
					 },*/
					change: function (event, ui) {
						console.log( "change="+ app.exports.repr(ui) );
					}
				},
				clearPlace = function () {
					if ( this.value.replace(/^\s*/) == '' ) rent.rentCard.place = {};
				},
				onSource = function (data, response) {
					var self = this,
						term = data.term,
						xterm = cached[ term ],
						callback = function (data) {
							var ul = self.menu.element,
								exp = app.exports.metro;

							response( data );

							ul.find( "a" ).each( function (idx) {
								var item = data[ idx ];
								if (item) $(this).html( stuffLink(item) );
							});
							console.log("onSource.place="+app.exports.repr(rent.rentCard.place)+' '+app.exports.repr(data[0]))
							rent.rentCard.place = data[ 0 ] || {};

							if (exp && exp.hasOwnProperty( 'autocompleteUpdate' ) ) {
								exp.autocompleteUpdate();
							}
						};

					if ( xterm ) {
						callback( xterm );
						return;
					}

					$.get( plugin_query, {
						term: term,
						country_id: rent.rentCard.place.country_id // todo
					}, function (data) {
						data = app.util.rowsToArrayOpt( data );
						$.each( data, setLabelValue );

						cached[ term ] = data;
						callback( data );
					});
				};

			$elem.autocomplete( $.extend( traceConsole, {
				source: onSource,
				select: function ( event, ui ) {
					console.log("select.place="+app.exports.repr(rent.rentCard.place)+' '+app.exports.repr(ui.item))
					rent.rentCard.place = ui.item || {};
					//  focus on NEXT - устанавливать на всех auto complete?
					//$("#flt-from-dp").next().trigger( 'click' );

					//rent.weather_informer.fire( app.exports.place );//  not rent really | не нужно - так как погода не должна изменяться из-за города в карточке
				}
			}) ).on( 'keyup', clearPlace );
		},
		/**
		 * Подставляет адрес в заголовок диалога
		 *
		 * @param {boolean} is_init -предустанавливает обработчик
		 */
		change_address: function (is_init) {
			var address = $(" input[ name=address ]", rent.rentCard.$node ),
				handler = function (e) {
					$("#realty")
						.dialog( "option", "title", $(this).val() );
				};

			if ( is_init === true ) {
				address.on( 'change', handler );
			} else {
				handler.call( address );
			}
		},
		refreshArmoring: function (data) {
			app.event.run( "armoring-refresh", data );
		}
	};

	if(app.plugin.realtyList) $.extend( app.plugin.realtyList, realtyListMethods ) //.call( $("#plugin-realtyList") );
	else app.plugin.realtyList = realtyListMethods


	//
	//  protocol deprecated
	//
	/*$(function () {
		var $prot = $( "#plugin-protocol" );

		if ( $prot.length && cookies().sess ) {
			var tabs = app.exports.realty.tabs,
				index = tabs.use_tab_list( $prot.children( '*' ), "protocol" ),
				$content_node = $( "#realty-list-"+ index );

			tabs.current_callbacks[ index -1 ] = function () {
				$content_node.list( 'update', {} );
			};

			$content_node.listCreate({
				url: "/api/protocol/load",
				my: 2,
				elem: $("#protocol-list-elem"),
				param: {
					order: "id desc"
				}//,paste: $.noop
			});

			tabs.bindAuthTab( index );
		}

	});*/

}());