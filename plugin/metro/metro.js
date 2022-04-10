/**
 * metro - плагин для отображения схем метро
 *
 * После подключения плагина:

 Для администратора..
     -Если id не указан - создаётся новая станция метро в текущем городе.
     -Сделать удаление имени станции и станции с именами на всех языках.
     -Сделать редактирование имени станции.
 onDragEnabled:
     -Мышкой можно перетаскивать станцию по схеме.
        При этом запоминаются координаты станции (x, y) в базе.

 Дополнительно:
    -Схемы станции находятся в каталоге www/metro.
    -Название схемы: {id_города}.png
 *
**/
var metros = {
	$map: {
		link_buttons: $( ".metro-map-show" ),
		edit_button: $( ".metro-map-edit" ),
		//  div#metro-map-ovl
		//      img#metro-map
		image: $( '#metro-map' ),
		//  listen
		subscribed: null
	},
	updateMapLinkButtons: function ( city_id ) {
		var $nodes = this.$map.link_buttons,
			clss = this.classes.service_link;

		this.rights.city = city_id;

		if (!!city_id ) {
			$nodes.addClass( clss.active )
				.removeClass( clss.disabled );
		} else {
			$nodes.addClass( clss.disabled )
				.removeClass( clss.active );
		}
	},
	updateMapSubscribed: function ( $node ) {
		var self = this;

		setTimeout( function () {
			self.$map.subscribed = $( $node, self.$map.image )
				.trigger( 'click' );
		}, 500 );
	},
	//
	//  todo load city/do not save position at all..
	//
	//  @param {boolean} hasnt_initiated - suppress click event
	//
	updateMap: function (suppress_init) {
		var $node,
		//  use of globals
			id = place && place.hasOwnProperty('city_id') ? place.city_id : '';

		this.updateMapLinkButtons( id );
		//this.$map.image.attr('src', this.host_url +'/metro/'+ has_metro.city + ext );
		if ( id ) {
			$node = $( 'span.title' )[ id == 27505 ? 1 : 0 ];

			console.log( 'MAP update suppress init '+ suppress_init );
			if ( !suppress_init ) {
				this.updateMapSubscribed( $node );
			}
		}
	},
	classes: {
		service_link: {//  aka $map.link_buttons
			active: 'metro-map-active',
			disabled: 'metro-map-disabled'
		}
	},
	editTools: function () {
		var is_edit = this.rights.admin && this.rights.edit;

		if (is_edit) {
			this.$map.edit_button.show();
		}

		$( '.metro-data-edit' )[ is_edit ? 'show' : 'hide' ]();
	},
	//  @param {object} has_metro - предыдущее значение( вызова ) OPTIONAL
	//
	init: function (has_metro) {
        var $map = this.$map,
            clss = this.classes.service_link,
            self = this,
            city = this.getCity( has_metro );

        if ( city ) {
            this.editTools();

            $map.link_buttons
                .addClass( clss.active )
                .on( 'click', function () {
                    self.applyHash( $(this) );
                } );
        } else {
            //  Если в городе нет метро, то она должна быть заблокирована.
            $map.link_buttons
                .addClass( clss.disabled );
        }
    },
	applyHash: function ($ctx) {
		var dom_classes = $ctx.attr( 'class' ),
			class_token = 'metro-map-edit';

		if ( this.rights.city ) {
			this.rights.edit = dom_classes.indexOf( class_token ) != -1;

			this.editTools();

			app.overlay.addOwl( '/metro-map-ovl', '' );//    todo add city token
		}
	},
	rights: {
		admin: null,
		edit: false,
		city: '',
		//  todo qualify test
		test: function () {
			var state = $('a.app-s a.app-a').text(),
				token = 'Таблицы';

			return state.indexOf( token ) !== -1;
		},
		testReady: function () {
			return $('a.app-s a.app-a').length;
		}
	},
	waiter_step: 250,
	waiter: function (has_metro) {
		console.log( 'wait' );
		if ( has_metro ) {
			//this.rights.city = has_metro.city;
			var city = this.getCity( has_metro );
		}

		if ( this.rights.testReady() ) {
			this.rights.admin = this.rights.test();

			this.init();
		} else {
			//console.log( 'waiter' );

			setTimeout( $.proxy( this.waiter, this ), this.waiter_step );
		}
	},
	//
	//  @param {object} has_metro - OPTIONAL
	//
	getCity: function (has_metro) {
		var city = this.rights.city;

		if (!city && has_metro && has_metro.hasOwnProperty( 'city' ) ) {
			city = has_metro.city;

			this.rights.city = city;
		}

		return city;
	},
	//
	//  @param {boolean}    is_auth - авторизованность пользователя
	//
	getCityRights: function (is_auth) {
		var cook_city = 50748;

		if (place.is_metro == 1) {
			cook_city = place.city_id;
		} else {
			cook_city = '';
		}

		return {
			city: cook_city,
			rights: is_auth && this.rights.test()
		};
	},
    //
    host_url: '',
    getParams: function () {
        var host = location.protocol +'//'+ location.host;

        this.host_url = host;
        return {
            url: host,
            stamp: new Date().getSeconds()
        }
    },
	//
	//
	callbacks: {
		on: [],
		off: []
	},
	runCallbacks: function (is_on) {
		var token = is_on ? 'on' : 'off',
			list = this.callbacks[ token ],
			len = list.length;

		for (; len-- ;) {
			list[ len ]();

			console.log( 'clbk '+ token +' run '+ len );
		}
	}
};

