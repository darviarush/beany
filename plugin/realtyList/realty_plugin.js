/**
 * realtyList - плагин для отображения списка арендуемой недвижимости
 *
 * main
 * 
 **/
 
import plugin/realtyList/list/list-options.js
 
(function () {
	var rent = app.exports.realty,
		filters = rent.filters;

	rent.features.selectAbode.callbackOnChange = function (form_id_value) {
		filters.updateList({
			form_id: form_id_value
		});
	};

	rent.fltChanger.registerCallback( function (params) {
		if ( $("#start-main").css("display") != "none" ) return;
		filters.updateList( params );
	} );

	var panelTabs = {
		/*$nodes: null,
		hide: function () {
			this.$nodes.hide();
		},*/
		//  @public
		$holder: $( '#panel' ),
		getName: function ( index ) {
			return 'panel-panel-'+ index;
		},
		//  делает неактивным таб с указанным индексом
		disableAuthTab: function (idx) {
			var name = this.getName( idx ),
				panel = this.$holder;

			app.event.add( 'login', name, function () {
				panel.tabs( 'enable', idx);
			});
			app.event.add( 'logout', name, function () {
				panel.tabs( 'select', 0 )
					.tabs( 'disable', idx );
			});
		},
		// скрывает таб с указанным индексом
		bindAuthTab: function (idx) {
			var name = this.getName( idx ),
				panel = this.$holder,
				query_child = "ul:first > li:eq("+ idx +")";

			app.event.add( 'login', name, function () {
				panel
					.find( query_child ).show();
			});
			app.event.add( 'logout', name, function () {
				panel
					.find( query_child ).hide();

				/*/  todo with hides all tabs off bug
				 panel
				 .tabs("refresh")
				 .tabs("select", 0 );*/
			});
		},
		/*show: function () {
			if ($("#start-main").is(":hidden")) {
				this.$nodes.show();
			}
		},*/
		init: function () {
			this.createTabs();

			//this.$nodes = this.$holder.children('.ui-tabs-nav');

			//  my realty on auth
			if (!cookies().sess ) this.$holder.tabs('select', 0).tabs('disable', 1);

			this.disableAuthTab( 1 );

			//  скрываем на стартовой
			//this.hide();

			//app.event.add( "login", "login-rl-tabs", $.proxy( this.show, this ) );
			//app.event.add( "logout", "logout-rl-tabs", $.proxy( this.hide, this ) );
		}
	};


	rent.tabs = $.extend( panelTabs, {
		//
		//  создаёт вкладку и инициализирует список в новой вкладке
		//
		use_tab_list: function ($content, name) {
			var idx = this.use_tab_index( name );

			$content.appendTo( "#realty-"+ name );

			this.$holder
				.find( "ul:first > li:eq("+ (idx-1) +")")
				.css( 'display', 'block' );

			return idx;
		},
		use_tab_index: function (name) {
			if (name === 'protocol') {
				return 3;
			} else {
				return (name === 'elect') ? 4 : 5;
			}
		},
		//
		//  табы отрабатывают собственные параметры
		//
		$holder: $( '#panel' ),
		current_idx: 0,
		getCurrentIdx: function () {
			return this.current_idx;
		},
		current_names: [
			'realty-all', 'realty-my', 'realty-protocol', 'realty-elect', 'realty-inform'
		],
		logCurrentIdx: function (use_idx) {
			var before = this.before_start,
				log_msg;

			if ( before === false ) {
				log_msg = 'use tab';
			} else if ( before === null ) {
				log_msg = '[[ tab ]]';
			} else if ( before === true ) {
				log_msg = 'tab before';
			}

			if ( log_msg ) {
				console.log( log_msg +' '+ this.current_names[ use_idx ] );
			}
		},
		current_callbacks: [
			//'realty-all',&'realty-my',
			function () {
				filters.updateList();
			},
			function () {
				filters.updateList();
			},
			//'tab-protocol',
			$.noop,
			//'realty-elect',
			$.noop,
			//'tab-inform',
			$.noop
		],
		//  notifiers
		//
		setCurrentIdx: function (use_idx) {
			this.logCurrentIdx( use_idx );

			this.current_idx = use_idx;
		},
		before_start: true,
		startOnce: function () {
			if ( this.before_start ) {
				this.before_start = false;

				this.setCurrentIdx( this.current_idx );
			}
		},
		//  табы и параметры из листов
		//
		changeIndexedListParam: function ($lists) {
			var param = $lists.current.prop("list_opt").param,
				my = param.my;

			delete param.my;
			$lists.indexed.listCreate({
				param: param
			});
			param.my = my;

			return param;
		},
		createTabs: function () {
			var applyMyParam = $.proxy( this.changeIndexedListParam, this ),
				getIdx = $.proxy( this.getCurrentIdx, this ),
				self = this;

			this.$holder.tabs({
				show: function (event, ui) {
					var $filters_date = $( "#flt-date" ),
						idx = ui.index,
						$lists = rent.list.getPanels( idx ),
						options,//  useless
						is_realty_index = idx < 2,//  notProtocolTab et al.
						is_current_left = getIdx() < 2;

					$lists.current.list("disable");

					if ($lists.indexed)	$lists.indexed.list("disable");

					if ( is_realty_index ) {

						if ( is_current_left && getIdx() != idx ) options = applyMyParam( $lists );

						options = 'show';

						$( ui.tab.href.replace(/^[^#]*/, '') ).prepend( $("#realty-order") );

					} else {
						options = 'hide';

						$lists.indexed.list("enable");
					}

					$filters_date[ options ]();
					if ( rent.filters && rent.filters.orders.$filter) {
						rent.filters.orders.$filter[ options ]();
					}

					//  changeApply
					self.setCurrentIdx( idx );
					self.current_callbacks[ idx ]();
				}
			});
		}
	});

	//  wrong - meaning of package name
	rent.list = {
		getCurrentPanel: function () {
			var idx = rent.tabs.getCurrentIdx();

			return $( "#realty-list-"+ idx );
		},
		getPanels: function (tab_idx) {
			var idx = rent.tabs.getCurrentIdx();

			return {
				current: $( "#realty-list-"+ idx ),
				indexed: (tab_idx == null || tab_idx == idx) ? null : $( "#realty-list-"+ tab_idx )
			}
		}
	};



	//  todo conflict twice create!
	//
	delete rent.main_list_options.param.F;
	$("#realty-list-0").listCreate( rent.main_list_options );
	$("#realty-list-1").listCreate( $.extend( rent.main_list_options, { param: { my: 1 } }) );

	var realtyListExtendParams = function (main_list_options_param) {
		var find_list_options = {
			//  add actual params
			param: {
				limit: 10,
				city_id: place.city_id,
				region_id: place.region_id,
				country_id: place.country_id
			},
			//  new element proto
			elem: $('#realty-elem-2'),
			//  добавляем данные
			paste: function (row) {
				console.log("realty_plugin.js:paste="+row.id)
				row.href_id = "#realty="+ row.id;

				if (row.metro == null) {
					row.metro = "Не указано";
				}
				row.img_path = app.helper.img_preview( row.img_id );
			},
			pasted: function (div, row, idx) {
				var elem = div.find(".app-equipment");

				div.addClass( idx % 2 ? "app-list-even" : "app-list-odd");

				if ( rent.shorts ) {
					rent.shorts.equipmentWidget( elem, row.equipment );
				}
			}
		};


		//rent.tabs.startOnce();

		$( "#realty-list-1" ).listCreate( $.extend( main_list_options_param, { param: {	my: 1 } }) );

		rent.list.getCurrentPanel()
			.list("clean");

		setTimeout( function () {
			filters.updateList();
		}, 100 );


		$( "#realty-list-0" ).listCreate( find_list_options );
		//  with the same my as initiated - doubles
		$( "#realty-list-1" ).listCreate( find_list_options );
	};


	/***** Инициализация плагина *****/


	var startFindCallback = function () {
		console.log( "start =====\n" );

		realtyListExtendParams( rent.main_list_options );
		/* IE freezes bug

		 $location.node.autocomplete("option", "select", function (event, ui) {
		 place = ui.item;

		 var i2 = place.city || place.region,
		 url = app.conf.theme+"city-bckgr/"+(place.country ? place.country + "/"+ (i2 || "all"): "all")+".jpg"

		 $("#hbl").css("background", "url("+ url +") no-repeat left top");

		 rent.list.getCurrentPanel().listCreate({
		 param: {
		 city_id: place.city_id,
		 region_id: place.region_id,
		 country_id: place.country_id
		 }
		 })
		 .list("refresh");
		 }).val( place.city || place.region || place.country );*/
		rent.fltChanger.on_list();

		//  move
		$("#hbl").append( $location.node, $("#flt-date") );

		$( "#currency, #language-down" ).appendTo("#ht");

		filters.holder.show();

		rent.applyStartInformers();

		$("#start-main").hide();
		rent.tabs.show();

		$("#realty-order").show();

		app.event.run("start-hide-end");
	};


	app.plugin.realtyList = {}
	/*app.plugin.realtyList = function () {
		//  добавляем тело плагина в main
		this.appendTo( "#main" ).pluginInit();

		//  добавляем фильтр в правый блок заголовка
		$( "#realty-filter" ).appendTo( "#hbr" );


		//  separate sources for lists and tabs
		rent.tabs.init();

		filters.init();

		app.plugin.realtyList
			.change_address( true );

		$( "#start-find" ).on( 'click', startFindCallback );

		rent.ListItemOwl();
	};*/
}());