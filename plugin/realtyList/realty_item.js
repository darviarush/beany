/**
 * CARD
 */
import plugin/realtyList/realty_main.js
import plugin/realtyList/realty_item_card_offer.js
import plugin/realtyList/equipment.js
import plugin/realtyList/realty_utils.js
import plugin/realtyList/item_methods.js
import plugin/map/map.js

(function () {
	console.log( '@CARD_RENT' );

	var rent = app.exports.realty;

	// переносим дополнительные параметры в дополнительную вкладку
	$("#realty-dopfield").children().appendTo( $("#realty-tab-dopfield") )
	
	var $realty = $( "#realty" );
	
	$realty.overlay({
		open: function(name, av, kw) {
			console.log("open realty="+av[0])
		},
		close: function() {
			if(rent.list) rent.list.getCurrentPanel().list('enable');
			$("#clone-service-notice").remove();
			//  для автодополнения адреса из карты гугла - иногда сам не закрывается
			$(".pac-container").hide();
		}
	});
	
	rent.ListItemOwl = function () {
		var owlParams = {
				open: function (name, av, kw) {
					var self = this,
						id = av[0];

					console.log("loadListItem="+app.exports.repr(arguments))
					
					rent.steal.loadListItem( id, rent.getCurrency(), function (data, item_id) {

						//  use closure value
						//self.tabs( 'select', tab );
						//  hardcore implementation
						//self.find( 'ul > li:eq('+ tab +') a' )
							//.trigger( 'click' );

						//  инициализируем карточку
						renderRealtyItem( data );
					});
					//  поэтому пока не открываем
					return false;
				},
				close: function () {
					getClosed();
					//app.overlay.removeOwl( '/realty' );
				}
			};

		function getClosed() {
			if(rent.list) rent.list.getCurrentPanel().list('enable');
			$("#clone-service-notice").remove();
			//  для автодополнения адреса из карты гугла - иногда сам не закрывается
			$(".pac-container").hide();
		}


		$realty.overlay( owlParams );

		//  переходим по карточкам
		var nextCardCallback = function (idx) {
				var minorList = rent.rentCard.$node
						.get(0).options.minor[ idx ](),
					top = minorList.offset().top;

				$( document ).scrollTop( top );

				$realty.parent()
					.css( "top", top );

				getClosed();
				return minorList.attr("list_id");
			},
			nextCardHandler = function (e) {
				var idx = this.id.replace( /^.+-/, '' );

				app.overlay.addOwl( '/realty', nextCardCallback( idx ), true );

				e.preventDefault();
			};

		// на предыдущую\следующую карточку
		$("#realty-prev").on('click', nextCardHandler );
		$("#realty-next").on('click', nextCardHandler );

		console.log( 'realtyList run' );
	};




	//
	// обновление|отрисовка карточки недвижимости
	//
	// @param {json} data
	//
	var renderRealtyItem = rent.render = function (data) {
	
		rent.steal.base.parseRealtyLoadItem(data)
	
		//  вкладки вверху на карточке
		var itemTabs = {
			//  @protected
			$list: $realty.find( '#realty-card-tabs' ),
			getIndexByName: function (name) {
				return this.$list.children( 'li' )
					.index( $( "a[ href=#"+ name +" ]" ).parent() );
			},
			getByIndex: function (idx) {
				return this.$list.children( 'li' )
					.eq( idx );
			},
			getBeforeSelected: function (actual, value) {
				var $nodes = this.$list.children( 'li' ),
					is_visible;

				$.each( $nodes, function (index) {
					is_visible = $( this ).css('display') !== 'none';

					if ( is_visible && index != value) {
						if (index < actual && index < value) {
							actual = index;
						}
					}
				});

				return actual;
			},
			$tabs_holder: $realty,
			//  скрывает указанную вкладку
			hide: function (name) {
				var idx = this.getIndexByName( name ),
					has_index = (idx !== -1),
					selected = has_index ? this.$tabs_holder.tabs( 'option', 'selected' ) : '';

				if ( has_index ) {
					this.$tabs_holder.tabs( 'option', 'selected' );

					//  useless todo
					if ( selected == idx ) {
						selected = this.getBeforeSelected( selected, idx );

						console.log( 'useless@itemTab '+ selected );
						this.$tabs_holder.tabs( "select", selected );
					}

					this.getByIndex( idx )
						.hide();
				}
			},
			//  показывает указанную вкладку
			show: function (name) {
				var idx = this.getIndexByName( name )
				if ( idx !== -1) this.getByIndex( idx ).show()
			}
		};


		var like = {
			createItem: function (data) {
				var $likes = $( '.like' ),
					like = $likes.filter( ':first' ),
					elem  = $( '#realty-like' );

				console.log( 'data.like', data );

				like.empty();

				$.each( app.util.rowsToArrayOpt( data ), function (i, v) {
					console.log("realty_item.js:paste vs createItem i="+i+" v="+v)
					v.img_path = app.helper.img_preview2( v.img_path );

					newElem = elem.clone( true )
						.removeAttr( 'id' )//.attr( "like_id", v.id )
						.form( 'data', v )
						.on( 'click', function () {
							app.overlay.addOwl( '/realty', v.id, true );
						});

					rent.bindHover( newElem );
					newElem.appendTo( like );
				});

				$likes.not(":first").each( function () {
					var $ctx = $( this );

					$ctx.empty();

					like.children('*').clone( true ).appendTo( $ctx );
				});
			}
		};

		//  управляет видимостью элементов формы и валютой
		var cardView = {
			$holder: rent.rentCard.$node,
			classes: {
				auth: 'app-form-auth',
				valid: 'app-valid-img'
			},
			visibilityToggle: function ($ctx) {
				$ctx.find( ".on, .off" )
					.toggleClass( "on" ).toggleClass( "off" );

				$ctx.toggleClass( "app-form-auth" );
			},
			switchVisible: function (is_owned) {
				var $ctx = this.$holder,
					has_auth = $ctx.hasClass( this.classes.auth );

				if ( !is_owned && has_auth || is_owned && !has_auth ) {
					this.visibilityToggle( $ctx );
				}
			},
			switchValid: function (is_owned) {
				var $ctx = this.$holder.find( '.'+ this.classes.valid );

				if ( is_owned ) {
					$ctx.removeClass( "off" ).addClass( "on" );
				} else {
					$ctx.removeClass( "on" ).addClass( "off" );
				}
			},
			viewOwn: function (is_owned) {
				this.switchVisible( is_owned );
				this.switchValid( is_owned );
			},
			render: function (data) {
				var idx = data.id;

				this.minor = rent.list? rent.list.getCurrentPanel().listGetItemById( idx ): $();

				this.$holder.form("reset")
					.form({
						minor: this.minor,
						overlay: $realty
					})
					.form("data", data );

				$("[ name=realty-servise-dialog ]").attr("href", "#realty-servise-dialog=" + idx );

				$("#realty-latitude, #realty-longitude").hide();

				app.plugin.realtyList.create_city( $("input[ name=city ]"), "/api/realtyList/place", false );

				this.navigateButtons();
			},
			//  то, что называется переключение квартиры
			navigateButtons: function () {
				var minorList = this.minor;

				$("#realty-prev").button('option', 'disabled', !minorList.prev().attr("list_id"));
				$("#realty-next").button('option', 'disabled', !minorList.next().attr("list_id"));
			},
			currency: {
				//  @private
				//  функция перевода из одной валюты в другую
				getInCurrency: function (idx, to_cur, value) {
					var from = app.data.CURRENCY[ idx ].value;
					return Math.round( value * from / app.data.CURRENCY[ to_cur ].value );
				},
				//
				getExchanged: function (realty, data, event, elems) {
					//  валюта в карточке
					var self = this;

					realty.find("[ name="+ event +" ]").change( function () {
						var idx = realty.find("[ name=currency_id ]").val(), // перенесена из выше
							price,
							exchange,
							i, len, item;

						if (!elems.length) {
							elems.push( event );
						}

						for (i = 0, len = elems.length; i < len; i += 1 ) {
							item = elems[ i ];

							price = realty.find("[ name="+ item +" ]").val();
							exchange = self.getInCurrency( idx, app.currency.id()-1, price );

							realty.find("span[ name="+ item +"_cur ]").text( exchange );
						}
					});
				},
				//  @public
				//
				//  устанавливает курсы валют по умолчанию
				//
				updateDefault: function (real, data) {
					this.getExchanged( real, data, "currency_id", ["cena","cena_month"] );
					this.getExchanged( real, data, "cena",[] );
					this.getExchanged( real, data, "cena_month",[] );
				}
			}
		};

		//  todo use common object?
		var equipment = {
			$input: $( "input[ name=equipment ]", cardView.$holder ),
			$holder: $( "#realty-equipment" ),
			query: ".app-equipment"
		};

		cardView.render( data );

		app.event.run( "event-addImg", data.imgs );
		app.event.run( "armoring", data );
		app.event.run( "comment", data.comment_count );
		app.event.run( "show_foto", {
			imgs: data.imgs, id: data.id, user_id: data.user_id
		});

		//Похожие варнианты квартир like
		like.createItem( data.like );

		//  квартира принадлежит пользователю
		if ( app.auth.user( data.user_id ) ) {

			app.event.run( "my-notice", data.notice );
			$("#realty-payment-all").hide();

			//  устанавливает курсы валют по умолчанию
			cardView.currency.updateDefault( cardView.$holder, data );

			if ( data.count_application ) {
				if ( $realty.tabs( 'option', 'selected') == 3 ) {
					app.event.run( "send-application", data.id );
				}
				itemTabs.show("realty-tab-inform");
			} else {
				itemTabs.hide("realty-tab-inform");
			}

			itemTabs.show("tab-comment");
			itemTabs.show("tab-notice");
			itemTabs.hide("tab-selservice");
			itemTabs.show("tab-fotogallery");

			cardView.viewOwn( true );

			rent.shorts.createEquipmentWidget( equipment.$holder, equipment.$input.val(), function (value) {
				var $node = cardView.minor.find( equipment.query );
				rent.shorts.equipmentWidget( $node, value );
				
				equipment.$input.val(value).change()
			});

		} else {
			cardView.viewOwn( false );


			rent.shorts.equipmentWidget( equipment.$holder, equipment.$input.val() );

			if ( app.auth.check() ) {
				itemTabs.show("tab-comment");
				itemTabs.show("tab-selservice");

				app.event.run("notice-service", {
					armoring: data.date_armoring,
					notice: data.notice
				});
				//    why run for the second time?
				app.event.run("comment", data.comment_count );
			} else {
				itemTabs.hide("tab-comment");
				itemTabs.hide("tab-selservice");
			}

			itemTabs.hide("tab-notice");
			itemTabs.hide("realty-tab-inform");

			if (data.imgs.length){
				itemTabs.show("tab-fotogallery");
			} else {
				itemTabs.hide("tab-fotogallery");
			}

			app.event.run("show_foto", {imgs: data.imgs, id: data.id, user_id: data.user_id});
		}

		if(rent.list) rent.list.getCurrentPanel().list("disable");

		$realty.tabs({
			select: function (event, ui) {
				if ( ui.index == 3 ) {
					app.event.run( "send-application", data.id );
				}
			}
		});

		$realty.prop( "init", data )
			.change()
			.overlayDialog( "open" );

		app.event.run( "create_maps" );
	};

}());