app.exports.metro = {
	autocompleteUpdate: function () {
		console.log('metro city autocmpl');
		//metros.updateMap( true );
	}
};



/** Основной сценарий
 *
 *  -Должна появится __кнопка__ "метро" сразу над фильтрами.
 *
 *      [Add Filters-masthead]
 *      -Если в городе нет метро, то она должна быть заблокирована.
 *
 __Кнопка__ метро для текущего города:
    -будет открывать окно со схемой метро

 Для администратора на( под ) __кнопке( ой )__ "метро" сделать __кнопку__ "редактировать".
    -будет открывать окно со схемой метро
 *
 */
(function () {
	//
	//  по has_auth приходится ждать отрисовки Кассы -no good / trace app.events
	//
	app.exports.realtyMetroStart = function () {
		var has_auth = $( '#auth_options' ).css( 'display' ) != 'none',
			has_metro = metros.getCityRights( has_auth ),
			host = metros.getParams();

		//  Должна появится кнопка "метро" сразу над фильтрами - todo нужен город
		if ( has_metro ) {
			app.exports.realtyMetroAttach( metros.$map.link_buttons );
		}

		if (!has_auth ) {
			metros.init( has_metro );
		} else {
			metros.waiter( has_metro );

			if (has_metro) {
				metros.$map.edit_button.show();
			}
		}

		dependsScriptLoader( $.extend( host, {
			plugin_folder: '/js/metro/',
			plugin_depends: 'mbImgNavigator/'
		}) );
	};


	/**
	 * @param {object} host - параметры для подгружаемых скриптов
	 */
	function dependsScriptLoader (host) {
		var url = host.url + host.plugin_folder,
			dep = url + host.plugin_depends,
			stamp = 'time='+ host.stamp,
			exposed_metro = app.exports.metro;

		exposed_metro.getScript = {
			url: url,
			stamp: stamp
		};
		//  load scripts todo minified@import
		//
		$.getScript( dep +'jquery.metadata.js', function () {
			$.getScript( dep +'mbImgNav.min.js', function () {
				//
				//  lift up or move settings?
				//
				exposed_metro.map_block_params = {//draggerStyle:"2px dotted red",
					areaWidth: 600,
					areaHeight:450,
					navOpacity: .9,
					loaderUrl: exposed_metro.getScript.url +"res/loading.gif"
				};

				$.getScript( url +'map.js?'+ stamp, function () {
					//  $(this) === $("#metro-map-ovl")
	                var plugin_params = {
		                overlayParams: {
			                //store current hash
			                open: function () {
				                metros.updateMap();//bad?

				                metros.runCallbacks( true );
			                },
			                //return hash back
			                close: function () {
				                metros.runCallbacks( false );

				                app.overlay.removeOwl( '/metro-map-ovl' );
			                }
		                }
	                };

					exposed_metro.MapLoader( exposed_metro.map_block_params );

					//  стандартная инициалзация интерфейсной части
					$( "#plugin-metro" )
						.appendTo( "body" )
						.pluginInit( plugin_params );
				});
			});
		});
	}

}());