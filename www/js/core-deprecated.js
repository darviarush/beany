/*********************************** Оверлеи **************************************/
//
// создаёт и управляет оверлеями app.overlay
//
(function () {
	//
	//  @param {string} action_name
	//
	$.fn.overlayDialog = repeat( function (action_name) {
		if ( action_name == "open" && this.selector == "#settings_window" ) {
			//return this.resizable("widget");
		} else {
			return this.dialog( action_name );
		}
	} );


	var ovlContext = {
		appendRealtyReference: function (name, holders) {
			$.post("/api/realtyList/ref", {
					path: name
				},
				function (data) {
					var $ovl = $( "<div></div>" )
						.attr( "id", name );

					data = $.parseJSON( data );

					$ovl = $ovl.appendTo( $( "body" ) );
					holders[ name ] = $ovl;

					$ovl.overlayDialog( "open" )
						.ref( data );
				}
			);
		},
		//  кэшируем узлы регистрируемых оверлеев
		holders: {},
		/**
		 * for node caching
		 *
		 * @param {string} name
		 * @return {node}
		 */
		getCached: function (name, holders) {
			var $node;

			if ( holders.hasOwnProperty( name  )) {
				$node = holders[ name ];
			} else {
				$node = $( "#"+ name );
				holders[ name ] = $node;
			}

			return $node;
		},
		applyHashItem: function (item, ovl) {
			var name = item.name,
				$ctx;

			if ( name ) {
				// если оверлей зарегистрирован и ещё не выполнился
				if ( ovl && ovl.hasOwnProperty( name ) ) {
					$ctx = ovlContext.getCached( name, this.holders );
					// вызываем инициализатор оверлея
					ovl[ name ].apply( $ctx, item.args );
				} else {
					//  todo filter for legal names?
					ovlContext.appendRealtyReference( name, this.holders );
				}
			}
		}
	};


	var ovlManager = {
		//  история открытых оверлеев
		visible_owls: [],
		isVisibleOwl: function (name) {
			return $.inArray( name, this.visible_owls ) != -1;
		},
		//  скрываем оставшиеся активными диалоги
		offOwls: function () {
			var holder = this.visible_owls;
			$.each( holder, function (idx, val) {
				if ( val ) {
					//  todo use ovlContext.node
					$( val.replace( '/', '#' ) ).dialog( 'close' );

					holder[ idx ] = '';
				}
			});
		},
		/**
		 * simple
		 *
		 * @param name {string} -registered overlay name
		 * @param param {string} -single param
		 * @param has_tab_modifier {boolean} -add hash tabs
		 */
		addOwl: function (name, param, has_tab_modifier, use_hash) {
			var owl = name +'='+ param,
				hash = use_hash ? use_hash : location.hash,// use of state object last
				idx = hash.indexOf( name );

			if ( has_tab_modifier ) {
				owl += '=0';//  for the first to open
			}

			if ( idx == -1 ) {
				hash += owl;
			} else {
				hash = hash.substring( 0, idx ) + owl;

			}
			location.hash = hash;

			//  after effect
			if (!this.isVisibleOwl( name ) ) {
				this.visible_owls.push( name );
			}
		},
		//
		removeOwl: function (name) {
			var holder = this.visible_owls,
				hash = location.hash,
				idx = hash.indexOf( name ),
				is_visible = $.inArray( name, holder );

			if ( is_visible != -1 ) {
				holder[ is_visible ] = '';//	todo use slice =)
			}

			//  currently use only one level depth
			if ( idx != -1 ) {
				this.setIgnoreOnce( hash.substring( 0, idx ) )
			}
		}
	};



	var hashUtils = {
		//  очищает location.hash
		//  context global
		//
		clear: function () {
			if ( history.pushState ) {
				history.pushState( '', document.title, window.location.pathname );
			} else {
				location.hash = '#index';// needed@app.overlay.ovl.index
			}
		},
		filterHash: function (hash) {
			if ( hash[1] == "!" ) {
				hash = hash.slice( 2 );// удаляем #!
			} else {
				hash = hash.slice( 1 );// удаляем #
			}
			return hash;
		},
		//  возвращаем массив функций с аргументами {функция:[arg1, arg2...]...}
		splitItems: function (hash_stack) {
			var arr = [],
				i, len = hash_stack.length,
				fn, name;

			for (i = 0; i < len; i += 1) {
				fn = hash_stack[ i ].split( "=" );
				name = fn[0];
				// аргументы
				fn.splice( 0, 1 );
				arr.push( {
					name:name, args:fn
				} );
			}
			return arr;
		}
	};


	app.exports.hashclear = function () {
		hashUtils.clear();
	};


	var hashStack = $.extend( hashUtils, {
		splitStack: function (levels) {
			var arr = [],
				self = this,
				current_seq;

			$.each( levels, function (i, v) {
				current_seq = self.splitItems( v.split( '!' ) );

				arr.push( {
					is_complex: current_seq.length > 1,
					level: i,
					seq: current_seq
				} );
			} );
			return arr;
		},
		serializeSplitItem: function (item) {
			var hash_item = item.name;

			$.each( item.args, function (i, v) {
				hash_item += ('=' + v);
			} );

			return hash_item;
		},
		update: function (levels) {
			var last_seq = levels[ levels.length - 1 ].seq,
				len = last_seq.length - 1,
				i = 0,
				upd_hash = '#';

			for (; i <= len; i += 1) {
				upd_hash += this.serializeSplitItem( last_seq[ i ] );

				if ( len > 0 && i < len ) {
					upd_hash += '!';
				}
			}
			app.overlay.setIgnoreOnce( upd_hash );
		},
		//  хеши в виде:
		//	  #функция1[=значение1][=значение2][ /функция2[=значение1][=значение2] ]...
		getSplit: function (hash) {
			if ( !hash ) {
				hash = location.hash;
			}
			hash = this.filterHash( hash );

			if ( hash == '' ) {
				return false;
			}
			// получаем функции
			return this.splitStack( hash.split( "/" ) );
		}
	});


	//  for tests
	app.exports.owlsGet = $.proxy( hashStack.getSplit, hashStack );
	//  upd args and serialize back
	app.exports.owlsUpdate = $.proxy( hashStack.update, hashStack );



	var hashTabHelper = {
		token: '!tab=',
		current_list: '',
		current_real: '',
		//
		//  very custom
		//	  for !tab=0, 1, etc. any single char
		//
		update: function (hash, index) {
			var pos = hash.indexOf( this.token ),
				name = this.token + index,
				current = hash.indexOf( name );

			if ( pos == -1 ) {
				hash += name;
			} else if ( pos != current ) {// tabs differ
				// not found
				if ( current == -1 ) {
					// change @pos
					current = hash.substring( 0, pos ) + name;
					hash = current + hash.substring( pos + name.length );
				} else {
					// possible real bug
				}
			}
			return hash;
		},
		//  todo: clear or use it
		remove: function (hash, idx) {
			var pos = hash.indexOf( this.token );

			return hash;
		}
	};
	app.exports.hashTabs = hashTabHelper;



	var ovlBase = $.extend( ovlManager, {
		updateRealtyListTab: function (hash) {
			var realty = app.exports.realty,
				tabs = realty ? realty.tabs : false;

			if ( tabs && !tabs.before_start ) {
				hash = hashTabHelper.update( hash, tabs.current_idx );
			}
			return hash;
		},
		ignore_change: false,
		setIgnoreOnce: function (hash) {
			this.ignore_change = true;
			
			if ( hash != null ) {
				hash = this.updateRealtyListTab( hash );

				if (location.hash != hash) location.hash = hash;
			}
		},
		start_main: false,
		/**
		 * @public
		 * =======
		 *
		 * обработчик на изменение хеша - устанавливается @app.overlay.start
		 *
		 * @param {string} hash
		 */
		change: function (hash) {
			var ignore = this.ignore_change,
				overlays = ignore ? '' : hashStack.getSplit( hash ),
				len = overlays.length;

			if ( ignore ) {
				this.ignore_change = false;
				return;
			}

			if ( this.start_main ) {
				console.log( 'start_main' );
				this.start_main = false;
				/*this.applyCurrentHash( overlays[ len -1 ].seq );
				return;*/
			}

			if ( overlays && len > 1 ) {
				//  выставляем текущим последний оверлей
				this.applyCurrentHash( overlays[ len -1 ].seq );
			} else {
				//  future workaround len = 1 on init
				this.offOwls();
			}
		},
		applyCurrentHash: function (levels) {
			var ovl = this.ovl,
				i, len = levels.length;

			for (i = 0; i < len; i += 1) {
				ovlContext.applyHashItem( levels[ i ], ovl );
			}
		}
	});




	/**
	 *  класс Overlay - fn.overlay
	 */
	app.overlay = new (app.util.Class( "Overlay", $.extend( ovlBase, {
		has_start_find: false,
		has_start_tab: '',
		has_list_offset: 0,
		use_list_params: {},
		use_callback:$.noop,
		/**
		 *
		 * @param list is list.args array
		 */
		delayListParams: function (list) {
			var registered = app.exports.hashListOverlayFlyweight.list_filter_params,
				holder = this.use_list_params,
				len = list.length, name,
				idx = 2;//  see @.args details

			for (; idx < len ; idx += 2) {
				name = list[ idx ];

				if (idx % 2 === 0 && $.inArray( name, registered ) != -1) {
					holder[ name ] = list[ idx + 1 ];
				}
			}
		},
		applyStartFind: function (callback) {
			if ( app.exports.hash_rest ) {
				$( "#start-find" )
					.trigger( 'click' );
			}

			//  check auth for my tab
			if ( this.has_start_tab == 1 ) {//&& cookies().sess
				$('a[ href=#realty-my ]')
					.trigger( 'click' );
			}

			//  apply other filters params
			callback();

			this.applyDelayedList();

			this.use_callback();
		},
		//  to apply list offset
		applyDelayedList: function () {
			var self = this;

			if ( this.has_list_offset > 9 ) {
				var $list = app.exports.realty.list
					.getCurrentPanel();

				$list.list( 'update', $.extend( self.use_list_params, {//todo check this
					offset: parseInt( self.has_list_offset, 10 )
				}) );
			}
		},
		/**
		 *
		 * @param postpone_callback -notify lazy views
		 */
		applyDelayedStates: function ( postpone_callback ) {
			var self = this,
				hash = location.hash;

			//  todo use check to view params switch, if present
			if ( this.has_start_find ) {
				console.log( '\nundelayed' );
				this.applyStartFind( function () {
					postpone_callback();

					self.applyDelayedList();
				});

			} else {//if ( hash.length ) {
				console.log( '\ndelayed' );

				this.applyStartFind( function () {
				//  #list=0=0{etc}!tab=0
					postpone_callback();

					self.applyDelayedList();
				});
			}
		},
		/**
		 * filters is used @list[ {index} > 1 ]
		 *
		 * @param list_current
		 * @param over_list -overlay
		 */
		setListByTabView: function (list_current, over_list) {
			var seq_apply = list_current.seq,
				list = seq_apply[ 0 ],
				tab;

			//  use list offset
			if ( list.args[ 1 ] ) {
				this.has_list_offset = list.args[ 1 ];
			}

			//  apply start-find
			if ( list_current.is_complex ) {
				this.has_start_find = true;

				tab = seq_apply[ 1 ];
				this.has_start_tab = tab.args[ 0 ];
			} else if ( app.exports.hash_rest ) {
				this.has_start_find = true;

				tab = app.exports.hash_rest;
				tab = tab.substring( tab.indexOf( '!tab=' ) + 5 );
				this.has_start_tab = tab.substring( 0, 1 );
			}

			//  use other lists properties
			this.delayListParams( list.args );

			if ( over_list ) {
				console.log( 'SET '+ over_list );

				this.use_callback = function () {
					var item = hashStack.serializeSplitItem( over_list.seq[ 0 ] ),
						idx = item.indexOf( '=' );

					app.overlay.addOwl( '/'+ item.substring( 0, idx ), item.substring( idx +1 ) );
					console.log( 'WAIT '+ over_list );
				}
			}
		},
		/**
		 * app.overlay.start вызывается стразу после @app_after_plugin
		 *
		 */
		start: function () {
			var hash = hashStack.getSplit(),
				has_items = hash.length > 1,
				current = hash[ hash.length - 1 ];

			//  todo use Backbone.history.start()
			if ( !has_items ) {
				has_items = current && current.hasOwnProperty( 'is_complex' )
					&& current.is_complex;

				if (has_items !== undefined) {
					//console.log( 'hstart = '+ location.hash +'\nresolved with '+ has_items );
					this.setListByTabView( current );
				}
			} else {
				//console.log( 'items detected\n========' );
				this.setListByTabView( hash[ 0 ], current );
			}

			$( document ).on( 'hashChange', $.proxy( this.hashListener, this ) );
		},
		//  todo use Backbone.Router
		//
		hashListener: function (e, hash) {
			app.overlay.change( hash );
		},
		/** simple register
		 *  добавить оверлей - это может быть как оверлей так и функция
		 *
		 * @param {string} name
		 * @param {object|function} ovl
		 */
		add: function (name, ovl) {
			this.ovl[ name ] = ovl;
		},
		//  конструктор
		init: function () {
			//  оверлеи: index для ie, так как в нём хеш не очищается
			this.ovl = {
				index:$.noop
			};
		}/*,
		//  вернуться на предыдущий - deprecated - удалить из истории вызов этого оверлея
		back: function () {
			var len = this.current.length;

			if ( len == 0 ) {
				throw "история оверлеев пуста";
			}
			this.stepBack( len -1 );
		},
		//  удаляем оверлей с которого возвращаемся - deprecated
		stepBack: function (idx) {
			var self_getCurrent = function ( idx ) {}
			this.current.pop();

			if (idx) {
				location.hash = self_getCurrent( idx );
			} else {
				hashUtils.clear();
			}
		}*/
	}//end of extend
	)))();



	//
	//  @param {object/undefined} options
	//
	$.fn.overlay = repeat( function (options) {
		var self = this,
			id = self.attr( "id" ),
			func;

		if ( !options ) {
			options = {};
		}

		if ( typeof options == 'object' ) {
			options = $.extend( {
				modal:true,
				autoOpen:false,
				resizable:false,
				draggable:true,
				width:"auto"
			}, options );

			//  attach CLOSE
			func = options.close;
			options.close = function close_fn(event, ui) {
				if ( close_fn.close ) {
					close_fn.close.call( this, event, ui )
				}
				//app.overlay.back();
			};
			options.close.close = func;

			//  attach OPEN
			func = options.open;
			delete options.open;
			// регистрируем в оверлее
			(function (that, name, open_func) {
				app.overlay.add( name, function () {
					if ( open_func ) {
						if ( open_func.apply( this, arguments ) !== false ) {
							that.overlayDialog( "open" );
						}
					} else {
						that.overlayDialog( "open" );
					}
				});
			}(self, id, func));
		}

		return this.dialog( options );
	} );

}());
